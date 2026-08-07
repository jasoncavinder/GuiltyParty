# ADR 0025: Third-Party Dependency and SDK Governance

## Status

Accepted

## Date

2026-08-06

---

# Context

Guilty Party is proprietary commercial software in a public repository. A
third-party component can affect ownership, redistribution, patent exposure,
privacy, permissions, store disclosures, supply-chain integrity, security,
availability, and the ability to remove or self-host a feature. Those effects
can arise from source libraries, binary SDKs, build plugins, generators,
service clients, hosted processors, fonts, media, model weights, datasets, or
transitive packages.

Mobile stores also treat the application developer as responsible for bundled
SDK behavior. Apple requires privacy manifests and signatures for specified
SDKs and combines included manifests into a privacy report. Google Play
requires Data Safety declarations to include third-party library and SDK
behavior and may flag problematic SDK versions. A package declaration alone is
therefore not adequate intake evidence.

The project needs one reusable gate that allows justified components while
preventing an agent, automation, or contributor from silently creating legal,
privacy, security, or operational obligations.

# Decision

## Scope and Approval Authority

This policy applies before adding or materially changing any third-party:

- source library, framework, SDK, native binary, or precompiled artifact
- package-manager dependency or meaningful transitive component
- build plugin, compiler plugin, generator, code template, or release tool
- hosted service client, remote processor, telemetry endpoint, or provider
- font, icon set, image, audio, video, scenario content, dataset, or model
- copied code, sample, algorithm implementation, or externally generated asset

First-party Guilty Party code and original assets remain subject to ownership
and security review but are not third-party intake. Standard operating-system
frameworks and installed platform toolchains are tracked through platform and
build baselines; enabling a new service, sensitive API, entitlement, data flow,
or redistributed runtime still invokes this policy.

Every new component requires explicit project-owner approval in the pull
request after its evidence is available. Agents and automation may research,
compare, prepare the intake record, and propose a component. They cannot
approve or silently add it. Approval applies to the recorded source, version,
features, purpose, platforms, and data behavior; it does not authorize unrelated
future use or versions.

## Necessity and Alternatives

The intake identifies one concrete capability and explains why existing code,
the standard library, a platform API, an already approved component, or a small
first-party implementation is insufficient. It records expected benefit,
integration surface, maintenance cost, removal cost, and at least one reasonable
alternative when the choice is significant.

Dependency count is not itself the decision criterion. A well-maintained,
narrow component may be safer than custom security or protocol code, while a
convenience package with broad data or build authority may be unjustified.

## Required Intake Evidence

Before approval, the record contains or links to:

- component name, purpose, category, source, publisher, canonical repository,
  package coordinates, exact proposed version, and release date
- source or binary provenance, signing or checksum information where
  available, maintainer and security contact, support and end-of-life status,
  and evidence of ongoing maintenance
- direct and material transitive components, enabled features, build scripts,
  downloaded artifacts, native code, dynamic loading, and runtime endpoints
- platforms, binaries, services, build stages, and release artifacts affected
- permissions, entitlements, sensitive APIs, background modes, storage,
  cryptography, networking, and remote-configuration behavior
- license and copyright texts, attribution and notice obligations, source or
  object redistribution terms, patent provisions, commercial-use restrictions,
  trademark terms, and any separate service or model terms
- collected, derived, transmitted, or shared data; purpose, trigger, default
  state, recipients, subprocessors, region, retention, deletion, consent,
  account linkage, identifiers, and whether all unnecessary collection can be
  disabled
- Apple privacy manifest and signature status, required-reason APIs, combined
  privacy-report impact, and store-label effect where applicable
- Android merged-manifest permissions, SDK Index and Play notices, Data Safety
  effect, policy statements, and opt-out or consent behavior where applicable
- security advisories, vulnerability and malware history, update channel,
  rollback path, compatibility risk, test plan, and removal plan
- reviewer, owner decision, approval date, allowed scope, review triggers, and
  any time-limited exception

Provider marketing, a package registry label, an SDK privacy manifest, or a
store SDK declaration is evidence but not proof. The project remains
responsible for comparing declared behavior with configuration, source where
available, manifests, network behavior, and produced artifacts.

## License and Ownership Gate

Clearly identified permissive licenses such as MIT, BSD, ISC, or Apache-style
terms may be candidates for approval when their exact version, notices,
copyrights, patent terms, and distribution obligations are compatible with the
intended proprietary use. Their names do not create automatic approval.

The following require explicit owner and, where appropriate, professional legal
review before inclusion:

- missing, ambiguous, custom, or conflicting license terms
- copyleft or network-copyleft obligations
- source-available, noncommercial, research-only, field-of-use, ethical-use,
  business-source, server-side, or commons-clause restrictions
- dual licensing where the chosen grant is not documented
- model, dataset, font, media, content, or service terms with unclear training,
  output, attribution, sublicensing, publication, or commercial rights
- patent, trademark, export, geography, or downstream distribution terms that
  may affect the product

A component is rejected when compatible rights and required notices cannot be
established. Public availability, free price, package-manager presence, or AI-
generated provenance does not establish permission.

## Privacy, Store, and Permission Gate

A component is rejected when its required behavior includes advertising,
cross-product tracking, sale of data, silent telemetry, session replay,
unnecessary persistent identifiers, excessive permissions, undisclosed
processors, or collection that cannot be disabled or truthfully disclosed.

Data-handling components are initialized in a non-collecting state until the
app has the documented purpose, disclosure, consent where required, authority,
and retention lifecycle. A provider's consent interface does not replace
Guilty Party's server-side authorization or participant consent.

Apple integrations must supply every required valid privacy manifest and SDK
signature, disclose required-reason APIs, and agree with the archived Xcode
privacy report and actual behavior. Android integrations must be checked
against the SDK Index, Play notices, merged manifest, sensitive permissions,
and the application's full Data Safety declaration. Store acceptance never
overrides the stricter project privacy policy.

## Risk Levels

The intake classifies the component:

- **Standard:** source-available, clearly licensed, pinned, no user-data
  processing, no new permission, no native binary or remote execution, and a
  narrow testable purpose. Owner approval and the complete standard record are
  required.
- **Elevated:** authentication, payments, cryptography, media, AI, databases,
  network infrastructure, sensitive storage, native binaries, build or release
  execution, remote configuration, crash reporting, analytics, or private-
  content processing. A focused security, privacy, architecture, or legal
  review and often an ADR are required before owner approval.
- **Prohibited until resolved:** unclear rights or provenance, incompatible
  terms, unverifiable or mutable binaries, silent or unavoidable data
  collection, excessive permissions, known unmitigated critical risk, or no
  viable removal path. The component does not enter the repository or build.

Risk classification may become stricter after review. A transitive component
can determine the risk level.

## Pinning, Provenance, and Reproducibility

Dependencies use committed manifests and lockfiles. Distributed builds resolve
the reviewed version and source, not a mutable branch, floating tag, unversioned
URL, or latest-release alias. Checksums, signatures, signed SDK identity, and
registry provenance are verified where the ecosystem supports them.

Unverifiable prebuilt binaries and install-time downloads are rejected unless
an elevated review documents necessity, origin, integrity verification,
reproducible or independently inspectable evidence, update authority, and a
time-limited exception. Generated code records the generator version and input;
committed generated output remains reviewable under ADR 0016 where applicable.

Secrets, private registry credentials, signing keys, and provider tokens never
enter the public repository, SBOM, or third-party notice file.

## Inventory, Notices, and SBOM

The repository maintains a human-readable
[Third-Party Components](../legal/third-party-components.md) record containing
approved direct components, material bundled or service obligations, version
or constraint, purpose, source, license status, notices, data and permission
summary, owner, and last review.

Required license and copyright texts or notices are included in the applicable
release and repository presentation without modifying the project's proprietary
license. Before an external beta or release, the built artifacts are reconciled
against manifests, lockfiles, transitive dependencies, embedded SDKs, native
binaries, privacy reports, permissions, and the human inventory.

A machine-readable release software bill of materials uses SPDX or another
owner-approved standard and identifies actual resolved components and versions.
The SBOM is generated from the release candidate and retained as release
evidence; it does not replace human license, privacy, or security review.

## Updates and Vulnerability Response

Updates do not merge automatically. An update pull request repeats the relevant
license, provenance, transitive, permission, privacy, store, binary, and behavior
diff and runs appropriate contract, security, privacy, deterministic, and
platform tests. A semantic-version label or patch number does not prove that
behavior or obligations are unchanged.

The inventory is reviewed before every external beta and production release
and periodically during active development. Supported advisory sources,
registry notices, store SDK warnings, maintainer security channels, and provider
policy or terms changes are monitored without adding an unapproved telemetry
SDK.

A vulnerability or policy issue is triaged by exploitability, affected data and
authority, deployed exposure, provider guidance, and available mitigation. The
owner may update, disable, isolate, roll back, revoke a build, or remove the
component. A security exception is not granted merely to preserve release
schedule.

## Removal

Removal is complete only when the project addresses:

- direct and transitive packages, imports, generated code, native artifacts,
  build scripts, and lockfiles
- permissions, entitlements, privacy manifests, store declarations, network
  endpoints, remote configuration, and feature flags
- provider accounts, API credentials, webhooks, subprocessors, retained
  provider data, and deletion verification where applicable
- stored formats, migrations, compatibility, fallback, and rollback
- notices, attributions, SBOM entries, documentation, tests, and release
  artifacts

Removing an import while leaving data, credentials, permissions, bundled code,
or a provider account is not complete removal.

## Exceptions

An exception is written, explicitly owner-approved, limited to a component,
version, platform, purpose, and release scope, and includes rationale,
compensating controls, an accountable owner, and an expiry or removal trigger.
It is visible in the intake record and release evidence.

An exception cannot silently override the root proprietary license, grant rights
the project does not possess, authorize undisclosed data handling, bypass a
store requirement, or substitute indefinite `TBD` retention.

## Existing Prototype Components

Existing prototype manifests and integrations receive a retrospective intake
under this policy before invitation-only external beta. They may remain for
current local development while that review is pending only within their
existing scope and without being represented as approved for external or
commercial distribution.

The initial status is recorded in
[Third-Party Components](../legal/third-party-components.md). This ADR does not
approve, remove, update, or change any existing dependency.

# Consequences

Positive:

- Third-party functionality cannot silently create incompatible licensing,
  privacy, security, or store obligations.
- Human approval remains distinct from agent research and automation.
- Pinned versions, provenance, inventory, notices, and release SBOMs improve
  reproducibility and removal readiness.
- Data-handling and high-authority components receive proportionate review.
- Existing prototype components have a clear path to external-beta readiness.

Negative:

- New components and updates require research and documentation.
- Transitive, binary, provider, model, and asset terms can be difficult to
  verify.
- Some convenient SDKs will be rejected or delayed.
- Release preparation requires artifact reconciliation and SBOM evidence.
- Professional legal or security review may be required for ambiguous cases.

# Alternatives Considered

## Approve Any Package with a Familiar Permissive License Label

Rejected because transitive components, patent terms, data behavior, binaries,
permissions, and required notices may differ from the top-level label.

## Let Agents Add Dependencies After Automated License Scanning

Rejected because automated metadata cannot authorize legal terms, judge product
necessity, validate actual data behavior, or accept commercial risk.

## Automatically Merge Patch Updates

Rejected because patch releases can change transitive code, permissions,
privacy manifests, endpoints, binaries, behavior, and license files.

## Track Only Runtime Libraries

Rejected because build plugins, generators, services, models, fonts, media, and
datasets can execute code or create ownership, redistribution, privacy, and
supply-chain obligations.

## Remove a Component Only from the Package Manifest

Rejected because provider data, credentials, permissions, embedded artifacts,
store disclosures, and generated or stored formats can survive package removal.

# References

- [Apple: Third-party SDK requirements](https://developer.apple.com/support/third-party-SDK-requirements/)
- [Apple: Adding a privacy manifest](https://developer.apple.com/documentation/bundleresources/adding-a-privacy-manifest-to-your-app-or-third-party-sdk)
- [Google Play: Using SDKs safely and securely](https://support.google.com/googleplay/android-developer/answer/13326895)
- [Google Play: Data Safety](https://support.google.com/googleplay/android-developer/answer/10787469)
- [SPDX specification](https://spdx.dev/use/specifications/)
- [ADR 0016: Generated Mobile Contract Models](0016-generated-mobile-contract-models.md)
- [ADR 0024: Mobile Beta Distribution](0024-mobile-beta-distribution.md)
- [Licensing and Intellectual Property Policy](../legal/licensing.md)
- [Data Lifecycle and Decision Register](../security/data-lifecycle.md)
- [Security Model](../security/security-model.md)
