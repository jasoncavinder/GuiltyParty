import assert from "node:assert/strict";
import test from "node:test";

import { PARTICIPANT_VOTING_FEATURE } from "../src/constants.js";
import { applyParticipantVotingNegotiation } from "../src/participant-voting.js";

const projection = Object.freeze({
  scenario_id: "scenario-synthetic-001",
  voting_open: true,
  voting_phase: "open",
  vote_targets: Object.freeze([
    Object.freeze({ character_id: "character-1", character_name: "Curator" }),
  ]),
});

function registration(features = [PARTICIPANT_VOTING_FEATURE]) {
  return {
    audience: "participant",
    protocolVersion: "1.1",
    features,
    revoked: false,
  };
}

test("protocol 1.1 participant receives only explicitly negotiated voting fields", () => {
  const result = applyParticipantVotingNegotiation(
    projection,
    { audience: "participant", protocolVersion: "1.1" },
    registration(),
  );

  assert.equal(result, projection);
  assert.equal(result.voting_phase, "open");
  assert.equal(result.vote_targets[0].character_name, "Curator");
});

test("supported protocol 1.0 participant remains compatible through field omission", () => {
  const result = applyParticipantVotingNegotiation(
    projection,
    { audience: "participant", protocolVersion: "1.0" },
    registration(),
  );

  assert.equal("voting_phase" in result, false);
  assert.equal("vote_targets" in result, false);
  assert.equal(result.voting_open, true);
});

test("protocol 1.1 without the feature fails closed", () => {
  const result = applyParticipantVotingNegotiation(
    projection,
    { audience: "participant", protocolVersion: "1.1" },
    registration([]),
  );

  assert.equal("voting_phase" in result, false);
  assert.equal("vote_targets" in result, false);
});

test("Host and Stage never receive participant voting fields", () => {
  for (const audience of ["host", "stage"]) {
    const result = applyParticipantVotingNegotiation(
      projection,
      { audience, protocolVersion: "1.1" },
      { ...registration(), audience },
    );
    assert.equal("voting_phase" in result, false);
    assert.equal("vote_targets" in result, false);
  }
});
