# Hotfix SolarGRANT Pro Form Reliability

| Field | Value |
| --- | --- |
| Document ID | SPRINT-HOTFIX-SOLARGRANT-FORM-001 |
| Status | Draft for release review |
| Owner | Clada Systems Product and Engineering |
| Review cycle | Before New Frontiers demonstration |
| Last reviewed | 2026-07-12 |

## Purpose

This hotfix makes the existing SolarGRANT Pro public intake form reliable enough for demonstration review without starting Platform Release 1.4 or changing the release-governance branch.

## Reported Symptoms

- A valid SolarGRANT Pro form submission did not appear to complete.
- Validation sometimes appeared to return the user to the beginning of the form.

## Confirmed Root Cause

- The latest submission failure reproduced as a persistence failure when the connected database did not contain the Platform Release 1.1+ organisation tables. The route failed during default installer organisation lookup before creating a lead.
- On a migrated Postgres database, valid submissions persisted, but synchronous email notification attempted a Gmail DNS lookup and held the homeowner response for roughly 37 to 39 seconds.
- The reset-to-start behaviour reproduced when MPRN was allowed past step 1 but was still required at final submit. Final validation then moved the user back to the first step.
- Server validation returned only a generic error string, so client-side field and step recovery could not be authoritative when server validation caught tampered or browser-missed input.

## Correction

- MPRN is now visibly required and validated on the property step before progression.
- Client draft state is stored in session storage during the form flow so refresh/remount preserves answers and the current step.
- Server validation now returns structured field errors, first invalid field, first invalid step id, first invalid step index, and a request id.
- The client maps structured server validation back to the relevant step without clearing answers.
- Unsupported fields, malformed JSON, empty bodies, and incorrect content types now return deliberate non-500 responses.
- Valid submission failures show a user-safe error with a support request reference.
- Optional AI analysis has a short timeout and falls back to deterministic rules.
- Email and SMS notification attempts are dispatched after the transaction without blocking the homeowner success response.
- The server upload limit now matches the UI maximum of nine optional file metadata records.
- Contact consent is required by both client and server validation.

## Affected Files

- `components/LeadForm.tsx`
- `app/api/intake/route.ts`
- `lib/lead-form-flow.ts`
- `lib/validation.ts`
- `lib/ai.ts`
- `lib/email.ts`
- `lib/sms.ts`
- `tests/platform/lead-form-validation.test.ts`

## Data And Transaction Review

One successful intake creates:

- `Lead`
- `WorkflowInstance`
- `LeadActivity` records for lead creation, score calculation, portal token creation, and document upload when files are attached
- `AuditLog`
- optional `LeadDocument` rows
- default `InstallerQuotePricing` if missing

The lead, workflow instance, activities, audit log, and documents remain inside one transaction. Email and SMS are not transaction members and no longer block the success response.

## Duplicate Protection

- Client submit lock prevents repeated button clicks and Enter presses from sending repeated browser requests.
- Server duplicate protection uses the existing recent-submission lookup plus transaction-level advisory lock.
- Five concurrent identical API requests returned the same lead id and created exactly one lead.
- Browser rapid submit produced one network request and one lead.

## Automated Tests

Validation run on 2026-07-12:

| Check | Result |
| --- | --- |
| Platform/unit tests | Passed, 39 tests |
| PostgreSQL integration tests | Passed, 6 tests |
| Typecheck | Passed |
| Lint | Passed |
| Production build | Passed |
| Prisma format | Passed; formatter-only schema line-ending churn was discarded |
| Prisma validate | Passed |
| Prisma generate | Passed after stopping local dev server file lock |
| Migration status | Passed; database schema up to date |
| `git diff --check` | Passed |

Environment used:

- Node `v24.14.1`
- npm `11.11.0`
- pnpm `11.7.0`
- Fresh PostgreSQL test database: `clada_hotfix_form_test`

Note: the repository declares Node `22.x` and pnpm `10.11.0`, but the local shell and Vercel project are on Node 24.x. Local pnpm refused non-interactive execution because the current `node_modules` layout wanted purge confirmation, so npm/npx were used for validation commands.

## Manual Browser Tests

| Matrix | Result |
| --- | --- |
| 10 valid browser submissions | Passed |
| 5 desktop valid submissions | Passed |
| 5 mobile-width valid submissions | Passed |
| Max optional uploads, nine files | Passed; nine `LeadDocument` rows |
| Homeowner yes/no and private landlord variation | Passed |
| Battery yes/no, EV, hot water variation | Passed |
| Long valid notes | Passed |
| 10 invalid browser flows | Passed; stayed on relevant step |
| Invalid server-side email | Passed; 400 with structured field error and no lead |
| 5 navigation/back/edit/refresh checks | Passed |
| 3 slow-response checks | Passed; loading state visible |
| Browser rapid submit | Passed; one request |
| Five concurrent identical API requests | Passed; one lead |

## Database Verification

Fresh Postgres verification:

- 10 valid matrix submissions created 10 unique leads.
- Those 10 leads created 10 workflow instances and 10 audit logs.
- Those 10 leads created 31 activities total.
- The max-upload case created nine document rows.
- Invalid browser flows created zero leads.
- Rapid browser submit created one lead.
- Five concurrent identical API submissions created one lead.

## Preview Deployment

- Vercel Preview, Vercel Production, Vercel Development, and local `.env.local` use the same Neon-hosted `DATABASE_URL` fingerprint. Migrating the hosted target therefore updates both preview and production runtime database paths.
- Pre-migration status found the hosted database current through `20260624162000_clada_os_customer_portal_foundation`.
- Missing approved migrations were `20260710120000_identity_organisation_foundation`, `20260710130000_users_roles_permissions_audit`, and `20260710140000_workflow_foundation`.
- The hotfix branch introduced no Prisma migration or Prisma schema change.
- A pre-migration custom-format `pg_dump` backup was taken to local temp storage; Neon backup and restore documentation confirms point-in-time restore and backup/snapshot recovery support for root branches.
- `prisma migrate deploy` applied the three approved Platform Release 1.1, 1.2, and 1.3 migrations successfully. Post-deploy `prisma migrate status` reported the hosted database schema is up to date.
- Final preview deployment built successfully at `https://seai-grant-software-er58roq2e-patrick-mc-kennas-projects.vercel.app`.
- Protected preview browser testing produced five varied valid HTTP 200 submissions, one slow-response HTTP 200 submission with loading state visible, one rapid-submit HTTP 200 submission with one intake request, one invalid-step check with zero intake requests, and one refresh/state-preservation check.
- A final success-state check returned HTTP 200, created lead `cmrhxp7ot005awbkgkjzzfzr6`, and displayed the success layout.
- Direct hosted database verification found all eight checked preview-created leads, each with exactly one lead record, one workflow instance, an audit log, and activity records. The upload case had two `LeadDocument` rows.
- Vercel function logs after the amendment showed no HTTP 500 intake logs and no notification failure logs for the checked window.

## CTO Review Amendment

- Email and SMS notifications are now awaited with `Promise.allSettled` after persistence succeeds.
- Notification provider failures do not roll back saved leads and do not change the homeowner success response after persistence succeeds.
- Notification failure logs include request id, stage, channel, and lead id, but omit provider message text to avoid leaking customer contact details.
- Provider timeouts remain bounded in `lib/email.ts` and `lib/sms.ts`.
- Added `tests/platform/intake-notifications.test.ts` to prove notification failures settle without throwing and without logging customer contact details.

## Risks And Deferrals

- Preview and production currently share the same hosted Neon database variables. This is acceptable for the hotfix after migration, but future release process should separate or explicitly document environment ownership.
- Notification delivery is bounded and awaited, but a durable notification outbox and retry worker are still deferred.
- The production deployment itself was not tested after merge. The final recommendation applies to the verified Vercel preview and shared hosted database state.
- No Platform Release 1.4 work was started.

## Rollback

Rollback is code-only. No new migration is required. If rollback is needed, revert the hotfix branch. Existing leads created during the hotfix remain normal SolarGRANT Pro records.
