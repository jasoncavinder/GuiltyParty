export async function fanOutWebSockets(sockets, deliver) {
  for (const socket of sockets) {
    try {
      await deliver(socket);
    } catch {
      // One stale or unwritable endpoint must not prevent later recipients from
      // receiving their independently authorized projections.
      try {
        socket.close(1011, "Projection delivery failed");
      } catch {
        // The connection may already be gone. Continue the bounded fan-out.
      }
    }
  }
}
