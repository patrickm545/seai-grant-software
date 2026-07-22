# Platform Release 1.5 - Lead Workspace And Document Management Sprint Plan

| Field | Value |
| --- | --- |
| Document ID | SPRINT-PR1-5 |
| Status | Proposed |
| Owner | Clada Systems Product and Engineering |
| Review cycle | Each Release 1.5 implementation sprint and at release close |
| Last reviewed | 2026-07-22 |

## Purpose

Translate the amended Release 1.5 Master Specification into eight small, sequenced implementation PRs. Manual Lead Creation is now explicit scope. The previous CTO and CEO approval is superseded by this material scope amendment; documentation approval and implementation authorisation are Pending. No Release 1.5 implementation has begun.

## Baseline And Dependency Decision

The documentation baseline remains `main` merge commit `9828af1` from PR #33. PR #34 is a documentation-only draft.

The amended dependency rules are explicit:

- no implementation PR is authorised until PR #34 is re-approved and merged;
- Release 1.5 PRs 1-6 may then proceed in sequence from the approved `main` baseline, subject to their documented gates;
- Release 1.5 PR 7 must not begin until the missing Release 1.4 governed generated-document implementation completes its own separately approved implementation PR sequence and is reviewed and merged into `main`;
- existing uploaded `LeadDocument` evidence may surface earlier only where an approved PR 1-6 workspace scope requires it, and it must be labelled as uploaded evidence;
- no Release 1.5 PR may create a generated-document substitute or duplicate or partially recreate architecture governed by ADR-0015, ADR-0016, and ADR-0017.

The previous approval record remains historical evidence, but it no longer authorises implementation because the release scope, data model, and sequence have changed.

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

1. Master Specification: Proposed.
2. Six feature specifications: Proposed.
3. ADR-0020: Accepted and unchanged.
4. ADR-0021: Proposed; acceptance is required before Manual Lead Creation implementation.
5. Sprint sequence: Proposed.
6. CTO architecture re-review: Pending.
7. CEO/product re-approval: Pending.
8. Implementation authorisation: Pending; no PR 1-8 implementation may begin yet.
9. No implementation has begun.

## Feature Specifications

- [Unified Lead Workspace](../04-features/FEAT-PLATFORM-1-5-UNIFIED-LEAD-WORKSPACE.md)
- [Manual Lead Creation](../04-features/FEAT-PLATFORM-1-5-MANUAL-LEAD-CREATION.md)
- [Task Management Foundation](../04-features/FEAT-PLATFORM-1-5-TASK-MANAGEMENT-FOUNDATION.md)
- [Installer Notes](../04-features/FEAT-PLATFORM-1-5-INSTALLER-NOTES.md)
- [Timeline And Activity History](../04-features/FEAT-PLATFORM-1-5-TIMELINE-AND-ACTIVITY-HISTORY.md)
- [Customer Document Centre](../04-features/FEAT-PLATFORM-1-5-CUSTOMER-DOCUMENT-CENTRE.md)

## Architecture Decisions

- [ADR-0020: Organisation-Owned Work Items And Lead Task Proving Slice](../05-decisions/ADR-0020-organisation-owned-work-items.md) remains Accepted.
- [ADR-0021: Lead Creation Origin And Progressive Completeness](../05-decisions/ADR-0021-lead-creation-origin-and-progressive-completeness.md) is Proposed because the existing required `Lead` shape cannot truthfully store a minimum manual enquiry.
- Existing ADR-0005, ADR-0008, ADR-0009, ADR-0010, ADR-0013, ADR-0014, ADR-0015, ADR-0016, and ADR-0017 remain in force.

## Proposed PR Sequence

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
- protected, idempotent create service with workflow, activity, audit, and canonical-workspace redirect;
- bounded same-tenant duplicate warning.

Constraints and evidence:

- ADR-0021 and the Manual Lead Creation feature must be approved before implementation;
- no homeowner qualification, synthetic facts, new intake aggregate, merge, bulk import, enrichment, CRM sync, AI creation, messaging, configurable schema, or custom source taxonomy;
- migration fresh/upgrade/rerun evidence; permission, tenant, actor, assignment, duplicate non-disclosure, idempotency, atomicity, public-intake/portal regression, desktop/390 px, and accessibility evidence.

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

1. Obtain CTO and CEO re-approval, merge documentation PR #34, and record the approved head.
2. Land PR 1 without schema change.
3. Accept ADR-0021, then validate and deploy the additive manual-lead migration before PR 2 code that depends on it.
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
- PR 2 begins before ADR-0021 is accepted or relies on fabricated qualification/consent data;
- public intake validation is weakened by progressive-completeness persistence changes;
- duplicate lookup or assignment can cross the trusted organisation boundary;
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

This documentation amendment is ready for CTO re-review when all six Proposed features, the Proposed Master and sprint plan, Accepted ADR-0020, Proposed ADR-0021, eight-PR sequence, PR 7 dependency, approval supersession, and no-implementation state agree and validate. Release 1.5 is done only after all authorised PRs are merged, PR 7's dependency is satisfied before it starts, acceptance evidence passes, current-state documentation matches reality, release-close approval is recorded, and a tag is explicitly authorised.

## Related Documents

- [Platform Release 1.5 Master Specification](../release-specifications/PLATFORM_RELEASE_1_5_LEAD_WORKSPACE_AND_DOCUMENT_MANAGEMENT.md)
- [Manual Lead Creation](../04-features/FEAT-PLATFORM-1-5-MANUAL-LEAD-CREATION.md)
- [ADR-0020](../05-decisions/ADR-0020-organisation-owned-work-items.md)
- [ADR-0021](../05-decisions/ADR-0021-lead-creation-origin-and-progressive-completeness.md)
- [Release Lifecycle](../release-governance/RELEASE_LIFECYCLE.md)
- [CTO Review Checklist](../release-governance/CTO_REVIEW_CHECKLIST.md)
- [Database Operations Runbook](../03-engineering/DATABASE_OPERATIONS_RUNBOOK.md)
