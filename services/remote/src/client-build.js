const FEATURE_IDENTIFIER_PATTERN = /^[a-z][a-z0-9_.-]{0,127}$/u;
const VERSION_PATTERN = /^[A-Za-z0-9][A-Za-z0-9.+_-]{0,63}$/u;

export function validClientBuild(value) {
  return (
    value &&
    typeof value === "object" &&
    !Array.isArray(value) &&
    FEATURE_IDENTIFIER_PATTERN.test(value.application_id) &&
    typeof value.application_version === "string" &&
    VERSION_PATTERN.test(value.application_version) &&
    Number.isSafeInteger(value.build_number) &&
    value.build_number >= 1
  );
}

export function evaluateClientBuild(clientBuild, serializedPolicy) {
  if (serializedPolicy === undefined || serializedPolicy === null || serializedPolicy === "") {
    return { ok: true };
  }
  let policy;
  try {
    policy = JSON.parse(serializedPolicy);
  } catch {
    return { ok: false, status: 503, code: "client_build_policy_invalid" };
  }
  if (!validPolicy(policy)) {
    return { ok: false, status: 503, code: "client_build_policy_invalid" };
  }
  if (!validClientBuild(clientBuild)) {
    return { ok: false, status: 409, code: "client_build_unsupported" };
  }
  const bounds = Object.hasOwn(policy, clientBuild.application_id)
    ? policy[clientBuild.application_id]
    : null;
  if (
    !bounds ||
    clientBuild.build_number < bounds.minimum_build_number ||
    (bounds.maximum_build_number !== undefined &&
      clientBuild.build_number > bounds.maximum_build_number)
  ) {
    return { ok: false, status: 409, code: "client_build_unsupported" };
  }
  return { ok: true };
}

function validPolicy(value) {
  return (
    value &&
    typeof value === "object" &&
    !Array.isArray(value) &&
    Object.keys(value).length > 0 &&
    Object.entries(value).every(([applicationId, bounds]) =>
      FEATURE_IDENTIFIER_PATTERN.test(applicationId) &&
      validBounds(bounds),
    )
  );
}

function validBounds(bounds) {
  return (
    bounds &&
    typeof bounds === "object" &&
    !Array.isArray(bounds) &&
    Object.keys(bounds).every((key) =>
      ["minimum_build_number", "maximum_build_number"].includes(key),
    ) &&
    Number.isSafeInteger(bounds.minimum_build_number) &&
    bounds.minimum_build_number >= 1 &&
    (bounds.maximum_build_number === undefined ||
      (Number.isSafeInteger(bounds.maximum_build_number) &&
        bounds.maximum_build_number >= bounds.minimum_build_number))
  );
}
