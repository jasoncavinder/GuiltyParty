import manifestSource from "../../scenarios/the-stolen-artifact-v2.presentation.json" with { type: "json" };

import { evaluateClientBuild } from "./client-build.js";

export const STAGE_PRESENTATION_FEATURE = "stage_presentation_media_v1";
export const HOST_PRESENTATION_STATUS_FEATURE = "host_presentation_status_v1";

const IDENTIFIER_PATTERN = /^[a-z][a-z0-9_.-]{0,127}$/u;
const DIGEST_PATTERN = /^[a-f0-9]{64}$/u;
const APPROVED_STAGE_BUILD = Object.freeze({
  application_id: "stage_webos",
  application_version: "0.2.0",
  build_number: 3,
});
const APPROVED_HOST_BUILD = Object.freeze({
  application_id: "host_web",
  application_version: "0.2.0",
  build_number: 2,
});
const ATMOSPHERE_STATES = new Set(["stopped", "starting", "playing", "failed"]);

const manifest = validateManifest(manifestSource);

export const PRESENTATION_MANIFEST_REVISION = manifest?.revision ?? null;

export function decorateStageProjection(projection, registration, serializedBuildPolicy) {
  if (
    !manifest ||
    !eligibleStageRegistration(registration, serializedBuildPolicy) ||
    !projection ||
    projection.scenario_id !== manifest.scenarioId ||
    projection.scenario_version !== manifest.scenarioVersion ||
    !projection.active_scene
  ) {
    return projection;
  }
  const cue = manifest.scenes.get(projection.active_scene.id);
  if (!cue || cue.audience !== "public_stage") return projection;

  const descriptor = {
    manifest_revision: manifest.revision,
    audience: "public_stage",
    scene_image_id: cue.sceneImageId,
  };
  if (registration.capabilities.includes("public_audio_output")) {
    descriptor.atmosphere_audio_id = cue.atmosphereAudioId;
    descriptor.audio_behavior = "loop_while_scene_active";
  }
  return {
    ...projection,
    active_scene: { ...projection.active_scene, presentation: descriptor },
  };
}

export function eligibleStageRegistration(registration, serializedBuildPolicy) {
  return eligibleRegistration({
    registration,
    audience: "stage",
    requiredCapability: "public_display",
    requiredFeature: STAGE_PRESENTATION_FEATURE,
    approvedBuild: APPROVED_STAGE_BUILD,
    serializedBuildPolicy,
  });
}

export function eligibleHostStatusRegistration(registration, serializedBuildPolicy) {
  return eligibleRegistration({
    registration,
    audience: "host",
    requiredCapability: "host_control",
    requiredFeature: HOST_PRESENTATION_STATUS_FEATURE,
    approvedBuild: APPROVED_HOST_BUILD,
    serializedBuildPolicy,
  });
}

export function sanitizePresentationStatus(value) {
  if (
    !manifest ||
    !value ||
    typeof value !== "object" ||
    Array.isArray(value) ||
    value.manifest_revision !== manifest.revision ||
    typeof value.asset_available !== "boolean" ||
    typeof value.sound_enabled !== "boolean" ||
    !ATMOSPHERE_STATES.has(value.atmosphere_state) ||
    typeof value.reduced_motion !== "boolean"
  ) {
    return null;
  }
  return {
    manifest_revision: manifest.revision,
    asset_available: value.asset_available,
    sound_enabled: value.sound_enabled,
    atmosphere_state: value.atmosphere_state,
    reduced_motion: value.reduced_motion,
  };
}

function eligibleRegistration({
  registration,
  audience,
  requiredCapability,
  requiredFeature,
  approvedBuild,
  serializedBuildPolicy,
}) {
  return Boolean(
    manifest &&
      registration &&
      registration.revoked !== true &&
      registration.audience === audience &&
      Array.isArray(registration.capabilities) &&
      registration.capabilities.includes(requiredCapability) &&
      Array.isArray(registration.features) &&
      registration.features.includes(requiredFeature) &&
      sameBuild(registration.clientBuild, approvedBuild) &&
      evaluateClientBuild(registration.clientBuild, serializedBuildPolicy).ok,
  );
}

function sameBuild(actual, approved) {
  return Boolean(
    actual &&
      actual.application_id === approved.application_id &&
      actual.application_version === approved.application_version &&
      actual.build_number === approved.build_number,
  );
}

function validateManifest(value) {
  if (
    !value ||
    value.schema_version !== 1 ||
    value.scenario_id !== "the-stolen-artifact" ||
    value.scenario_version !== 2 ||
    !validIdentifier(value.revision) ||
    !value.assets ||
    !Array.isArray(value.assets.images) ||
    !Array.isArray(value.assets.audio) ||
    !Array.isArray(value.scenes)
  ) {
    return null;
  }
  const imageIds = assetIdentifiers(value.assets.images);
  const audioIds = assetIdentifiers(value.assets.audio);
  if (!imageIds || !audioIds) return null;
  const scenes = new Map();
  for (const cue of value.scenes) {
    if (
      !cue ||
      !validIdentifier(cue.scene_id) ||
      scenes.has(cue.scene_id) ||
      cue.audience !== "public_stage" ||
      !imageIds.has(cue.scene_image_id) ||
      !audioIds.has(cue.atmosphere_audio_id) ||
      cue.audio_behavior !== "loop_while_scene_active"
    ) {
      return null;
    }
    scenes.set(cue.scene_id, {
      audience: cue.audience,
      sceneImageId: cue.scene_image_id,
      atmosphereAudioId: cue.atmosphere_audio_id,
    });
  }
  return {
    scenarioId: value.scenario_id,
    scenarioVersion: value.scenario_version,
    revision: value.revision,
    scenes,
  };
}

function assetIdentifiers(assets) {
  const identifiers = new Set();
  for (const asset of assets) {
    if (
      !asset ||
      !validIdentifier(asset.id) ||
      identifiers.has(asset.id) ||
      !DIGEST_PATTERN.test(asset.sha256)
    ) {
      return null;
    }
    identifiers.add(asset.id);
  }
  return identifiers;
}

function validIdentifier(value) {
  return typeof value === "string" && IDENTIFIER_PATTERN.test(value);
}
