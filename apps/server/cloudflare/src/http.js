import { PROTOCOL_VERSION, SECURITY_HEADERS } from "./constants.js";

export function jsonResponse(value, init = {}) {
  const headers = new Headers(init.headers);
  if (!headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json; charset=utf-8");
  }
  for (const [name, content] of Object.entries(SECURITY_HEADERS)) {
    headers.set(name, content);
  }
  return new Response(JSON.stringify(value), { ...init, headers });
}

export function problemResponse(status, code, title, options = {}) {
  const correlationId = options.correlationId ?? crypto.randomUUID();
  const problem = {
    protocol_version: PROTOCOL_VERSION,
    type: `urn:guilty-party:problem:${code}`,
    title,
    status,
    code,
    correlation_id: correlationId,
  };
  if (options.detail) {
    problem.detail = options.detail;
  }
  if (typeof options.retryable === "boolean") {
    problem.retryable = options.retryable;
  }
  return jsonResponse(problem, {
    status,
    headers: { "Content-Type": "application/problem+json; charset=utf-8" },
  });
}

export function methodNotAllowed(allowed) {
  return problemResponse(405, "method_not_allowed", "Method not allowed", {
    detail: `This endpoint accepts ${allowed}.`,
  });
}
