# Platform Release 1.5 PR 2 - Validation And Deployment Record

| Field | Value |
| --- | --- |
| Document ID | ENG-PLATFORM-1.5-PR2-VALIDATION |
| Status | Draft PR evidence |
| Owner | SolarGRANT Pro Engineering |
| Last reviewed | 2026-07-23 |

## Scope And Baseline

- Starting branch: `main`.
- Required and observed starting SHA: `3cd9ded8cc93a98ed1a0136ba13d4cc9bf63e7fd`.
- PR #35: merged at that SHA.
- Feature branch: `codex/platform-release-1-5-pr2-manual-lead-creation`.
- Canonical new route: `/installer-review-emerald/leads/new`.
- Field/consumer record: [Platform Release 1.5 PR 2 Lead Field And Consumer Migration](PLATFORM_RELEASE_1_5_PR2_LEAD_FIELD_CONSUMER_MIGRATION.md).

## Database And Migration Evidence

Only an isolated disposable local PostgreSQL 16 container was used. No Production, Preview, persistent Development, or repository `prisma/dev.db` database was migrated or queried.

- Fresh database: the repository guard accepted fingerprint `db_f634744f8defc5bb`; Prisma applied all 15 migrations in order (the existing 14 plus `20260722190000_manual_lead_creation`).
- PostgreSQL integration: 47 tests passed, including PR 2 permission, trusted tenant/actor, assignment, idempotency, atomic record-set, forced mid-transaction rollback, safe audit, and duplicate isolation cases.
- Approved-baseline upgrade: all 14 baseline migrations were applied to a second disposable database before the PR 2 migration.
- Evidence-only origin fixture aggregate after upgrade: `HOMEOWNER_INTAKE=1`, `MANUAL_INSTALLER=1`, `LEGACY_UNKNOWN=1`. Fixtures were synthetic and output contained aggregate counts only.
- Fact integrity: aggregate hash comparison reported `changed_fact_rows=0` across customer, qualification, and consent facts.
- Backfill rerun: the exact guarded `WHERE creationOrigin IS NULL` statement reported `UPDATE 0`; origin aggregates stayed 1/1/1 and `changed_fact_rows=0`.
- Fresh database historical-origin count before tests: zero rows in every origin because migrations seed no customer leads.
- Application rollback: migration is additive except accepted nullability/default relaxation. A database-only `LEGACY_UNKNOWN` origin default lets the approved baseline binary continue inserting while rolled back; the current Prisma schema remains default-free so every current application write must explicitly choose `HOMEOWNER_INTAKE` or `MANUAL_INSTALLER`. Legacy assignment/follow-up fields remain and origin/attribution/index columns are ignored by old code. Manual rows must remain behind the privacy/enablement gate during rollback because old presentation code was not designed to qualify them.

## Permission, Tenant, Actor And Transaction Evidence

- `lead.create`: owner, admin, member and Clada internal admin. It does not imply update, assignment, status change, export, or deletion.
- `lead.assign`: separately required before assignee lookup or creation.
- `lead.read`: separately required before duplicate summaries.
- Organisation, Installer, user, membership and actor come from the authenticated server context. The strict input schema rejects unknown client keys.
- Assignee query requires active membership, active user and exact trusted organisation.
- One Prisma transaction creates the `Lead`, `NEW_LEAD` workflow instance, `LEAD_CREATED` activity, optional `NOTE_ADDED` activity, and `lead.created` audit event. Follow-up and assignment are columns on the same lead write.
- Exact replay returns the original lead. A unique request token plus SHA-256 canonical-input hash rejects a changed-payload replay and resolves concurrent unique-key races without creating a second lead.
- Audit metadata contains only safe identifiers/classifications and boolean presence flags. Tests prove it excludes name, contact details, address, Eircode, note body and duplicate candidates.

## Duplicate And Performance Evidence

- One tenant-scoped `Lead.findMany` query per warning check.
- Maximum returned candidates: 5.
- Exact indexed signals only: `normalisedEmail`, `normalisedPhone`, `normalisedEircode`.
- Selected columns only: `id`, `fullName`, `createdAt`, and the three normalised comparison columns.
- No document bytes, document/activity collections, audit rows, notes, or unrelated lead collections are selected.
- The create service performs two bounded context lookups in parallel (Installer and optional assignee), an idempotency lookup, then a single transaction. Workflow definition/stage checks use existing indexed service queries. No per-candidate or per-assignee loop query is present.
- Disposable local PostgreSQL integration timing for the combined create/replay/duplicate/assertion case was about 240 ms; this is synthetic local evidence, not a Production latency claim.

## Qualification And Existing-Consumer Evidence

Action-specific gates cover grant eligibility, quote/recommendation, grant readiness, consent-dependent processing, and governed document generation. Unknown booleans remain missing rather than false. Governed generation remains blocked because the Release 1.4 runtime capability is absent. The canonical workspace shows manual origin, `Qualification incomplete`, unassigned/assigned membership, supplied contact facts, and no eligibility/consent claim.

The strict homeowner intake schema is unchanged. Public intake now explicitly writes `HOMEOWNER_INTAKE` and exact-match normalisation columns after all existing validation/jurisdiction checks. It continues to create its portal token, qualification result, quote snapshots, workflow, activities, audit and notifications. Manual creation performs none of those homeowner-only side effects.

## Toolchain And Automated Validation

The lockfile declares pnpm 10.11.0 and the package declares Node 22.x. Frozen installation passed with pnpm 10.11.0. The available machine and bundled runtime both supplied Node 24.14.1, so commands reported an engine warning; this discrepancy is recorded rather than hidden.

- Frozen dependency installation: passed; lockfile unchanged.
- Prisma format: passed.
- Prisma generate: passed.
- Prisma validate: passed with a disposable PostgreSQL-format URL; no connection was required.
- Typecheck: passed.
- Unit/platform tests: 169 passed.
- PostgreSQL integration tests: 47 passed.
- Fresh and baseline-upgrade migration: passed as described above.
- Production build: passed and included `/installer-review-emerald/leads/new`.
- Lint: passed.

## Browser, Responsive And Accessibility Evidence

The in-app browser exercised the local application against the same isolated disposable PostgreSQL container used for PR verification. All records and credentials were synthetic; the server, logs, launcher and container were removed after the run.

- Authenticated owner navigation exposed one `New Lead` action and the canonical route.
- Empty submission showed field-level recovery guidance.
- Phone-only, email-only, and phone-plus-email creation all redirected to the canonical workspace.
- Optional address, Eircode, allowlisted source, follow-up date, membership assignee and initial internal note persisted and rendered truthfully.
- Exact duplicate warning showed one tenant-local safe summary, `Review match` reached the existing lead, and `Create anyway` produced one separate lead.
- The workspace showed `Manually entered`, `Qualification incomplete`, `Not assessed`, `Pending review`, unknown consent/eligibility facts and no automatic portal invitation or customer message.
- Back, forward, reload and direct navigation retained the expected canonical routes. A signed-out direct request to the create route redirected to `/login?next=%2Finstaller-review-emerald%2Fleads%2Fnew`.
- Desktop, 390-pixel mobile and 200% zoom checks retained readable content and controls without horizontal document overflow. Keyboard focus reached the back navigation and form controls in document order; controls exposed usable accessible names.
- A fresh console pass after adding the Next.js scroll-behaviour declaration reported no warnings or errors. No hydration failure was observed.

## Repository And Document Guard Evidence

The final guard pass covered 13 changed documentation files and 52 changed/new files overall.

- Metadata tables: complete for every changed durable document.
- `docs/SUMMARY.md`: both PR 2 engineering records included.
- Relative documentation links: no unresolved targets.
- Placeholder, prohibited tracked-file, secret-pattern, tracked environment-file, local-path and generated-output scans: no findings.
- Dependency manifest and lockfile: unchanged.
- `git diff --check`: passed.

## Privacy And Enablement Gate

Incomplete and fail-closed. No authoritative repository record approves installer-facing wording, purpose/lawful basis, retention/deletion, follow-up contact, access/correction, sensitive-note treatment, and pilot data-minimisation guidance. The implementation may be reviewed and tested outside Production, but must not be Production-enabled on test success alone.

## Out-Of-Scope Confirmation

No work-item/task schema, task service/UI, full Notes service/UI, source-aware timeline, Customer Document Centre, generated-document substitute, bulk import, merge, fuzzy/global duplicate search, CRM sync, enrichment, AI creation, messaging, notification, portal invitation, configurable source taxonomy, dependency upgrade, or PR 3+ implementation is included.
