# Release Lifecycle

| Field | Value |
| --- | --- |
| Document ID | GOV-REL-LIFE-001 |
| Status | Active |
| Owner | Clada Systems Leadership |
| Review cycle | Every platform release |
| Last reviewed | 2026-07-12 |

This document defines the official engineering lifecycle for future Clada OS platform releases.

The lifecycle protects Clada OS from undocumented scope changes, product-specific platform coupling, weak validation, and release decisions that exist only in private conversation.

## Lifecycle Sequence

```text
Idea
  -> Business Validation
  -> Architecture
  -> Master Release Specification
  -> Architecture Review
  -> Feature Specifications
  -> ADRs
  -> Sprint Planning
  -> Implementation
  -> Testing
  -> Draft Pull Request
  -> CTO Review
  -> CEO Approval
  -> Merge
  -> Release Tag
  -> Roadmap Update
```

## Stages

### Idea

A release idea identifies a potential platform capability, hardening need, governance improvement, product dependency, operational risk, or customer-value opportunity.

An idea does not authorize implementation.

### Business Validation

Business validation confirms why the release matters, who benefits, what customer or operational problem it addresses, and whether the timing is justified.

This stage should identify expected customer value, commercial value, strategic alignment, dependencies, rough cost, timing sensitivity, and business risk.

### Architecture

Architecture defines the platform capability boundary, product-module boundary, domain model, tenancy implications, security posture, data ownership, integration points, and deferrals.

Architecture must preserve the distinction between Clada OS and SolarGRANT Pro.

### Master Release Specification

The Master Release Specification is the permanent release source of truth.

It records the approved release objective, scope, non-goals, platform responsibilities, product responsibilities, architecture, database design, services, APIs, permissions, transactions, concurrency, threat analysis, testing, validation, migration plan, sprint breakdown, acceptance criteria, deferrals, technical debt, CTO review, CEO approval, and release sign-off.

Master Release Specifications live in [../release-specifications](../release-specifications/README.md).

### Architecture Review

Architecture review confirms that the release can be implemented safely and in the right layer.

The CTO or delegated architecture reviewer must verify reusability, platform boundaries, product boundaries, security, privacy, auditability, tenant isolation, data model integrity, transaction strategy, concurrency strategy, and implementation risk.

### Feature Specifications

Feature specifications translate the Master Release Specification into specific behaviours and acceptance criteria.

Each feature specification should define purpose, actors, preconditions, functional behaviour, permissions, validation rules, error conditions, acceptance criteria, non-goals, audit requirements, and test requirements.

### ADRs

Architecture Decision Records document material decisions that affect architecture, security, privacy, data models, platform boundaries, provider strategy, product coupling, or long-term maintainability.

ADRs must exist before implementation when the release depends on a material decision.

### Sprint Planning

Sprint planning turns the approved specification, feature specs, and ADRs into a build plan with sequencing, validation gates, review points, deferrals, and merge requirements.

Sprint planning must make clear what is in scope and what is intentionally out of scope.

### Implementation

Implementation starts only after approval gates are satisfied.

Implementation must follow existing repository patterns, preserve documented boundaries, update documentation when reality changes, and avoid unrelated refactors.

### Testing

Testing proves the release against its specification.

The required test set depends on the release, but platform releases must consider unit tests, integration tests, permission tests, tenant isolation tests, migration tests, security tests, regression tests, and validation commands.

### Draft Pull Request

Every platform release must open a draft pull request before it is treated as ready for final review.

The draft PR should summarize scope, decisions, implementation, migrations, tests, validation results, deferrals, known risks, and review questions.

### CTO Review

CTO review validates engineering readiness using [CTO_REVIEW_CHECKLIST.md](CTO_REVIEW_CHECKLIST.md).

The CTO may approve, request changes, require additional ADRs, require additional tests, narrow scope, or return the release to architecture.

### CEO Approval

CEO approval validates business readiness using [CEO_RELEASE_APPROVAL.md](CEO_RELEASE_APPROVAL.md).

The CEO may approve merge, request changes, defer the release, narrow scope, or reject the release if business risk outweighs value.

### Merge

Merge happens only after CTO review and CEO approval are complete.

The merge commit becomes the approved baseline for the next release unless the CEO or CTO records a different baseline.

### Release Tag

Platform releases must be tagged after merge using the approved release tag naming convention.

Tags are not created before approval, and Codex must not create a release tag unless explicitly instructed.

### Roadmap Update

After merge and tag, the roadmap and related COM navigation must be updated to reflect the completed release, changed dependencies, known deferrals, and next candidate release.

## Stop Conditions

Stop before implementation when:

- the release has no Master Release Specification;
- architecture approval is missing;
- CEO approval is missing;
- required feature specs or ADRs are missing;
- the release conflicts with the Constitution, The Clada Way, COM, roadmap, or active ADRs;
- platform and product boundaries are unclear;
- tenant, permission, audit, or security foundations are insufficient;
- validation requirements cannot be met;
- repository state does not match the approved baseline.
