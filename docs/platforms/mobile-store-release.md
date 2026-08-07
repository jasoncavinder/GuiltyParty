# Mobile Store Release Evidence Checklist

## Current Status

[ADR 0032](../adr/0032-mobile-store-privacy-and-review-readiness.md) governs
mobile store privacy, deletion, and review readiness. This checklist is a living
evidence record, not legal advice and not approval to distribute an unfinished
build.

Public mobile distribution remains blocked until server-side account, journal,
consent, safety, diagnostic, AI, media, and operational data lifecycles used by
the release are approved well enough to support accurate disclosures.

## Release Identity

- [ ] platform, package or bundle identifier, version, and build
- [ ] source commit and reproducible artifact reference
- [ ] store track, territories, and supported operating-system versions
- [ ] enabled server, provider, feature-flag, and scenario-catalog configuration
- [ ] evidence-pack revision and human-owner approval date

## Binary and Service Evidence

- [ ] application and server data-flow inventory
- [ ] network destinations and transmitted field categories observed
- [ ] permissions, entitlements, capabilities, and purpose strings reviewed
- [ ] Apple privacy manifests and required-reason APIs reconciled
- [ ] Android merged manifest and applicable SDK Index evidence reconciled
- [ ] dependency inventory, SBOM, licenses, providers, and removal evidence current
- [ ] dormant, conditional, regional, and third-party paths included
- [ ] no production secret, credential, private scenario, or player data in pack

## Privacy and Store Declarations

- [ ] public privacy-policy URL is stable, accurate, versioned, and linked in-app
- [ ] public privacy-choices and account-deletion URL works without the app
- [ ] policy covers fields, purposes, triggers, processors, sharing, retention,
      deletion, consent withdrawal, and platform-controlled behavior
- [ ] Apple App Privacy answers match the artifact and services
- [ ] Google Play Data Safety answers cover the distributed package globally
- [ ] platform forms, in-app notices, manifests, provider terms, and traffic agree
- [ ] advertising, tracking, sensitive-permission, AI, and diagnostic answers are
      explicit even when the answer is none or not enabled

## Account Deletion Test

- [ ] both native apps expose a clear in-app deletion path
- [ ] the public web path is prominent, authenticated, and functional
- [ ] fresh authentication and explicit final confirmation work
- [ ] active access, endpoint authority, and ordinary credentials revoke immediately
- [ ] account profile and recovery email delete or irreversibly disassociate
- [ ] passkeys and Apple, Google, or other authentication bindings are removed
- [ ] provider tokens and permissions, including Sign in with Apple, are revoked
- [ ] endpoint credentials, paired trust, push tokens, and linked preferences clear
- [ ] user-controlled history follows the stated deletion behavior
- [ ] local deletion follows ADR 0029
- [ ] completion occurs within 30 days or the stricter applicable requirement
- [ ] the user receives accurate completion confirmation
- [ ] every retained exception has approved purpose, fields, access, duration,
      deletion, legal basis, and disclosure
- [ ] deletion requires no recovery key or discretionary support interaction

## Honest Product Presentation

- [ ] store copy does not promise universal screenshot or recording prevention
- [ ] capture wording matches ADR 0021 and the tested platform behavior
- [ ] private Companion protection is distinguished from public Stage casting
- [ ] metadata, screenshots, and previews show implemented features only
- [ ] no private or unlicensed scenario, creator, participant, or AI content appears
- [ ] language availability and scenario translations match published approvals

## Reviewer Access

- [ ] dedicated synthetic reviewer account or approved fully featured mode works
- [ ] synthetic participants and original rights-cleared scenario are available
- [ ] sample invitation or QR and join, reconnect, and deletion steps are current
- [ ] review servers and required features remain reachable throughout review
- [ ] LAN consent, discovery, pairing, Stage, casting, media, notifications, AI,
      privacy boundaries, and platform adaptations are explained as applicable
- [ ] reviewer credentials grant no production or administrative access
- [ ] a monitored owner contact and hardware or configuration notes are supplied

## Audience, Content, and Legal Inputs

- [ ] listing remains not child-directed and outside Kids or Families programs
- [ ] target-audience and rating questionnaires match every available scenario
- [ ] scenario eligibility cannot exceed the store rating in each territory
- [ ] communication, horror, violence, and other mature-content inputs are accurate
- [ ] content, translations, fonts, assets, sounds, and media have verified rights
- [ ] encryption and export-compliance answers reflect the exact build and territory
- [ ] qualified review is obtained for legal or jurisdictional conclusions

## Final Owner Gate

- [ ] physical-device and release-parity evidence is complete
- [ ] account deletion is verified end to end
- [ ] privacy manifests and store declarations match observed behavior
- [ ] reviewer access was rehearsed from a clean device and account
- [ ] all URLs resolve and all review instructions are current
- [ ] no unresolved retention, provider, rights, safety, or disclosure issue ships
- [ ] official Apple and Google guidance was rechecked on the approval date
- [ ] archived evidence and the exact artifact received explicit human approval

Store acceptance does not replace this gate. If evidence and declarations
disagree, the feature or release remains blocked.
