# SolarGRANT Pro Pilot Organisation Onboarding Runbook

| Field | Value |
| --- | --- |
| Document ID | ENG-SGP-PILOT-ONBOARDING-001 |
| Status | Proposed |
| Owner | Clada Systems Engineering and Operations |
| Review cycle | Before every pilot onboarding and after any incident |
| Last reviewed | 2026-07-17 |

## Status and prerequisites

This is the target operator runbook. The target command, forced password change, expiry, recovery commands, and secure secret handoff are not implemented. Do not onboard an external pilot with this process until every [readiness gate](#pilot-readiness-gate) passes. The currently implemented `pnpm pilot:provision` is described in [pilot authentication](PILOT_AUTHENTICATION.md) and is not a substitute.

Provisioning is a Clada OS capability; this runbook defines its SolarGRANT Pro product use. Architecture and security rules live in [Clada OS tenant provisioning architecture](../01-platform/TENANT_PROVISIONING_ARCHITECTURE.md).

## Approved input

Patrick or a formally delegated approver must provide approved customer status, legal/trading organisation name, owner full name and email, `ORGANISATION_OWNER`, Installer display name and slug, optional mobile number for separate credential delivery, cohort/notes, and explicit Production-access confirmation. Use fictional data in rehearsals, such as Harbour Solar Ltd and `aoife@harbour-solar.example`.

## Operator workflow

1. Patrick approves the pilot and opens a dedicated Codex task with the approved non-secret details.
2. Codex checks clean repository state, approved revision, correct environment classification/fingerprint, and absence of secrets in input/output.
3. Codex runs the standard command with `--dry-run` and a unique idempotency key.
4. Codex reports the secret-free plan or stops on conflicts without changing data.
5. Patrick reviews and explicitly approves that exact plan for Production.
6. Codex runs the same command with the same input digest/key and `--confirm-production`.
7. Codex verifies exactly one organisation, Installer, user/reuse decision, and owner membership; validates lifecycle/expiry/audit state; and runs isolation checks.
8. Codex returns only the safe result defined by the architecture.
9. Patrick sends the login URL/email and the temporary credential through separate approved channels. Codex never returns the credential in chat or terminal output.
10. The owner signs in, is forced to replace the credential, and reaches the truthful empty dashboard.
11. Patrick confirms activation, records onboarding completion, and continues the pilot.

Codex must not improvise SQL for normal onboarding. A missing command or unsupported conflict is a blocker requiring engineering/operator review.

## Owner experience

The owner receives plain-language instructions, opens the Production login page, enters the approved email and temporary credential, and sees a clear requirement to choose a new password. They enter the current credential, new password, and confirmation with visible requirements. Successful submission shows confirmation, then enters SolarGRANT Pro with a rotated session.

The initial dashboard contains no data from any other tenant, truthful zero/empty metrics, exactly one primary **Open intake** action, and a copyable tenant-scoped intake link. Implementation terminology such as membership, provisioning operation, or credential hash is never customer-facing.

Mobile layout must support password managers, visibility toggles, touch targets, and no horizontal scrolling. Labels, focus order, keyboard operation, error association, status announcements, contrast, and reduced-motion behaviour must meet the repository accessibility standard. Errors preserve non-secret form state, identify policy failures clearly, never distinguish whether an account exists, and never expose tenant/security details.

## Smoke tests

### Provisioning

- Dry-run changes no rows; execution creates each organisation/Installer/membership at most once.
- User create/reuse follows the reviewed plan; owner role is correct; no Clada internal membership is added.
- `mustChangePassword=true`, expiry is set, required audit events exist, and reruns create no duplicates.

### Authentication

- Login loads; invalid and expired credentials fail generically with no `503` under normal invalid input.
- A valid temporary credential produces only the restricted flow.
- Dashboard, leads, quotes, admin, protected APIs, intake management, and refresh cannot bypass password change.
- Valid password change succeeds; old credential fails; new password works; the session is rotated; refresh and logout work.

### Tenant and product

- Dashboard is empty and metrics are persisted zero/truthful values with no synthetic data.
- No Demo Solar, Clada internal, or other-tenant lead is visible through UI, API, direct identifiers, exports, documents, or activities.
- Exactly one primary **Open intake** action exists; copy link resolves to the correct Installer.
- A labelled test intake creates one lead only for the new tenant and never appears for Demo Solar; remove/archive test data only through an approved cleanup procedure.
- Current deployment logs show no relevant authentication, Prisma, secret, or `5xx` error.

## Support and recovery

All actions require positive target identification, correct environment verification, an authorised approver, dry-run where supported, audit evidence, and secret-free output. Intended future command names below are contracts, not implemented commands.

| Case | Authority and intended action | Audit event | Data/access impact and recovery | Never do |
| --- | --- | --- | --- | --- |
| Credential expired/lost | Approved operator runs `credential reissue --dry-run`, then confirmed reissue through secure handoff. | `CREDENTIAL_EXPIRED`, `CREDENTIAL_RESET` | Revoke old authority; tenant data unchanged; new 24-hour expiry. | Reveal/reset by SQL or print secret. |
| Wrong email before activation | Approver verifies identity, revokes credential, runs reviewed identity correction/replacement. | reset plus user/membership repair event | Preserve tenant data; old identity loses access. | Mutate an ambiguous existing identity. |
| Forgotten new password/account locked | Verify requester and run password-reset/unlock workflow; revoke sessions. | `CREDENTIAL_RESET` or lock/recovery event | Data unchanged; access restored only after verification. | Assign a known shared password. |
| Organisation/Installer name correction | Customer authority plus operator runs metadata-update dry-run. | resource-updated event | Display metadata only; stable IDs/ownership remain. | Recreate tenant or move leads. |
| Owner replacement | Organisation authority; add/verify replacement owner before suspending/removing former owner. | `OWNER_ASSIGNED`, suspension event | Never leave zero active owners; data remains tenant-owned. | Transfer leads or silently move membership. |
| Second owner later | Organisation authority; use invite/add-owner command after role scope is approved. | `MEMBERSHIP_CREATED`, `OWNER_ASSIGNED` | Adds access; no ownership move. | Public membership creation. |
| User suspension/reactivation | Organisation/Clada authorised operator uses user status command and revokes sessions. | `USER_SUSPENDED`/`USER_REACTIVATED` | Blocks/restores access; preserves data. | Delete user to revoke access. |
| Organisation suspension/reactivation | Clada authorised operator uses organisation status command and revokes member sessions. | `ORGANISATION_SUSPENDED`/`ORGANISATION_REACTIVATED` | Blocks/restores all tenant access; preserves data. | Toggle verification or edit DB ad hoc. |
| Pilot cancellation/archive | Patrick approves suspension, then archive when obligations permit. | suspension, `ORGANISATION_ARCHIVED` | Access off; records retained under policy. | Cascade-delete the organisation. |
| Customer deletion request | Privacy/legal authority performs identity verification, retention/legal-hold review, scoped export/erasure plan. | privacy-request events | May require irreversible erasure after approval; document recovery limits. | Promise or run immediate deletion from support chat. |

Session creation or password-change failure before completion leaves the owner restricted; retry after validation or re-authentication. Deployment or Production smoke-test failure stops onboarding, revokes/suspends access if exposure is possible, preserves evidence, and follows the release incident process. Manual review is required for cross-organisation identities, internal accounts, owner invariant failures, incorrect activated email, and all deletion requests.

## Pilot readiness gate

The first external pilot is blocked until:

- architecture and ADR are approved;
- the repository command, dry-run, exact-plan Production confirmation, transaction, idempotency, conflict tests, and audit logging exist;
- secure generation, approved non-logged credential delivery, expiry, and log-redaction tests exist;
- forced password change and non-bypass route/API guards work;
- session rotation, tenant-isolation tests, and truthful empty dashboard pass;
- recovery commands/procedures exist;
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
