const VOTING_PHASES = new Set(["not_open", "open", "closed", "resolved"]);

export function normalizeParticipantProjection(value, participantId) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new TypeError("The server sent an invalid private view.");
  }
  if (!Array.isArray(value.participants) || !Array.isArray(value.revealed_clues)) {
    throw new TypeError("The server sent an incomplete private view.");
  }
  const ownMatches = value.participants.filter((participant) => participant?.participant_id === participantId);
  if (ownMatches.length !== 1 || typeof ownMatches[0].has_voted !== "boolean") {
    throw new TypeError("The server could not confirm this private view belongs to you.");
  }
  if (value.participants.some((participant) =>
    participant?.participant_id !== participantId &&
    (Object.hasOwn(participant ?? {}, "private_objective") || Object.hasOwn(participant ?? {}, "has_voted")))) {
    throw new TypeError("The server included private information for another player.");
  }
  if (
    !VOTING_PHASES.has(value.voting_phase) ||
    typeof value.voting_open !== "boolean" ||
    value.voting_open !== (value.voting_phase === "open") ||
    (value.voting_phase === "resolved") !== (value.outcome !== null)
  ) {
    throw new TypeError("The server sent an inconsistent voting state.");
  }

  const ownParticipant = ownMatches[0];
  const voteTargets = value.vote_targets ?? [];
  if (!Array.isArray(voteTargets) || voteTargets.length > 128) {
    throw new TypeError("The server sent invalid voting choices.");
  }
  const normalizedTargets = voteTargets.map((target) => {
    if (
      !target || typeof target !== "object" || Array.isArray(target) ||
      typeof target.character_id !== "string" || target.character_id.length < 1 || target.character_id.length > 128 ||
      typeof target.character_name !== "string" || target.character_name.length < 1
    ) {
      throw new TypeError("The server sent invalid voting choices.");
    }
    return { id: target.character_id, name: target.character_name };
  });
  if (
    new Set(normalizedTargets.map((target) => target.id)).size !== normalizedTargets.length ||
    (normalizedTargets.length > 0 &&
      (value.voting_phase !== "open" || ownParticipant.character_name === null || ownParticipant.has_voted))
  ) {
    throw new TypeError("The server sent voting choices outside your authority.");
  }

  return { projection: value, ownParticipant, voteTargets: normalizedTargets };
}

export function votingPresentation({ phase, ownVoteRecorded, voteTargets, submissionPending }) {
  if (ownVoteRecorded) {
    return { kind: "recorded", title: "Your vote is recorded", detail: "Individual votes remain private." };
  }
  if (submissionPending) {
    return { kind: "submitting", title: "Submitting your vote", detail: "Waiting for the server to confirm your choice." };
  }
  if (phase === "not_open") {
    return { kind: "not-open", title: "Voting has not opened", detail: "The Host will open the accusation when the story is ready." };
  }
  if (phase === "closed") {
    return { kind: "closed", title: "Voting is closed", detail: "The Host is preparing the resolution." };
  }
  if (phase === "resolved") {
    return { kind: "resolved", title: "The vote is resolved", detail: "The public outcome is shown below." };
  }
  if (phase === "open" && voteTargets.length === 0) {
    return { kind: "unavailable", title: "No choices are available", detail: "Ask the Host to confirm your character assignment." };
  }
  if (phase === "open") {
    return { kind: "open", title: "Choose the guilty character", detail: "Select one server-authorized character, then cast your vote." };
  }
  return { kind: "unavailable", title: "Voting unavailable", detail: "Rejoin with a current invitation to use direct voting." };
}

export function gameplayLanguageName(tag, locale = globalThis.navigator?.language ?? "en") {
  if (!/^[A-Za-z]{2,8}(?:-[A-Za-z0-9]{1,8})*$/u.test(tag ?? "")) return "Language unavailable";
  try {
    return new Intl.DisplayNames([locale], { type: "language" }).of(tag) ?? tag;
  } catch {
    return tag;
  }
}
