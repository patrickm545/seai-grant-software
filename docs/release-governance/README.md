# Release Governance

| Field | Value |
| --- | --- |
| Document ID | GOV-REL-INDEX-001 |
| Status | Active |
| Owner | Clada Systems Leadership |
| Review cycle | Every platform release |
| Last reviewed | 2026-07-12 |

This section defines how Clada Systems specifies, reviews, implements, validates, approves, merges, and tags Clada OS platform releases.

Release Governance exists so release decisions live in the repository, not in private chat history. Chat conversations may advise, draft, and clarify work. Repository documentation is authoritative.

## Authority

Release Governance sits inside the Clada Operating Manual and follows the existing authority order:

1. [Constitution](../CONSTITUTION.md)
2. [The Clada Way](../THE_CLADA_WAY.md)
3. [Clada Operating Manual](../README.md), including this Release Governance section
4. ADRs
5. [Master Release Specifications](../release-specifications/README.md)
6. Feature specifications
7. Sprint documents
8. Implementation

If release planning conflicts with a higher-authority document, the conflict must be resolved in documentation before implementation begins.

## Relationship To The Platform Roadmap

The [Platform Execution Model and Roadmap](../01-platform/PLATFORM_EXECUTION_MODEL_AND_ROADMAP.md) proposes release sequencing, dependencies, maturity targets, and platform capability priorities.

Release Governance defines how any approved release moves from idea to merge. The roadmap can propose what comes next. A Master Release Specification decides what a specific release is allowed to do.

## Relationship To Master Release Specifications

Every future platform release begins with a Master Release Specification in [../release-specifications](../release-specifications/README.md).

A Master Release Specification is the durable source of truth for:

- business context;
- strategic objective;
- release scope;
- non-goals;
- platform and product boundaries;
- architecture;
- feature specification requirements;
- ADR requirements;
- validation gates;
- CTO review;
- CEO approval;
- release sign-off.

No platform implementation may begin from chat instructions alone.

## Release Lifecycle

The official lifecycle is defined in [RELEASE_LIFECYCLE.md](RELEASE_LIFECYCLE.md).

Every platform release must move through:

Idea -> Business Validation -> Architecture -> Master Release Specification -> Architecture Review -> Feature Specifications -> ADRs -> Sprint Planning -> Implementation -> Testing -> Draft Pull Request -> CTO Review -> CEO Approval -> Merge -> Release Tag -> Roadmap Update.

## Approval Workflow

Implementation may not begin until:

1. the CTO approves the architecture;
2. the CEO approves the Master Release Specification;
3. required feature specifications exist;
4. required ADRs exist;
5. sprint scope is documented.

Every release ends with:

1. a draft pull request;
2. CTO review;
3. CEO approval;
4. merge;
5. release tag;
6. roadmap update.

## Responsibilities

### CEO

The CEO owns business approval. The CEO confirms customer value, strategic alignment, commercial value, scope, cost, timeline, business risk, dependency risk, and release readiness before merge.

The CEO approval checklist is [CEO_RELEASE_APPROVAL.md](CEO_RELEASE_APPROVAL.md).

### CTO

The CTO owns engineering approval. The CTO confirms architecture, reusability, platform boundaries, product boundaries, permissions, audit, organisation isolation, database integrity, transactions, concurrency, testing, security, documentation, performance, technical debt, deferrals, validation, and release readiness.

The CTO review checklist is [CTO_REVIEW_CHECKLIST.md](CTO_REVIEW_CHECKLIST.md).

### Codex

Codex may inspect, draft, implement, test, summarize, and prepare pull requests, but Codex does not approve releases.

Codex must:

- follow Documentation First Development;
- keep repository documentation ahead of or aligned with implementation;
- treat chat instructions as advisory until represented in repository documents;
- stop when instructions conflict with active governance;
- avoid starting platform functionality before approval gates are satisfied;
- report validation honestly;
- never merge or tag a release without explicit approval.

## Governance Rules

1. Every platform release begins with a Master Release Specification.
2. Implementation may not begin until CTO architecture approval and CEO specification approval are recorded.
3. Master Release Specifications are permanent repository documents.
4. Chat conversations are advisory. Repository documentation is authoritative.
5. Every release follows Documentation First Development.
6. Every release produces ADRs before implementation.
7. Every release produces feature specifications before implementation.
8. Every release ends with a draft pull request, CTO review, CEO approval, merge, release tag, and roadmap update.

## Documents

- [RELEASE_LIFECYCLE.md](RELEASE_LIFECYCLE.md): official release lifecycle.
- [RELEASE_SPECIFICATION_TEMPLATE.md](RELEASE_SPECIFICATION_TEMPLATE.md): required Master Release Specification template.
- [CTO_REVIEW_CHECKLIST.md](CTO_REVIEW_CHECKLIST.md): engineering approval checklist.
- [CEO_RELEASE_APPROVAL.md](CEO_RELEASE_APPROVAL.md): business approval checklist.
- [GOVERNANCE_CHANGELOG.md](GOVERNANCE_CHANGELOG.md): governance version history.
