# ADR 0029: Companion Local Data Lifecycle

## Status

Accepted

## Date

2026-08-06

---

# Context

The Companion must recover from temporary disconnection and application
restart, support isolated-LAN admission, and let a player move safely to
another device. Those behaviors require limited local continuity data, but the
Companion also receives character secrets, objectives, hidden evidence,
private messages, and other content that must not survive longer or travel
farther than necessary.

Earlier decisions define device-bound credential storage, server-authoritative
resumption, app-switcher shielding, endpoint transfer, and fail-closed private
views. They deliberately leave persistent private-content caching and the
local deletion schedule unresolved.

Operating-system backup and transfer behavior requires explicit control.
Device-only Apple Keychain accessibility prevents migration of protected items
to another device. Android Auto Backup otherwise includes much application-
private storage by default and therefore requires deliberate exclusion rules
and no-backup locations. Browser caches likewise require explicit response
policy rather than an assumption that authenticated content will not persist.

# Decision

## Scope

This decision governs data stored or retained by the installed iOS, iPadOS,
and Android player Companions and the browser Companion fallback. It does not
approve server-side retention for accounts, journals, consent evidence, safety
events, diagnostics, analytics, AI, media, or creator content. Those categories
retain their own approval gates.

## No Persistent Private Gameplay Cache

The initial Companion does not write private gameplay content to application-
controlled persistent storage. The following remain process-memory-only:

- character secrets, private objectives, hidden evidence, and authorized
  private projections
- whispers, private messages, private captions, and transcription text
- votes, pending private choices, and private action payloads
- private audio, video, media buffers, and AI inputs or outputs
- participant display data or room details not required by the minimum opaque
  resumption record

On `connection-uncertain`, the client covers and logically discards the
decrypted private view. It does not reveal old content after reconnect. An
authorized resumption must produce and atomically apply a fresh recipient-
specific projection before private content or actions return.

Memory-only does not authorize copying content into logs, crash reports,
analytics, task-switcher snapshots, notifications, pasteboards, temporary
exports, or operating-system search indexes.

## Permitted Persistent Categories

Only the following categories may persist initially:

1. **Device-bound authority:** the opaque refresh and session-resume
   credentials already authorized by the native and browser credential-storage
   decisions.
2. **Paired-server trust:** the minimum server authority fingerprint, endpoint
   binding, and non-secret locator needed to recognize a previously paired LAN
   installation.
3. **Opaque resumption metadata:** session, participant, and endpoint
   identifiers; last accepted server sequence; current authority generation;
   pending idempotency identifiers; the server-issued expiry or last-known
   session end; and no private projection or command content.
4. **Non-secret device preferences:** settings such as language,
   accessibility, appearance, and audio-control preferences that neither grant
   authority nor identify a session, participant, scenario, or private choice.

Account profile, scenario history, gameplay history, and downloadable private
content are not added to this list implicitly. A new category requires an
updated lifecycle record and owner approval before collection.

## Native Storage Protection

Short-lived access tokens remain in memory. Device-bound credentials and
sensitive trust material use the approved Apple Keychain or Android Keystore-
protected storage boundary. Opaque resumption metadata uses application-
private storage protected by platform data protection and, where it could
support correlation or resumption, ciphertext whose key is device-bound.

The implementation uses the most restrictive availability consistent with
foreground Companion behavior. It does not introduce a background entitlement
or weaken device-only protection merely to retain access while locked.

Credentials, paired trust, opaque session metadata, diagnostics, and private
content are excluded from cloud backup, device-to-device transfer, and cross-
platform transfer. On Apple platforms, authority uses a non-synchronizing,
device-only Keychain class. On Android, sensitive files use no-backup storage
and explicit rules that exclude them from cloud and device-transfer paths.
Backup and restore behavior is tested; manifest intent alone is not sufficient
evidence.

Only non-secret, non-account-linked preferences may be considered for ordinary
backup. A restored preference cannot prove identity, restore an endpoint,
recognize a trusted LAN server, reveal participation, or bypass pairing.

## Browser Storage and Caching

The browser Companion keeps private gameplay data in page memory only.
Credentials follow the accepted host-only cookie design. Access tokens,
session-resume values, private projections, authenticated gameplay responses,
and private media never enter `localStorage`, `sessionStorage`, IndexedDB,
Cache Storage, service-worker caches, URLs, or browser-managed application
state.

Responses containing authenticated gameplay or participant-specific data use
`Cache-Control: no-store`. Service workers do not intercept or persist them.
Non-secret preferences may use ordinary browser storage only when they contain
no account, endpoint, session, scenario, participant, or authority identifier.

Sign-out and local reset clear applicable browser storage and expire cookies
where possible. Server-side invalidation remains authoritative because a
client cannot prove that every browser or intermediary copy was erased.

## Deletion Triggers

Private in-memory content and pending private action payloads are logically
purged when:

- the connection becomes uncertain under ADR 0009
- the application backgrounds, locks, terminates, or loses current authority
- the session ends or the participant leaves, is removed, or is reassigned
- the endpoint is revoked, replaced as primary, or transferred
- account authority expires, recovery revokes sessions, or the player signs out
- paired server identity no longer matches

Applicable device-bound credentials, trust records, and opaque resumption
metadata are removed locally and invalidated server-side when their authority
ends. A confirmed session end, leave, removal, revocation, endpoint transfer,
logout, account deletion, credential expiry, or server-trust failure triggers
immediate logical deletion.

When the client cannot contact an authority, stale resumption metadata has an
absolute local backstop. It expires no later than 24 hours after the last-known
session end or, if no end is known, 24 hours after the last authenticated
server contact. An active server may issue a new bounded expiry while the
session remains authorized. Passing the local backstop cannot remove server
records; it prevents the device from retaining or presenting stale local
continuity state.

Operating systems may suspend an application before cleanup runs. Every read
path therefore checks expiry and authority before use, and startup performs
the same purge before showing private UI. Where applicable, deleting a device-
bound encryption key provides cryptographic invalidation in addition to file
deletion.

## User Controls and Account Deletion

The Companion provides understandable controls to:

- sign out of the current device
- remove or revoke this endpoint
- clear local settings and pairing records
- request account deletion when connected to the official account service

A successful online account-deletion request invalidates applicable server
authority and immediately clears account-linked local data and credentials.
While offline, the client may clear local data and queue no authoritative claim
that the remote account has been deleted. It explains that server-side account
deletion requires a connection.

Uninstall is not proof that the server received a revocation or deletion
request. Local authority is therefore device-bound, excluded from migration,
independently expiring, and revocable through other authorized account or host
surfaces. The product does not promise to delete screenshots, user exports,
operating-system diagnostics, or copies outside Guilty Party's control.

## Diagnostics Boundary

No application-owned diagnostic cache or crash-report payload is authorized by
this decision. MC-PRIV-004 must approve exact fields, on-device scrubbing,
consent, provider behavior, access, retention, and deletion before the product
collects or uploads mobile diagnostics. Private content and raw credential
material remain prohibited regardless of that later decision.

## Verification

Automated and physical-device evidence must verify:

- no private projection, content, command payload, or credential enters
  unapproved persistent stores, logs, diagnostics, or browser caches
- every authority-loss and lifecycle trigger covers and purges private state
- stale resumption metadata cannot be read or used after its local backstop
- backup, restore, device transfer, and reinstall do not migrate credentials,
  paired trust, session authority, or participation metadata
- a fresh authorized projection is required after reconnection
- sign-out, endpoint removal, local reset, and online account deletion clear the
  intended local categories without claiming unrelated server deletion

Tests use synthetic data and include crash, forced termination, backgrounding,
clock change, offline expiry, backup restoration, and device-transfer cases.

# Consequences

Positive:

- A lost, transferred, restored, or stale device has little durable private
  gameplay material to expose.
- Temporary recovery retains only opaque continuity data and never makes a
  client cache canonical.
- Device movement reauthenticates rather than migrating endpoint authority.
- The browser fallback avoids persistent script-readable gameplay state.
- Explicit backstops and startup checks handle cleanup that suspension may
  interrupt.

Negative:

- Private content disappears during connection uncertainty and must be fetched
  again after authorization.
- A player disconnected beyond the local backstop may need to sign in or rejoin.
- Excluding trust and authority from backup makes device replacement require
  reauthentication and re-pairing.
- Backup, restore, transfer, and forced-termination tests add platform work.
- Offline account deletion can clear only local data and cannot complete the
  server-side request.

# Alternatives Considered

## Persist the Last Private Projection Encrypted

Rejected initially because it creates content retention, backup, key-lifecycle,
revocation, and disclosure obligations without being necessary for the accepted
online-with-reconnection experience.

## Keep Private Content Visible While Disconnected

Rejected because transport presence no longer establishes fresh endpoint and
audience authority, and stale primary authority may have moved to another
device.

## Back Up Credentials and Pairing for Convenient Device Migration

Rejected because a restored device is a distinct endpoint and must
reauthenticate and re-pair rather than inherit device authority.

## Rely on Uninstall for Server Cleanup

Rejected because uninstall does not reliably notify the account or session
authority.

## Store Browser State in IndexedDB for Offline Use

Rejected because offline gameplay is not an accepted requirement and the
durable script-readable cache would expand the private-content attack surface.

## Authorize Diagnostics Under the Same Decision

Rejected because diagnostic fields, scrubbing, consent, access, provider, and
retention require the separate MC-PRIV-004 review.

# References

- [ADR 0008: LAN Server Certificate Trust](0008-lan-server-certificate-trust.md)
- [ADR 0009: Connection and Resumption Policy](0009-connection-resumption-policy.md)
- [ADR 0021: Mobile Screen Capture and Stage Casting](0021-mobile-screen-capture-and-stage-casting.md)
- [Apple: Restricting Keychain Item Accessibility](https://developer.apple.com/documentation/security/restricting-keychain-item-accessibility)
- [Android: Back Up User Data with Auto Backup](https://developer.android.com/identity/data/autobackup)
- [Android Keystore System](https://developer.android.com/privacy-and-security/keystore)
- [RFC 9111: `no-store`](https://www.rfc-editor.org/rfc/rfc9111.html#section-5.2.2.5)
