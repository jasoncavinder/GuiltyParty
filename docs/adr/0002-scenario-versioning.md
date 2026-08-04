# ADR 0002: Immutable Scenario Versions

## Status

Accepted

## Date

2026-08-04

---

# Context

Guilty Party scenarios are created and modified over time.

Creators may:

- Fix errors
- Improve balance
- Add content
- Change mechanics

However, live events must remain predictable.

A host preparing for an event must know exactly which scenario they are running.

---

# Decision

Published scenarios are immutable.

Every published scenario receives a version identifier.

Example:

```
Death at Blackwood Manor
v1
v2
v3
```

An event references one specific version.

---

# Rules

## Drafts

Creators may freely modify drafts.

Drafts are not playable.

---

## Published Versions

Published versions cannot change.

Corrections require a new version.

---

## Events

An event permanently references the selected scenario version.

Example:

```
Event:
Friday Murder Mystery
Scenario:
Death at Blackwood Manor
Version:
3
```

---

# Benefits

## Reliability

Hosts know exactly what they are preparing.

---

## Reproducibility

Sessions can be replayed and debugged.

---

## Creator Accountability

Reviews and ratings correspond to specific content versions.

---

## Testing

Automated scenario validation can target specific versions.

---

# Consequences

Positive:

- Predictable experiences.
- Easier debugging.
- Strong creator workflow.

Negative:

- More storage required.
- Creators must manage versions.

---

# Alternatives Considered

## Mutable published scenarios

Rejected.

Changing active content could break:

- Scheduled events
- Host preparation
- Player expectations

---

## Copy-on-write only

Deferred.

May be useful internally but does not replace explicit versions.
