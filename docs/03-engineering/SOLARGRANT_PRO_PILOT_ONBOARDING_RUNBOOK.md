# SolarGRANT Pro Pilot Organisation Onboarding Runbook

| Field | Value |
| --- | --- |
| Document ID | ENG-SGP-PILOT-ONBOARDING-001 |
| Status | Proposed |
| Owner | Clada Systems Engineering and Operations |
| Review cycle | Before every pilot onboarding and after any incident |
| Last reviewed | 2026-07-24 |

## Status and prerequisites

The dry-run-first `pnpm tenant:provision` service and command, canonical idempotency, strict conflicts, transactional tenant creation, fixed credential expiry state, fake/test delivery adapter, secret-free audit/output contract, 30-minute restricted first-login session, forced password replacement, atomic owner/organisation activation, and all-session rotation are implemented. PR #30 adds the dry-run-first `pnpm tenant:recover` inspection, credential-reissue, suspension, and reactivation commands. Real transactional email, Production execution, owner replacement, and end-to-end Production smoke validation remain deferred. Do not onboard an external pilot until every [readiness gate](#pilot-readiness-gate) passes. The legacy `pnpm pilot:provision` command is described in [pilot authentication](PILOT_AUTHENTICATION.md) and is not a substitute.

The [Production legacy credential reissue
runbook](PRODUCTION_LEGACY_CREDENTIAL_REISSUE_RUNBOOK.md) addresses only an
already-active legacy pilot owner after an incident-specific read-only
classification. It must not be used for onboarding, tenant repair, owner
replacement, or general password reset. Although deployed, it remains blocked
pending owner approval of a fresh dry-run plan and separate execution change.

Provisioning is a Clada OS capability; this runbook defines its SolarGRANT Pro product use. Architecture and security rules live in [Clada OS tenant provisioning architecture](../01-platform/TENANT_PROVISIONING_ARCHITECTURE.md).

## Approved input

Patrick McKenna is the initial business approver. He must provide approved customer status, legal/trading organisation name, owner full name and email, `ORGANISATION_OWNER`, persistent unique lowercase kebab-case Installer slug, cohort/notes, and explicit Production-access confirmation. `approvedBy` must be Patrick's durable authenticated Clada internal user ID, not his name or free text. Use fictional data in rehearsals, such as Harbour Solar Ltd and `aoife@harbour-solar.example`.

## Operator workflow

1. Patrick approves the pilot and opens a dedicated Codex task with the approved non-secret details.
2. Codex checks clean repository state, approved revision, correct environment classification/fingerprint, and absence of secrets in input/output.
3. Codex runs the standard command with `--dry-run` and a unique idempotency key.
4. Codex reports the secret-free plan or stops on conflicts without changing data.
5. Patrick reviews and explicitly approves that exact plan for Production.
6. Codex runs the same command with the same input digest/key and `--confirm-production`.
7. Codex verifies exactly one organisation, Installer, user/reuse decision, and owner membership; validates lifecycle/expiry/audit state; and runs isolation checks.
8. Codex returns only the safe result defined by the architecture.
9. The approved transactional-email `CredentialDeliveryAdapter` delivers the temporary credential directly to the owner and returns only a safe provider delivery receipt. Patrick and Codex never receive the plaintext credential.
10. The owner signs in to a 30-minute restricted session and is forced to replace the credential.
11. Successful replacement atomically activates the owner and organisation, then issues a normal 12-hour session and opens the truthful empty dashboard.
12. Patrick confirms activation, records onboarding completion, and continues the pilot.

Codex must not improvise SQL for normal onboarding. A missing command or unsupported conflict is a blocker requiring engineering/operator review.

## Owner experience

The owner receives plain-language instructions directly from the approved transactional-email adapter, opens the Production login page, enters the approved email and 24-hour temporary credential, and sees a clear requirement to choose a new password. They enter the current credential, new password, and confirmation with visible requirements. Successful submission activates the owner and organisation, shows confirmation, then enters SolarGRANT Pro with a new normal 12-hour session.

The initial dashboard contains no data from any other tenant, truthful zero/empty metrics, exactly one primary **Open intake** action, and a copyable tenant-scoped intake link. Implementation terminology such as membership, provisioning operation, or credential hash is never customer-facing.

Mobile layout must support password managers, visibility toggles, touch targets, and no horizontal scrolling. Labels, focus order, keyboard operation, error association, status announcements, contrast, and reduced-motion behaviour must meet the repository accessibility standard. Errors preserve non-secret form state, identify policy failures clearly, never distinguish whether an account exists, and never expose tenant/security details.

## Smoke tests

### Provisioning

- Dry-run changes no rows; execution creates each organisation/Installer/membership at most once.
- User create/reuse follows the reviewed plan; owner role is correct; no Clada internal membership is added.
- After provisioning, organisation is `PROVISIONING`, owner is `INVITED`, `mustChangePassword=true`, the 24-hour expiry is set, required audit/delivery-receipt events exist, and reruns create no duplicates.
- If activation is cancelled, the credential and sessions are revoked and the never-activated organisation is archived without deleting tenant records.

### Authentication

- Login loads; invalid and expired credentials fail generically with no `503` under normal invalid input.
- A valid temporary credential produces only the restricted flow.
- The restricted session expires after 30 minutes, has no refresh, and cannot become normal through refresh; re-login works while the 24-hour credential remains valid.
- Dashboard, leads, quotes, admin, protected APIs, intake management, and refresh cannot bypass password change.
- Valid password change succeeds; organisation/owner become `ACTIVE`; old credential fails; new password works; a new normal 12-hour session is issued; refresh and logout work.

### Tenant and product

- Dashboard is empty and metrics are persisted zero/truthful values with no synthetic data.
- No Demo Solar, Clada internal, or other-tenant lead is visible through UI, API, direct identifiers, exports, documents, or activities.
- Exactly one primary **Open intake** action exists; copy link resolves to the correct Installer.
- A labelled test intake creates one lead only for the new tenant and never appears for Demo Solar; remove/archive test data only through an approved cleanup procedure.
- Current deployment logs show no relevant authentication, Prisma, secret, or `5xx` error.

## Support and recovery

All actions require positive target identification, correct environment verification, an active Clada internal approver, dry-run first, audit evidence, and secret-free output. The implemented command is `pnpm tenant:recover <subcommand> --input <ignored-file.json> [--dry-run|--execute]`; mutations default to dry-run and reject Production. Inputs contain only non-secret organisation/Installer/owner identifiers, reason, approver ID, and idempotency key; `reactivate` additionally requires `targetType` set to `user` or `organisation`. Owner replacement is inspection/refusal-only and returns `MANUAL_REVIEW_REQUIRED`.

| Case | Authority and intended action | Audit event | Data/access impact and recovery | Never do |
| --- | --- | --- | --- | --- |
| Credential expired/lost | Patrick or an approved Clada internal operator runs `pnpm tenant:recover reissue-credential` in dry-run, then confirms the exact idempotent plan with `--execute`. | `CREDENTIAL_EXPIRED`, `CREDENTIAL_RESET` plus delivery receipt | Replace the only hash, revoke sessions, keep organisation `PROVISIONING`, and set a new 24-hour expiry. Delivery failure revokes the undelivered credential and records failed recovery. | Reveal/reset by SQL, print secret, or use a plaintext fallback. |
| Wrong email before activation | Approver verifies identity, revokes credential, runs reviewed identity correction/replacement. | reset plus user/membership repair event | Preserve tenant data; old identity loses access. | Mutate an ambiguous existing identity. |
| Forgotten new password/account locked | Verify requester and run password-reset/unlock workflow; revoke sessions. | `CREDENTIAL_RESET` or lock/recovery event | Data unchanged; access restored only after verification. | Assign a known shared password. |
| Organisation/Installer name correction | Customer authority plus operator runs metadata-update dry-run. | resource-updated event | Display metadata only; stable IDs/ownership remain. | Recreate tenant or move leads. |
| Owner replacement | Organisation authority; add/verify replacement owner before suspending/removing former owner. | `OWNER_ASSIGNED`, suspension event | Never leave zero active owners; data remains tenant-owned. | Transfer leads or silently move membership. |
| Second owner later | Organisation authority; use invite/add-owner command after role scope is approved. | `MEMBERSHIP_CREATED`, `OWNER_ASSIGNED` | Adds access; no ownership move. | Public membership creation. |
| User suspension/reactivation | Clada internal operator runs `suspend-user` or `reactivate` with an active approver, reason, idempotency key, and explicit execution. | `USER_SUSPENDED`/`USER_REACTIVATED`, sessions invalidated | Blocks/restores only approved lifecycle states; preserves data and never bypasses first login. | Delete user, target an unrelated tenant, or activate an expired invitation directly. |
| Organisation suspension/reactivation | Clada internal operator runs `suspend-organisation` or `reactivate` with positive target verification. | `ORGANISATION_SUSPENDED`/`ORGANISATION_REACTIVATED`, sessions invalidated | Blocks/restores all tenant access only when owner and tenant state are valid; preserves data. | Toggle verification, use `ARCHIVED` as a substitute, or edit DB ad hoc. |
| Pilot cancellation/archive | Patrick approves suspension, then archive when obligations permit. | suspension, `ORGANISATION_ARCHIVED` | Access off; records retained under policy. | Cascade-delete the organisation. |
| Customer deletion request | Privacy/legal authority performs identity verification, retention/legal-hold review, scoped export/erasure plan. | privacy-request events | May require irreversible erasure after approval; document recovery limits. | Promise or run immediate deletion from support chat. |

Restricted-session or password-change failure leaves the owner `INVITED` and organisation `PROVISIONING`; retry after validation or use the reviewed credential-reissue flow while the 24-hour credential remains valid. Deployment or Production smoke-test failure stops onboarding, revokes/suspends access if exposure is possible, preserves evidence, and follows the release incident process. Every mutating recovery operation is serializable and idempotent: exact completed replay returns the safe prior result, while changed input, incomplete replay, or lifecycle drift is refused. Patrick's explicit approval remains required for owner replacement, archival, identity repair, cross-organisation/internal-account conflicts, and deletion escalation until delegated authority is implemented.

## Disposable pilot rehearsal (PR #31)

The repeatable `pnpm pilot:rehearsal` harness validates the complete onboarding and recovery lifecycle without enabling Production. It uses synthetic `.example.test` identities, the existing fake/test delivery adapter, and a positively identified local disposable PostgreSQL database. It never connects to Preview, Staging, shared Development, or Production.

### Prerequisites

- `APP_ENV=test` and `DATABASE_ENVIRONMENT=test`.
- `DATABASE_URL` points to the local disposable PostgreSQL database used only for this rehearsal.
- `DATABASE_FINGERPRINT` matches the database URL, and the known Production, Preview, and Development fingerprints are supplied.
- `DATABASE_BRANCH_ID` identifies the disposable branch; `AUTH_SESSION_PEPPER` is a test-only value of at least 32 characters.
- All migrations are applied before execution. Do not use real installer, homeowner, phone, email, credential, or Production data.

### Command and expected result

Run the safety-only plan first:

```bash
pnpm pilot:rehearsal --dry-run
```

After reviewing the safe plan, run the disposable rehearsal:

```bash
pnpm pilot:rehearsal --execute
```

The command returns structured secret-free output and writes JSON/Markdown evidence only under the Git-ignored `.tools/pilot-rehearsal/` directory. Reports contain the rehearsal ID, disposable fingerprint, synthetic IDs, completed stages, safe operation IDs, audit counts, cleanup status, and remaining readiness gaps. They never contain credentials, hashes, tokens, cookies, connection strings, or environment values.

### Lifecycle stages

The rehearsal creates one synthetic Clada internal operator and installer organisations A and B, provisions owners through `tenant:provision`, verifies the 24-hour hash-backed temporary credential, authenticates the restricted first-login session, confirms normal access is blocked, completes password replacement and activation, and creates synthetic tenant-owned records. It then proves both directions of tenant isolation, restricted-session isolation, suspended-user and inactive-organisation denial, stale-session invalidation, user/organisation suspension and approved reactivation, credential expiry, 24-hour credential reissue, restricted re-login, exact replay, delivery failure revocation, transaction rollback, duplicate and idempotency conflicts, stale lifecycle refusal, inactive-approver refusal, cross-tenant target refusal, and the safe audit chain. Synthetic rows are removed in cleanup even when a rehearsal stage fails; cleanup failure is itself a failed result.

### Evidence and prohibitions

Retain only the sanitised rehearsal report and pass/fail summary needed for readiness review. Never retain a temporary credential, password, password hash, session token, cookie, database URL, provider secret, or environment file. Production execution, real transactional email, owner transfer, GDPR workflows, and external pilot onboarding remain prohibited until the separate pilot-readiness approval is recorded.

## Pilot readiness gate

The first external pilot is blocked until:

- architecture and ADR are approved;
- self-service password reset is implemented under FEAT-PRE-PILOT-AUTH-001 and ADR-0023;
- reset-email delivery and the approved sender identity are verified;
- Preview functional, accessibility, privacy, abuse, tenant-isolation, token-leakage, and security acceptance pass;
- the Production deployment and a controlled reset smoke are verified while normal login remains healthy;
- the ADR-0022 guarded administrator recovery runbook remains operational;
- no unresolved Critical or pilot-blocking High authentication issue remains;
- the repository command, dry-run, exact-plan Production confirmation, transaction, idempotency, conflict tests, and audit logging exist;
- secure generation, approved non-logged credential delivery, expiry, and log-redaction tests exist;
- forced password change and non-bypass route/API guards work;
- session rotation, tenant-isolation tests, and truthful empty dashboard pass;
- recovery commands/procedures exist and have passed disposable-data rehearsal;
- a disposable organisation completes end-to-end onboarding and rollback/recovery rehearsal;
- Production smoke tests and this runbook are validated.

## Safe completion report

Report organisation/Installer IDs and names, owner name/email, role, operation ID/status, intake URL, forced-change/expiry status, audit confirmation, smoke results, and deployment status. Never report credential/token/hash/cookie/header material, database or provider secrets, or environment contents.

## Related documents

- [Tenant provisioning architecture](../01-platform/TENANT_PROVISIONING_ARCHITECTURE.md)
- [Implementation plan](TENANT_PROVISIONING_IMPLEMENTATION_PLAN.md)
- [Database operations](DATABASE_OPERATIONS_RUNBOOK.md)
- [Truthful dashboard empty states](../product/implementation/TRUTHFUL_DASHBOARD_EMPTY_STATES.md)
- [ADR-0019](../05-decisions/ADR-0019-standardised-tenant-provisioning.md)
- [Self-service password reset](../04-features/FEAT-PRE-PILOT-SELF-SERVICE-PASSWORD-RESET.md)
- [ADR-0023](../05-decisions/ADR-0023-self-service-password-reset-security-boundary.md)
