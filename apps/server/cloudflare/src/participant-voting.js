import {
  PARTICIPANT_VOTING_FEATURE,
  PREFERRED_PROTOCOL_VERSION,
} from "./constants.js";

export function applyParticipantVotingNegotiation(projection, attachment, registration) {
  const negotiated =
    attachment?.audience === "participant" &&
    attachment.protocolVersion === PREFERRED_PROTOCOL_VERSION &&
    registration?.audience === "participant" &&
    registration.revoked === false &&
    Array.isArray(registration.features) &&
    registration.features.includes(PARTICIPANT_VOTING_FEATURE);
  if (negotiated) return projection;

  const { voting_phase: _votingPhase, vote_targets: _voteTargets, ...baseline } = projection;
  return baseline;
}
