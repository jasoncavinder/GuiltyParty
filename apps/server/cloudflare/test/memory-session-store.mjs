export class MemorySessionStore {
  constructor(entries = []) {
    this.entries = structuredClone(entries);
    this.idempotency = new Map();
    this.failNextAppend = false;
  }

  async loadJournal() {
    return structuredClone(this.entries);
  }

  async getIdempotency(endpointId, idempotencyId) {
    return structuredClone(this.idempotency.get(`${endpointId}\0${idempotencyId}`) ?? null);
  }

  async appendCommand({
    entry,
    endpointId,
    idempotencyId,
    fingerprint,
    result,
    maximumRecordsPerEndpoint,
    assertCommitAllowed,
  }) {
    assertCommitAllowed();
    if (this.failNextAppend) {
      this.failNextAppend = false;
      throw new Error("synthetic storage failure");
    }
    this.entries.push(structuredClone(entry));
    this.idempotency.set(`${endpointId}\0${idempotencyId}`, {
      fingerprint,
      result: structuredClone(result),
      sequence: entry.sequence_number,
    });

    const endpointRecords = [...this.idempotency.entries()]
      .filter(([key]) => key.startsWith(`${endpointId}\0`))
      .sort((left, right) => right[1].sequence - left[1].sequence);
    for (const [key] of endpointRecords.slice(maximumRecordsPerEndpoint)) {
      this.idempotency.delete(key);
    }
  }
}
