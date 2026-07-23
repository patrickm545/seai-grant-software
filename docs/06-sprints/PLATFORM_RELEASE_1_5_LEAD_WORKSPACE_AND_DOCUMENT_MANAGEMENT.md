# Platform Release 1.5 - Lead Workspace And Document Management Sprint Plan

| Field | Value |
| --- | --- |
| Document ID | SPRINT-PR1-5 |
| Status | Approved |
| Owner | Clada Systems Product and Engineering |
| Review cycle | Each Release 1.5 implementation sprint and at release close |
| Last reviewed | 2026-07-22 |

## Purpose

Translate the approved amended Release 1.5 Master Specification into eight small, sequenced implementation PRs. Manual Lead Creation and Accepted ADR-0021 are explicit scope. PR #34 has merged; PR 1 is now in implementation and validation, PRs 2-6 remain sequenced behind it, and PR 7 remains blocked by Release 1.4.

## Baseline And Dependency Decision

The PR 2 authoritative starting baseline is `main` merge commit `3cd9ded8cc93a98ed1a0136ba13d4cc9bf63e7fd` from merged PR #35. PR #34 and PR #35 are merged.

The amended dependency rules are explicit:

- no implementation PR may begin until approved PR #34 is merged;
- Release 1.5 PRs 1-6 may then proceed in sequence from the approved `main` baseline, subject to their documented gates;
- Release 1.5 PR 7 must not begin until the missing Release 1.4 governed generated-document implementation completes its own separately approved implementation PR sequence and is reviewed and merged into `main`;
- existing uploaded `LeadDocument` evidence may surface earlier only where an approved PR 1-6 workspace scope requires it, and it must be labelled as uploaded evidence;
- no Release 1.5 PR may create a generated-document substitute or duplicate or partially recreate architecture governed by ADR-0015, ADR-0016, and ADR-0017.

The amended release direction, architecture decisions, feature set, and sequence are approved. Approval does not bypass any PR-specific stop condition or the PR 7 dependency.

## Objectives

- make the lead workspace the primary installer working environment;
- let authenticated installers capture a minimum enquiry and continue directly in that workspace;
- expose existing capabilities coherently rather than redesigning them;
- add the minimum tenant-safe work-item foundation;
- make installer notes durable and attributed;
- provide source-aware activity and document projections;
- prove responsive, accessible, secure pilot use;
- preserve small PRs, backwards compatibility, tenant isolation, auditability, and immutable evidence.

## Approval State And Implementation Authorisation

1. Master Specification: Approved.
2. Six feature specifications: Approved.
3. ADR-0020: Accepted and unchanged.
4. ADR-0021: Accepted with final origin, completeness, migration, attribution, permission, duplicate, follow-up, note, privacy, and stop-condition decisions.
5. Sprint sequence: Approved.
6. CTO architecture approval: Approved.
7. CEO/product approval: Approved.
8. Implementation authorisation: PRs 1-6 in sequence after PR #34 merges and their gates pass; PR 7 separately blocked; PR 8 follows the approved sequence.
9. PR 1 is merged as PR #35; PR 2 implementation and disposable verification are in progress on its dedicated branch.

## Feature Specifications

- [Unified Lead Workspace](../04-features/FEAT-PLATFORM-1-5-UNIFIED-LEAD-WORKSPACE.md)
- [Manual Lead Creation](../04-features/FEAT-PLATFORM-1-5-MANUAL-LEAD-CREATION.md)
- [Task Management Foundation](../04-features/FEAT-PLATFORM-1-5-TASK-MANAGEMENT-FOUNDATION.md)
- [Installer Notes](../04-features/FEAT-PLATFORM-1-5-INSTALLER-NOTES.md)
- [Timeline And Activity History](../04-features/FEAT-PLATFORM-1-5-TIMELINE-AND-ACTIVITY-HISTORY.md)
- [Customer Document Centre](../04-features/FEAT-PLATFORM-1-5-CUSTOMER-DOCUMENT-CENTRE.md)

## Architecture Decisions

- [ADR-0020: Organisation-Owned Work Items And Lead Task Proving Slice](../05-decisions/ADR-0020-organisation-owned-work-items.md) remains Accepted.
- [ADR-0021: Lead Creation Origin And Progressive Completeness](../05-decisions/ADR-0021-lead-creation-origin-and-progressive-completeness.md) is Accepted and governs Manual Lead Creation PR 2.
- Existing ADR-0005, ADR-0008, ADR-0009, ADR-0010, ADR-0013, ADR-0014, ADR-0015, ADR-0016, and ADR-0017 remain in force.

## Approved PR Sequence

### PR 1 - Canonical Lead Workspace Shell

Outcome:

- canonical route, authenticated shell, persistent summary, lead-local navigation, Overview composition, legacy redirects, truthful states, and responsive/accessibility foundation;
- stable `New Lead` entry point may be present but must not enable creation before PR 2.

Constraints and evidence:

- no schema migration or new task/document/timeline persistence;
- existing protected services remain authoritative;
- route/redirect, tenant query, desktop/390 px, keyboard/focus/zoom, and bounded-query evidence.

### PR 2 - Manual Lead Creation

Outcome:

- authenticated `New Lead` flow requiring name plus phone or email;
- optional address, Eircode, restrained source, follow-up, same-organisation assignee, and append-only initial note through the existing activity/audit contract;
- additive source/progressive-completeness data migration approved through ADR-0021;
- derived action gates for eligibility, recommendations, readiness, consent-dependent processing, and governed document generation;
- field-by-field `Lead` migration/consumer table and legacy-assignee compatibility/retirement plan;
- protected, idempotent create service with workflow, activity, audit, and canonical-workspace redirect;
- bounded same-tenant duplicate warning.

Constraints and evidence:

- follow Accepted ADR-0021 and the Approved Manual Lead Creation specification without weakening public intake;
- no homeowner qualification, synthetic facts, new intake aggregate, merge, bulk import, enrichment, CRM sync, AI creation, messaging, configurable schema, or custom source taxonomy;
- migration fresh/production-baseline/rerun evidence and origin counts proving customer/consent facts unchanged;
- permission-catalogue review; tenant, actor, assignment, duplicate non-disclosure, idempotency, atomicity, action-gate, public-intake/portal/consumer regression, desktop/390 px, and accessibility evidence;
- Production enablement blocked until the ADR-0021 privacy gate is recorded complete.

### PR 3 - Work-Item Schema And Migration

Outcome:

- additive platform work-item model, permissions, constraints, indexes, and deterministic idempotent follow-up backfill.

Constraints and evidence:

- no task UI or fabricated history; preserve compatibility follow-up fields; allow only the lead adapter;
- Prisma, SQL, disposable PostgreSQL fresh/upgrade/rerun, tenant relation/assignee, and rollback evidence;
- manual-lead follow-ups create at most one corresponding open work item.

### PR 4 - Work-Item Service And Lead Tasks

Outcome:

- protected create/read/edit/assign/complete/reopen/cancel service, optimistic concurrency, atomic audit/activity, and lead-local Tasks UI.

Constraints and evidence:

- no recurrence, subtasks, dependencies, notifications, comments, boards, automation, or raw Prisma client contract;
- lifecycle/permission, tenant/inactive/tampered-context, concurrency/rollback, browser, and accessibility evidence.

### PR 5 - Installer Notes

Outcome:

- protected append-only note service, typed actor attribution, safe audit, Notes UI, quick-add, legacy compatibility, and consolidation of the PR 2 initial-note path without duplicating or migrating note records.

Constraints and evidence:

- plain text only; no edit/delete, mentions, attachments, customer visibility, or AI generation; bodies excluded from logs/audit;
- validation, permission, tenant, actor, atomicity, sanitisation, browser, mobile, and keyboard evidence.

### PR 6 - Source-Aware Timeline

Outcome:

- bounded timeline service, explicit source mappers, manual/homeowner creation labels, precedence/deduplication, stable pagination, filters, and Activity UI.

Constraints and evidence:

- no event-store table, raw audit metadata, or fabricated history;
- mapping/order/cursor/deduplication, tenant, simultaneous-time/legacy fixtures, responsive/accessibility, and query-plan evidence.

### PR 7 - Customer Document Centre

Hard prerequisite:

- do not begin until the missing Release 1.4 governed generated-document implementation completes its separately approved implementation PR sequence and is reviewed and merged into `main`;
- confirm the branch contains the authoritative ADR-0015/0016/0017 implementation before any Document Centre work starts.

Outcome:

- uploaded-evidence read model/actions and governed generated-document metadata/actions from the authoritative Release 1.4 implementation;
- source-specific grouping, status, counts, states, and timeline integration.

Constraints and evidence:

- no `LeadDocument` migration, unified table, generated-document substitute, partial Release 1.4 recreation, bytes in list queries, or immutable-evidence/portal-token changes;
- source mapping/count, permission/tenant, portal regression, ADR-0017 retrieval, responsive/accessibility, performance, and dependency evidence.

### PR 8 - Pilot Hardening And Release Close

Outcome:

- complete installer journey including manual capture, workspace, notes, tasks, timeline, and documents when PR 7 is unblocked;
- accessibility/mobile corrections, migration/deployment rehearsal, safe observability, support guidance, current-state records, validation, and sign-off.

Constraints and evidence:

- no unrelated expansion or redesign; no tag before release-close authorisation;
- full validation matrix, one pilot-organisation rehearsal, database status evidence, recovery prerequisites, and CTO/CEO release-close review.

## Cross-PR Review Rules

- Each PR has one primary outcome and explicit file scope.
- Schema, migration, service, and UI may split further only through an approved sequence update.
- Do not combine opportunistic refactors, dependency upgrades, or unrelated branding changes.
- Every protected boundary includes tenant, permission, and actor evidence.
- Every database PR includes fresh and upgrade migration evidence.
- Every UI PR includes desktop and 390 px evidence plus relevant accessibility checks.
- Documentation changes accompany the PR that changes reality.
- A later PR must not compensate for a known security or data-integrity defect in an earlier PR.

## Migration And Deployment Sequence

1. Confirm recorded CTO and CEO approval, merge documentation PR #34, and record the approved head.
2. Land PR 1 without schema change.
3. Apply Accepted ADR-0021, complete its field/consumer and permission gates, then validate and deploy the additive manual-lead migration before PR 2 code that depends on it.
4. Regression-test public intake and portal behaviour before enabling manual creation for one pilot organisation.
5. Deploy PR 3 work-item schema before PR 4 services/UI; verify idempotent follow-up backfill without customer data in logs.
6. Land PRs 5 and 6 in sequence and verify source-aware activity.
7. Confirm backup/PITR and recovery gates before any Production data change.
8. Separately complete, review, and merge the approved Release 1.4 generated-document implementation sequence.
9. Only then branch and implement PR 7 using the authoritative ADR-0015/0016/0017 capability.
10. Complete PR 8 hardening, support, deployment, and release-close evidence.

## Release Validation Matrix

| Area | Required evidence |
| --- | --- |
| Documentation | Metadata, internal links, COM navigation, placeholders, approval consistency, documentation-only scope, diff check. |
| Schema | Prisma format/validate/generate and migration SQL review. |
| Migration | Fresh database, approved-baseline upgrade, rerun idempotency, unknown-field integrity, guarded status. |
| Unit | Manual input/origin, view models, task lifecycle, timeline/document mapping, note validation. |
| Integration | Permissions, tenant isolation, actor attribution, audit, duplicate non-disclosure, idempotency, concurrency, rollback. |
| Regression | Public intake, consent/eligibility, jurisdiction, portal, workflow, existing documents, truthful unknown states. |
| Browser | Login; create lead; redirect; navigate; note; task; timeline; document; stage; back/forward. |
| Responsive/accessibility | 390 px, keyboard, focus, headings, names, error/status announcement, contrast, zoom, touch targets. |
| Performance | Bounded duplicate lookup, queries/pages, and representative pilot evidence. |
| Deployment | Preview rehearsal, Production change reference, status before/after, recovery gate. |

## Stop Conditions

Stop and return to CTO review when:

- any implementation begins before the amended documentation is approved and PR #34 merges;
- PR 2 relies on fabricated qualification/consent data or omits its required field/consumer table, permission review, legacy-assignee plan, action gates, or migration evidence;
- public intake validation is weakened by progressive-completeness persistence changes;
- the schema cannot evolve additively without unsafe data loss or a current consumer cannot safely handle nullable qualification fields;
- historical origin cannot be determined truthfully under ADR-0021;
- duplicate lookup or assignment can cross the trusted organisation boundary;
- atomic creation of required lead, workflow, activity/note, and audit evidence cannot be guaranteed;
- permissions require unreviewed access broadening;
- privacy review is incomplete when Production enablement is proposed;
- Release 1.5 PR 7 is proposed, branched, or started before the separate Release 1.4 implementation sequence is approved, completed, reviewed, and merged;
- any Release 1.5 work substitutes for, duplicates, or partially recreates ADR-0015/0016/0017 architecture;
- uploaded evidence is merged with governed generated documents;
- a protected path cannot guarantee server-derived tenant/actor context;
- migration cannot be idempotent and application-rollback-compatible;
- customer, note, task, or duplicate-candidate data would enter logs or audit metadata;
- the timeline requires raw audit exposure or a new event store;
- scope expands into deferred CRM, collaboration, automation, messaging, scheduling, or project-management features;
- required recovery/deployment evidence is unavailable for a Production data change.

## Definition Of Done

This documentation is ready for final pre-merge review when all six Approved features, the Approved Master and sprint plan, Accepted ADR-0020 and ADR-0021, eight-PR sequence, PR 2 gates, PR 7 dependency, and no-implementation state agree and validate. Release 1.5 is done only after all authorised PRs are merged, PR 7's dependency is satisfied before it starts, acceptance evidence passes, current-state documentation matches reality, release-close approval is recorded, and a tag is explicitly authorised.

## Related Documents

- [Platform Release 1.5 Master Specification](../release-specifications/PLATFORM_RELEASE_1_5_LEAD_WORKSPACE_AND_DOCUMENT_MANAGEMENT.md)
- [Manual Lead Creation](../04-features/FEAT-PLATFORM-1-5-MANUAL-LEAD-CREATION.md)
- [ADR-0020](../05-decisions/ADR-0020-organisation-owned-work-items.md)
- [ADR-0021](../05-decisions/ADR-0021-lead-creation-origin-and-progressive-completeness.md)
- [Release Lifecycle](../release-governance/RELEASE_LIFECYCLE.md)
- [CTO Review Checklist](../release-governance/CTO_REVIEW_CHECKLIST.md)
- [Database Operations Runbook](../03-engineering/DATABASE_OPERATIONS_RUNBOOK.md)
