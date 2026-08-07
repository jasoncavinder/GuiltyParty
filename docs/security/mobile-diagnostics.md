# Mobile Diagnostics Policy Checklist

## Current Status

[ADR 0030](../adr/0030-mobile-crash-reporting-and-diagnostics.md) permits
platform-provided crash evidence and an explicitly user-initiated, first-party
diagnostic bundle. No third-party or automatic crash-reporting collector is
approved.

## Collection Modes

| Mode | Initial status | Choice boundary |
| --- | --- | --- |
| Apple App Store and TestFlight reports | Permitted with accurate notice | Platform-controlled; TestFlight automatically shares crash reports with the developer. |
| Google Play Android vitals | Permitted with accurate notice | Uses reports from users who enabled platform usage and diagnostic sharing. |
| Local development diagnostics | Permitted on project-owned test devices | Remains local unless minimized under this policy. |
| Share Diagnostic Report | Permitted | User selects **Send once** after reviewing the categories. |
| Automatic first-party upload | Not approved | Requires a new proposal and owner approval. |
| Third-party SDK or hosted collector | Not approved | Requires ADR 0025 intake and the ADR 0030 provider gates. |
| Session replay, screen capture, or remote logging | Prohibited | Not eligible as crash-reporting convenience. |

## First-Party Bundle Allowlist

- [ ] application version and build
- [ ] operating-system version and device model without a persistent identifier
- [ ] failure class
- [ ] sanitized symbolic application stack frames
- [ ] protocol and schema versions
- [ ] allowlisted lifecycle, connection, media-route, capability, and feature
      enums
- [ ] bucketed resource or performance state
- [ ] random per-report identifier
- [ ] minute-rounded timestamp
- [ ] at most 50 fixed breadcrumb enums spanning no more than two minutes

The schema accepts no unreviewed field, map, arbitrary JSON value, or free-form
string.

## Prohibited-Data Test Set

Use synthetic canaries for each category and prove none reaches the bundle,
logs, platform breadcrumbs, raw triage artifact, or durable issue:

- [ ] direct or recovery identity
- [ ] account, session, participant, character, room, endpoint, scenario,
      installation, pairing, or host identifiers
- [ ] tokens, cookies, keys, assertions, headers, or secrets
- [ ] projections, journals, commands, votes, clues, objectives, evidence,
      messages, whispers, or creator content
- [ ] media, screenshots, UI hierarchy, captions, transcripts, AI content,
      keyboard input, or pasteboard content
- [ ] request or response bodies, URL paths or parameters, addresses, SSIDs,
      location, push or advertising identifiers, or serial numbers
- [ ] raw console or `logcat` output, network traces, memory dumps, databases,
      heap contents, session replay, or dynamic exception messages

## Scrubbing and Sharing Evidence

- [ ] construct from the on-device allowlist before file or network operations
- [ ] omit values that cannot be produced safely
- [ ] reject unknown fields again at receipt
- [ ] show plain-language data categories before sharing
- [ ] provide **Send once** and **Not now** without gameplay penalty
- [ ] make **Always offer** revocable and never treat it as automatic-send consent
- [ ] never attach screenshots, logs, recordings, dumps, or files automatically
- [ ] delete the local bundle after sharing or within 24 hours
- [ ] queue no silent retry after cancellation or failure

## Access and Retention

| Artifact | Access | Maximum project-controlled retention |
| --- | --- | --- |
| Local pending bundle | Current endpoint owner | Share completion or 24 hours |
| Directly received or exported raw report | Human project owner during solo operation | 30 days after receipt |
| Minimized engineering issue | Owner and named engineering roles with need | 180 days after last occurrence |
| AI task extract | Explicitly authorized task only | Task scope; derived from the minimized issue |
| Platform-console data | Named platform-console roles | Provider-controlled; do not export to create another archive |

The minimized issue contains only signature, affected versions and device
classes, aggregate counts, occurrence dates, synthetic reproduction evidence,
and resolution notes.

## Release Review

- [ ] Apple and Google platform behavior and retention reviewed
- [ ] TestFlight automatic crash sharing disclosed to testers
- [ ] Android platform diagnostic-sharing source disclosed accurately
- [ ] App Store privacy and Google Play Data Safety answers match the build
- [ ] no unapproved diagnostic dependency appears in manifests, binaries,
      privacy reports, permissions, network traces, or SBOM
- [ ] portal and raw-report access reviewed
- [ ] local and received deletion schedules verified
- [ ] representative physical-device crash and hang tests completed

If collection, scrubbing, consent state, provider behavior, or disclosure cannot
be verified, the first-party bundle is disabled and the affected distribution
does not make an unsupported privacy claim.
