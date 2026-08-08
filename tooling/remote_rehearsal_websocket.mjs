import { randomBytes } from "node:crypto";
import net from "node:net";
import tls from "node:tls";

export function openWebSocket(baseUrl, {
  origin = null,
  cookie = null,
  authorization = null,
  subprotocols = ["guiltyparty.control.v1"],
} = {}) {
  const secure = baseUrl.protocol === "https:";
  const port = Number(baseUrl.port || (secure ? 443 : 80));
  const key = randomBytes(16).toString("base64");
  return new Promise((resolve, reject) => {
    const options = { host: baseUrl.hostname, port };
    const socket = secure
      ? tls.connect({ ...options, servername: baseUrl.hostname })
      : net.createConnection(options);
    let response = Buffer.alloc(0);
    socket.setTimeout(10_000);
    socket.once(secure ? "secureConnect" : "connect", () => {
      const headers = [
        "GET /ws/v1 HTTP/1.1",
        `Host: ${baseUrl.host}`,
        "Connection: Upgrade",
        "Upgrade: websocket",
        `Sec-WebSocket-Key: ${key}`,
        "Sec-WebSocket-Version: 13",
        `Sec-WebSocket-Protocol: ${subprotocols.join(", ")}`,
      ];
      if (origin !== null) headers.push(`Origin: ${origin}`);
      if (cookie !== null) headers.push(`Cookie: ${cookie}`);
      if (authorization !== null) headers.push(`Authorization: ${authorization}`);
      headers.push("", "");
      socket.write(headers.join("\r\n"));
    });
    const onData = (chunk) => {
      response = Buffer.concat([response, chunk]);
      const boundary = response.indexOf("\r\n\r\n");
      if (boundary < 0) return;
      socket.off("data", onData);
      const head = response.subarray(0, boundary).toString("latin1");
      const status = Number(head.match(/^HTTP\/1\.1 (\d{3})/u)?.[1] ?? 0);
      if (status !== 101) {
        socket.destroy();
        resolve({ status, socket: null });
        return;
      }
      socket.setTimeout(0);
      resolve({ status, socket: new RawWebSocket(socket, response.subarray(boundary + 4)) });
    };
    socket.on("data", onData);
    socket.on("timeout", () => socket.destroy(new Error("WebSocket operation timed out")));
    socket.on("error", reject);
  });
}

export class RawWebSocket {
  constructor(socket, initialData) {
    this.socket = socket;
    this.buffer = initialData;
    this.messages = [];
    this.waiters = [];
    this.socket.on("data", (chunk) => {
      this.buffer = Buffer.concat([this.buffer, chunk]);
      this.parseFrames();
    });
    this.socket.on("error", (error) => this.rejectWaiters(error));
    this.socket.on("close", () => this.rejectWaiters(new Error("WebSocket closed")));
    this.parseFrames();
  }

  sendJson(value) {
    this.sendFrame(0x1, Buffer.from(JSON.stringify(value)));
  }

  close() {
    if (!this.socket.destroyed) {
      this.sendFrame(0x8, Buffer.from([0x03, 0xe8]));
      this.socket.end();
    }
  }

  nextJson(predicate, timeoutMs = 10_000) {
    const index = this.messages.findIndex(predicate);
    if (index >= 0) {
      return Promise.resolve(this.messages.splice(index, 1)[0]);
    }
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        const waiterIndex = this.waiters.findIndex((entry) => entry.resolve === resolve);
        if (waiterIndex >= 0) this.waiters.splice(waiterIndex, 1);
        reject(new Error("Timed out waiting for WebSocket JSON"));
      }, timeoutMs);
      this.waiters.push({ predicate, resolve, reject, timer });
    });
  }

  sendFrame(opcode, payload) {
    const mask = randomBytes(4);
    let header;
    if (payload.length < 126) {
      header = Buffer.from([0x80 | opcode, 0x80 | payload.length]);
    } else if (payload.length <= 0xffff) {
      header = Buffer.alloc(4);
      header[0] = 0x80 | opcode;
      header[1] = 0x80 | 126;
      header.writeUInt16BE(payload.length, 2);
    } else {
      header = Buffer.alloc(10);
      header[0] = 0x80 | opcode;
      header[1] = 0x80 | 127;
      header.writeBigUInt64BE(BigInt(payload.length), 2);
    }
    const masked = Buffer.from(payload);
    for (let index = 0; index < masked.length; index += 1) {
      masked[index] ^= mask[index % 4];
    }
    this.socket.write(Buffer.concat([header, mask, masked]));
  }

  parseFrames() {
    while (this.buffer.length >= 2) {
      const opcode = this.buffer[0] & 0x0f;
      const masked = (this.buffer[1] & 0x80) !== 0;
      let length = this.buffer[1] & 0x7f;
      let offset = 2;
      if (length === 126) {
        if (this.buffer.length < 4) return;
        length = this.buffer.readUInt16BE(2);
        offset = 4;
      } else if (length === 127) {
        if (this.buffer.length < 10) return;
        const wideLength = this.buffer.readBigUInt64BE(2);
        if (wideLength > BigInt(Number.MAX_SAFE_INTEGER)) {
          this.socket.destroy(new Error("WebSocket frame is too large"));
          return;
        }
        length = Number(wideLength);
        offset = 10;
      }
      const maskLength = masked ? 4 : 0;
      if (this.buffer.length < offset + maskLength + length) return;
      const mask = masked ? this.buffer.subarray(offset, offset + 4) : null;
      offset += maskLength;
      const payload = Buffer.from(this.buffer.subarray(offset, offset + length));
      this.buffer = this.buffer.subarray(offset + length);
      if (mask) {
        for (let index = 0; index < payload.length; index += 1) {
          payload[index] ^= mask[index % 4];
        }
      }
      if (opcode === 0x1) {
        this.receiveJson(payload.toString("utf8"));
      } else if (opcode === 0x8) {
        this.socket.end();
      } else if (opcode === 0x9) {
        this.sendFrame(0xA, payload);
      }
    }
  }

  receiveJson(text) {
    let message;
    try {
      message = JSON.parse(text);
    } catch {
      return;
    }
    const index = this.waiters.findIndex((entry) => entry.predicate(message));
    if (index >= 0) {
      const [waiter] = this.waiters.splice(index, 1);
      clearTimeout(waiter.timer);
      waiter.resolve(message);
      return;
    }
    this.messages.push(message);
  }

  rejectWaiters(error) {
    for (const waiter of this.waiters.splice(0)) {
      clearTimeout(waiter.timer);
      waiter.reject(error);
    }
  }
}
