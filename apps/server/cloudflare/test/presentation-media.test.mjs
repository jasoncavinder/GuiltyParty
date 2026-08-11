import assert from "node:assert/strict";
import test from "node:test";

import {
  HOST_PRESENTATION_STATUS_FEATURE,
  PRESENTATION_MANIFEST_REVISION,
  STAGE_PRESENTATION_FEATURE,
  decorateStageProjection,
  eligibleHostStatusRegistration,
  eligibleStageRegistration,
  sanitizePresentationStatus,
} from "../src/presentation-media.js";

const policy = JSON.stringify({
  host_web: { minimum_build_number: 1 },
  stage_webos: { minimum_build_number: 1 },
});
const projection = Object.freeze({
  scenario_id: "the-stolen-artifact",
  scenario_version: 2,
  active_scene: { id: "scene_2", name: "Discovery", public_narrative: "The case is empty." },
});

function stageRegistration(overrides = {}) {
  return {
    audience: "stage",
    platform: "webos",
    capabilities: ["public_display", "public_audio_output"],
    features: [STAGE_PRESENTATION_FEATURE],
    clientBuild: {
      application_id: "stage_webos",
      application_version: "0.2.0",
      build_number: 3,
    },
    revoked: false,
    ...overrides,
  };
}

function hostRegistration(overrides = {}) {
  return {
    audience: "host",
    platform: "browser",
    capabilities: ["host_control"],
    features: [HOST_PRESENTATION_STATUS_FEATURE],
    clientBuild: {
      application_id: "host_web",
      application_version: "0.2.0",
      build_number: 2,
    },
    revoked: false,
    ...overrides,
  };
}

test("only the exact negotiated Stage build receives the approved logical cue", () => {
  const registration = stageRegistration();
  assert.equal(eligibleStageRegistration(registration, policy), true);
  assert.deepEqual(decorateStageProjection(projection, registration, policy).active_scene.presentation, {
    manifest_revision: PRESENTATION_MANIFEST_REVISION,
    audience: "public_stage",
    scene_image_id: "scene_image.discovery.cinematic_gallery.v1",
    atmosphere_audio_id: "atmosphere.discovery.cinematic_vault.v1",
    audio_behavior: "loop_while_scene_active",
  });

  const displayOnly = stageRegistration({ capabilities: ["public_display"] });
  assert.deepEqual(decorateStageProjection(projection, displayOnly, policy).active_scene.presentation, {
    manifest_revision: PRESENTATION_MANIFEST_REVISION,
    audience: "public_stage",
    scene_image_id: "scene_image.discovery.cinematic_gallery.v1",
  });

  for (const ineligible of [
    stageRegistration({ audience: "host" }),
    stageRegistration({ capabilities: ["public_audio_output"] }),
    stageRegistration({ features: [] }),
    stageRegistration({ clientBuild: { ...registration.clientBuild, build_number: 2 } }),
    stageRegistration({ clientBuild: { ...registration.clientBuild, application_version: "0.2.1" } }),
    stageRegistration({ revoked: true }),
  ]) {
    assert.equal(decorateStageProjection(projection, ineligible, policy), projection);
  }
  assert.equal(
    decorateStageProjection(projection, registration, JSON.stringify({ stage_webos: { minimum_build_number: 4 } })),
    projection,
  );
});

test("presentation decoration is absent outside the exact scenario scene", () => {
  const registration = stageRegistration();
  for (const candidate of [
    { ...projection, scenario_version: 1 },
    { ...projection, scenario_id: "another-scenario" },
    { ...projection, active_scene: { ...projection.active_scene, id: "scene_1" } },
    { ...projection, active_scene: null },
  ]) {
    assert.equal(decorateStageProjection(candidate, registration, policy), candidate);
  }
});

test("Host presentation status is independently negotiated and reports are reduced", () => {
  assert.equal(eligibleHostStatusRegistration(hostRegistration(), policy), true);
  assert.equal(eligibleHostStatusRegistration(hostRegistration({ features: [] }), policy), false);
  assert.equal(eligibleHostStatusRegistration(hostRegistration({ audience: "participant" }), policy), false);

  const status = {
    manifest_revision: PRESENTATION_MANIFEST_REVISION,
    asset_available: true,
    sound_enabled: false,
    atmosphere_state: "stopped",
    reduced_motion: true,
    device_volume: 0.7,
    room_audio: "forbidden",
  };
  assert.deepEqual(sanitizePresentationStatus(status), {
    manifest_revision: PRESENTATION_MANIFEST_REVISION,
    asset_available: true,
    sound_enabled: false,
    atmosphere_state: "stopped",
    reduced_motion: true,
  });
  for (const invalid of [
    { ...status, manifest_revision: "other-revision" },
    { ...status, atmosphere_state: "unknown" },
    { ...status, atmosphere_state: "playing", sound_enabled: "yes" },
    null,
  ]) {
    assert.equal(sanitizePresentationStatus(invalid), null);
  }
});
