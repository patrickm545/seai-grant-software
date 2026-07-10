# Architecture Checkpoint 1 - Repository and COM Health Review

| Field | Value |
| --- | --- |
| Document ID | SPRINT-ARCH-CHECKPOINT-1 |
| Status | Active |
| Owner | Clada Systems Product and Engineering |
| Review cycle | At checkpoint close |
| Last reviewed | 2026-07-10 |

## Purpose

This checkpoint reviews the repository after Foundation Release 1.0, Platform Release 1.0, and Platform Release 1.1.

The objective is to confirm whether the repository, Clada Operating Manual (COM), and current Clada OS architecture are healthy enough to proceed toward Platform Release 1.2 without starting Platform Release 1.2 work.

This checkpoint does not implement new platform capabilities, change production code, rename folders, archive documents, or begin Platform Release 1.2.

## Evidence Reviewed

- [COM index](../README.md)
- [COM summary](../SUMMARY.md)
- [Documentation standard](../DOCUMENTATION_STANDARD.md)
- [Document lifecycle](../DOCUMENT_LIFECYCLE.md)
- [Platform architecture](../01-platform/README.md)
- [Platform execution model and roadmap](../01-platform/PLATFORM_EXECUTION_MODEL_AND_ROADMAP.md)
- [Platform dependency map](../01-platform/PLATFORM_DEPENDENCY_MAP.md)
- [Platform capability map](../01-platform/PLATFORM_CAPABILITY_MAP.md)
- [Module architecture](../01-platform/MODULE_ARCHITECTURE.md)
- [SolarGRANT Pro module](../01-product/SOLARGRANT_PRO_MODULE.md)
- [Engineering architecture overview](../03-engineering/ARCHITECTURE_OVERVIEW.md)
- [Engineering standards](../03-engineering/ENGINEERING_STANDARDS.md)
- [PostgreSQL integration test guide](../03-engineering/POSTGRES_INTEGRATION_TESTS.md)
- [Feature specifications](../04-features/README.md)
- [Architecture decisions](../05-decisions/README.md)
- [Platform Release 1.1 sprint record](PLATFORM_RELEASE_1_1_IDENTITY_AND_ORGANISATION.md)
- Prisma schema, Platform Release 1.1 migration, identity helpers, tenant access helpers, lead routes, and platform tests.

## Executive Summary

The repository is healthy enough to continue building Clada OS.

The COM is healthy and functioning as the source of truth. The authority hierarchy is clear, documents have metadata, the numbered COM sections are discoverable, and Platform Release 1.1 was supported by feature specifications, ADRs, migration notes, and tests.

The architecture is coherent. Clada OS is defined as the platform, SolarGRANT Pro is defined as the first product module, and the Platform Release 1.x roadmap correctly places users, roles, permissions, and audit after the identity and organisation foundation.

Platform Release 1.2 can proceed after this checkpoint is merged, provided it remains scoped to users, roles, permissions, and audit foundation work. No critical blocker was found that should prevent Platform Release 1.2 from starting. Several high-priority items should block Platform Release 1.2 completion if not addressed in that release.

The three highest-value improvements before commercial scale are:

1. Implement a real permission and actor-aware audit foundation in Platform Release 1.2.
2. Make validation repeatable in CI, including lint, typecheck, unit tests, migration checks, and documentation link/metadata checks.
3. Reconcile active security/GDPR and legacy support documents into the numbered COM hierarchy, then archive superseded material deliberately.

## Repository Structure Review

Overall rating: Good.

Strengths:

- The repository has a clear Next.js application structure with `app`, `components`, `lib`, `prisma`, `tests`, `scripts`, and `docs`.
- The numbered COM structure under `docs/00-company` through `docs/07-research` is easy to scan.
- Platform Release 1.1 code is concentrated around identity, tenant access helpers, Prisma schema/migration, and lead-facing routes.
- Tests are separated into platform unit tests and PostgreSQL-backed integration tests.
- Generated and local runtime artifacts are ignored in `.gitignore`.

Needs attention:

- Legacy support folders still sit beside the numbered COM: `docs/company`, `docs/product`, `docs/design`, `docs/engineering`, and `docs/sprints`.
- Some legacy documents are intentionally retained as compatibility pointers, while others still carry active or proposed status. This makes authority slightly harder to understand.
- Both `package-lock.json` and `pnpm-lock.yaml` are tracked even though `package.json` declares `pnpm@10.11.0`.
- No GitHub Actions workflow is present for repeatable validation.

Recommendation:

Do not restructure the repository before Platform Release 1.2. Instead, treat navigation cleanup and package-manager lockfile cleanup as bounded maintenance items after the checkpoint.

## COM Health Review

Overall rating: Good.

Strengths:

- [docs/README.md](../README.md) defines the COM as the permanent source of truth.
- The authority order is explicit: Constitution, The Clada Way, COM, feature specs, sprint docs, implementation.
- [docs/SUMMARY.md](../SUMMARY.md) provides a useful table of contents for active numbered sections.
- Durable documents mostly include document ID, status, owner, review cycle, and last reviewed metadata.
- Documentation lifecycle and documentation standard documents are active and practical.
- Platform Release 1.1 has linked feature specs, ADRs, sprint scope, implementation plan, security notes, and validation expectations.

Needs attention:

- [docs/SUMMARY.md](../SUMMARY.md) describes itself as the navigation layer for the COM but does not include all supporting foundation references listed in [docs/README.md](../README.md).
- The active [Security and GDPR](../engineering/security-and-gdpr.md) document still lives under `docs/engineering` rather than `docs/03-engineering`.
- [docs/99-archive/README.md](../99-archive/README.md) says no documents have been archived, while several superseded compatibility documents remain outside the archive.
- There is no durable documentation validation script for metadata and internal links.

Recommendation:

Keep the COM as the authority. Before commercial scale, add a small documentation validation command and perform a deliberate archive/reconciliation pass for legacy support documents.

## Architecture Health Review

Overall rating: Good.

Strengths:

- Platform boundaries are clearly documented in [Platform Dependency Map](../01-platform/PLATFORM_DEPENDENCY_MAP.md), [Module Architecture](../01-platform/MODULE_ARCHITECTURE.md), and [Product Composition](../01-platform/PRODUCT_COMPOSITION.md).
- SolarGRANT Pro is consistently treated as a product module rather than the platform.
- Platform Release 1.1 created real identity and organisation models: `Organisation`, `User`, `OrganisationMembership`, organisation-owned installers, and organisation-owned leads.
- Tenant-aware access helpers centralize the first security-sensitive data access pattern for the lead proving slice.
- PostgreSQL constraints enforce that a lead's installer belongs to the same organisation as the lead.
- The roadmap correctly defers users, roles, permissions, and full audit to Platform Release 1.2.

Needs attention:

- Current authentication remains an adapted admin-password session, which is acceptable for Platform Release 1.1 but not enough for mature user identity.
- Audit logs and lead activity attribution still use strings rather than actor, user, membership, organisation, and permission context.
- Permissions are documented but not implemented beyond organisation context and default-deny tenant scoping.
- Public token flows are intentionally outside authenticated organisation context and need explicit review as permissions and audit mature.
- Reuse is proven only by the SolarGRANT Pro proving slice. No capability should be treated as L5 reusable across products yet.

Recommendation:

Proceed to Platform Release 1.2 with a narrow feature specification and ADR set for users, roles, permissions, actor-aware audit, and one SolarGRANT Pro protected workflow slice.

## Engineering Process Review

Overall rating: Good.

Strengths:

- Release workflow is documentation-first and visible through sprint records.
- Feature specification and ADR processes are active.
- Platform Release 1.1 linked scope, risks, ADRs, migration plan, tests, and non-goals.
- Contribution and AI engineering instructions tell future agents to read COM documents before implementation.
- The sprint rule prevents starting major implementation work without an active sprint.

Needs attention:

- Validation is described in docs, but there is no central automated workflow or script that runs all expected checks.
- PR workflow exists as a template, but there is no CI gate to prove checks ran consistently.
- Release gate evidence currently depends on PR text and local validation rather than a structured release-close checklist.

Recommendation:

Add lightweight CI and a release-close checklist before commercial scale. Do not let this delay the start of Platform Release 1.2 unless validation becomes unreliable.

## Security and Quality Review

Overall rating: Needs Attention.

Strengths:

- Tenant boundaries are now a documented security requirement.
- Platform Release 1.1 fails closed for missing or invalid organisation context.
- Database-backed tenant isolation tests exist for cross-organisation read, update, delete, and lead/installer ownership mismatch.
- Production code avoids broad platform refactors and keeps homeowner token access outside the authenticated tenant context for this release.
- GDPR-conscious rules exist and customer data is treated as sensitive in engineering standards.

Needs attention:

- Roles, permissions, and audit actor ownership are not yet implemented.
- `AuditLog.actor`, `LeadActivity.createdBy`, and `LeadActivity.createdByRole` are string fields.
- There is no formal row-level security strategy. This is acceptable for the current maturity but should be reassessed after the application context model stabilizes.
- Formal privacy, terms, DPA, retention, export, deletion, and incident-response documentation remain commercial-scale work.
- Integration tests require a disposable PostgreSQL database and are not yet CI-enforced.

Recommendation:

Treat Platform Release 1.2 as a security and traceability release. It should harden permission checks and audit events before workflow, document, notification, AI, reporting, or automation capabilities advance.

## Technical Debt Register

The durable technical debt register lives at [../03-engineering/TECHNICAL_DEBT_REGISTER.md](../03-engineering/TECHNICAL_DEBT_REGISTER.md).

Highest-priority technical debt:

| Severity | Debt | Recommendation | Blocks Platform Release 1.2? |
| --- | --- | --- | --- |
| High | Permission model is not implemented beyond tenant context. | Implement Platform Release 1.2 permission contracts before broadening workflow access. | No to start; yes to complete. |
| High | Audit attribution remains string-based and not actor/organisation-owned. | Replace or wrap audit writes with actor-aware audit events in Platform Release 1.2. | No to start; yes to complete. |
| High | Validation is not CI-enforced. | Add a GitHub Actions workflow for lint, typecheck, tests, migration checks, and documentation validation. | No. |
| High | Security/GDPR operating docs are not fully commercial-scale. | Move active security guidance into numbered COM and add formal privacy, DPA, retention, deletion/export, and incident process docs before scale. | No to start; likely before commercial launch. |
| Medium | Dual lockfiles create package-manager ambiguity. | Standardize on pnpm and remove the unused lockfile in a focused maintenance PR. | No. |

No critical technical debt was found that should block the start of Platform Release 1.2.

## Documentation Debt Register

Missing documentation:

- Platform Release 1.2 feature specifications and ADRs are not yet present. This is expected because Platform Release 1.2 has not started.
- A durable documentation validation command is missing.
- Formal commercial-scale privacy, DPA, retention, deletion/export, and incident-response docs are missing.
- A release-close checklist template would make future release evidence easier to verify.

Duplicated or overlapping documentation:

- Numbered COM sections now coexist with older `docs/company`, `docs/product`, `docs/design`, `docs/engineering`, and `docs/sprints` folders.
- Some old product and engineering documents are compatibility pointers, while others are still active or proposed supporting references.

Outdated or legacy documentation suitable for future archiving:

- [docs/sprints/sprint-0-foundation.md](../sprints/sprint-0-foundation.md)
- [docs/architecture.md](../architecture.md)
- [docs/company/vision.md](../company/vision.md)
- [docs/company/positioning.md](../company/positioning.md)
- [docs/design/design-system.md](../design/design-system.md)
- [docs/design/ui-ux-principles.md](../design/ui-ux-principles.md)
- [docs/engineering/architecture.md](../engineering/architecture.md)
- Legacy product references under [docs/product](../product/roadmap.md), after their active content is reconciled.

Navigation improvements:

- Add a "Supporting References" section to [docs/SUMMARY.md](../SUMMARY.md) or clarify that SUMMARY lists only active numbered COM sections.
- Move or mirror active Security/GDPR guidance into `docs/03-engineering`.
- Update [docs/99-archive/README.md](../99-archive/README.md) when the first archiving pass happens.

No documents were deleted, archived, or renamed during this checkpoint.

## Architecture Scorecard

| Category | Rating | Justification |
| --- | --- | --- |
| Repository Structure | Good | Clear application and documentation layout; legacy support folders and dual lockfiles need cleanup. |
| Documentation Quality | Good | Strong metadata, hierarchy, and cross-links; legacy support docs and validation automation need attention. |
| Architecture Quality | Good | Platform, module, shared-service, and dependency boundaries are coherent and documented. |
| Platform Boundaries | Good | Clada OS boundaries are clear; Platform Release 1.2 must prevent SolarGRANT-specific permissions and audit concepts from becoming generic. |
| Product Boundaries | Good | SolarGRANT Pro remains a consumer/proving slice of Clada OS. |
| Engineering Standards | Good | Documentation-first workflow, ADRs, feature specs, and AI rules are active. |
| Security | Needs Attention | Tenant isolation improved materially, but roles, permissions, audit actor ownership, and commercial GDPR docs are still pending. |
| Testing | Good | Unit and PostgreSQL integration tests exist for Platform Release 1.1; CI enforcement and docs validation are missing. |
| Maintainability | Good | Scope discipline is strong; future maintainability depends on reducing legacy doc ambiguity and validation drift. |
| Scalability | Needs Attention | Architecture can scale, but implementation is still a single proving slice with adapted admin auth. |
| Technical Debt | Needs Attention | No critical blockers, but permissions, audit, validation, and package-manager hygiene require planned follow-up. |
| Readiness for Platform Release 1.2 | Good | Platform Release 1.2 can proceed with narrow scope and release gates focused on permissions and audit. |

## Platform Release 1.2 Recommendation

Platform Release 1.2 should proceed after this checkpoint PR is reviewed and merged.

Entry conditions:

- Keep Platform Release 1.2 limited to users, roles, permissions, audit foundation, and one SolarGRANT Pro proving slice.
- Create feature specifications before implementation.
- Record ADRs for the permission model and audit actor model if the decisions are material.
- Include a data-access review for lead, activity, document, audit, and public-token contexts.
- Run or explicitly caveat PostgreSQL integration tests before release close.

Do not begin Platform Release 1.2 from this checkpoint branch.

## Validation Results

Validation run on 2026-07-10:

| Check | Result | Notes |
| --- | --- | --- |
| Markdown formatting sanity check | Passed | Checked all docs for H1 presence, trailing whitespace, and tab characters. |
| Document metadata check | Passed | Checked all Markdown files under `docs` for required COM metadata fields. |
| Internal link check | Passed | Checked local Markdown links under `docs`. |
| COM summary navigation check | Passed | Checked numbered COM Markdown files are listed in [../SUMMARY.md](../SUMMARY.md). |
| `git diff --check` | Passed | Git reported line-ending warnings for existing CRLF behavior, but no whitespace errors. |
| `corepack pnpm test` | Passed | 14 platform tests passed. Shell Node was `v24.14.1`, while the repo expects Node `22.x`; pnpm was pinned through Corepack to `10.11.0`. |
| `corepack pnpm lint` | Passed | Same Node `24.14.1` engine warning. |
| `corepack pnpm typecheck` | Passed | Same Node `24.14.1` engine warning. |
| `pnpm test:integration:postgres` | Not run | `TEST_DATABASE_URL` was not set, so the disposable PostgreSQL integration suite was not executed. |

PostgreSQL integration tests should be run before any Platform Release 1.2 implementation is closed if the release changes tenant-owned data access, permissions, or audit behavior.
