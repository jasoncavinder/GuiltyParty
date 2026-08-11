import engineModule from "../../target/wasm32-unknown-unknown/release/gp_scenario_wasm.wasm";
import scenarioV1 from "../../scenarios/the-stolen-artifact-v1.json" with { type: "json" };
import scenarioV2 from "../../scenarios/the-stolen-artifact-v2.json" with { type: "json" };

import { CURRENT_SCENARIO_REFERENCE } from "./scenario-reference.js";

const ENGINE_ABI_VERSION = 1;
const MAXIMUM_ENGINE_RESPONSE_BYTES = 1024 * 1024;
const instance = await WebAssembly.instantiate(engineModule, {});
const scenarios = new Map([scenarioV1, scenarioV2].map((scenario) => [scenarioKey({
  scenarioId: scenario.id,
  scenarioVersion: scenario.version,
}), scenario]));

export class ScenarioEngine {
  constructor(exports = instance.exports) {
    this.exports = exports;
    if (this.exports.gp_engine_abi_version() !== ENGINE_ABI_VERSION) {
      throw new Error("Unsupported Guilty Party scenario engine ABI");
    }
  }

  get scenarioReference() {
    return { ...CURRENT_SCENARIO_REFERENCE };
  }

  supports(reference) {
    return scenarios.has(scenarioKey(reference));
  }

  project(journal, audience, reference = this.scenarioReference) {
    const scenario = scenarios.get(scenarioKey(reference));
    if (!scenario) {
      return { ok: false, code: "scenario_unavailable", title: "Scenario unavailable" };
    }
    return this.process({
      abi_version: ENGINE_ABI_VERSION,
      scenario,
      journal,
      audience: engineAudience(audience),
    });
  }

  process(value) {
    const input = new TextEncoder().encode(JSON.stringify(value));
    const inputPointer = this.exports.gp_alloc(input.byteLength);
    if (inputPointer === 0) {
      return { ok: false, code: "engine_allocation_failed", title: "Engine request failed" };
    }
    new Uint8Array(this.exports.memory.buffer, inputPointer, input.byteLength).set(input);

    let outputPointer = 0;
    try {
      outputPointer = this.exports.gp_process(inputPointer, input.byteLength);
      if (outputPointer === 0) {
        return { ok: false, code: "engine_output_failed", title: "Engine response failed" };
      }
      const outputLength = this.exports.gp_output_length(outputPointer);
      if (outputLength === 0 || outputLength > MAXIMUM_ENGINE_RESPONSE_BYTES) {
        return { ok: false, code: "engine_output_failed", title: "Engine response failed" };
      }
      const outputData = this.exports.gp_output_data(outputPointer);
      const output = new Uint8Array(this.exports.memory.buffer, outputData, outputLength).slice();
      const response = JSON.parse(new TextDecoder().decode(output));
      return response && typeof response === "object"
        ? response
        : { ok: false, code: "engine_output_failed", title: "Engine response failed" };
    } catch {
      return { ok: false, code: "engine_output_failed", title: "Engine response failed" };
    } finally {
      this.exports.gp_free(inputPointer, input.byteLength);
      if (outputPointer !== 0) {
        this.exports.gp_output_free(outputPointer);
      }
    }
  }
}

export const scenarioEngine = new ScenarioEngine();

function scenarioKey(reference) {
  return `${reference?.scenarioId ?? ""}\u0000${reference?.scenarioVersion ?? ""}`;
}

function engineAudience(authority) {
  if (authority.audience === "participant") {
    return { kind: "participant", participant_id: authority.participantId };
  }
  return { kind: authority.audience };
}
