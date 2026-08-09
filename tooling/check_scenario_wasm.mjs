import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const serverRoot = fileURLToPath(new URL("../apps/server/", import.meta.url));

run("cargo", [
  "build",
  "--locked",
  "--release",
  "--target",
  "wasm32-unknown-unknown",
  "-p",
  "gp_scenario_wasm",
], serverRoot);

const nativeProbe = run(
  "cargo",
  ["run", "--quiet", "--locked", "-p", "gp_scenario_wasm", "--bin", "gp_scenario_native_probe"],
  serverRoot,
);
const parityFixture = JSON.parse(nativeProbe.stdout);
const wasmPath = `${serverRoot}target/wasm32-unknown-unknown/release/gp_scenario_wasm.wasm`;
const module = await WebAssembly.instantiate(readFileSync(wasmPath), {});
const exports = module.instance.exports;

assert.equal(exports.gp_engine_abi_version(), 1, "unexpected WebAssembly engine ABI");
const input = new TextEncoder().encode(JSON.stringify(parityFixture.request));
const inputPointer = exports.gp_alloc(input.byteLength);
assert.notEqual(inputPointer, 0, "WebAssembly request allocation failed");
new Uint8Array(exports.memory.buffer, inputPointer, input.byteLength).set(input);

let outputPointer;
let wasmResponse;
try {
  outputPointer = exports.gp_process(inputPointer, input.byteLength);
  assert.notEqual(outputPointer, 0, "WebAssembly engine returned no output");
  const outputLength = exports.gp_output_length(outputPointer);
  const outputData = exports.gp_output_data(outputPointer);
  const output = new Uint8Array(exports.memory.buffer, outputData, outputLength).slice();
  wasmResponse = JSON.parse(new TextDecoder().decode(output));
} finally {
  exports.gp_free(inputPointer, input.byteLength);
  if (outputPointer) {
    exports.gp_output_free(outputPointer);
  }
}

assert.deepEqual(wasmResponse, parityFixture.response, "native and WebAssembly projections differ");
const serializedProjection = JSON.stringify(wasmResponse.projection);
assert.equal(serializedProjection.includes("Hide the fact"), false, "Stage received private objective");
assert.equal(serializedProjection.includes("badge near the exit"), false, "Stage received private clue");
assert.equal(serializedProjection.includes("private_objective"), false, "Stage received private field");
assert.equal(serializedProjection.includes("has_voted"), false, "Stage received individual vote field");

console.log(`Scenario engine native/WebAssembly parity OK (${input.byteLength} request bytes).`);

function run(command, args, cwd) {
  const result = spawnSync(command, args, {
    cwd,
    encoding: "utf8",
    env: { ...process.env, CARGO_TERM_COLOR: "never" },
  });
  if (result.status !== 0) {
    process.stderr.write(result.stdout);
    process.stderr.write(result.stderr);
    throw new Error(`${command} ${args.join(" ")} failed with status ${result.status}`);
  }
  return result;
}
