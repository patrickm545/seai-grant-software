# SolarGRANT Pro Pilot Readiness Audit V1

| Field | Value |
| --- | --- |
| Document ID | PRODUCT-AUDIT-SOLARGRANT-PILOT-V1 |
| Status | Complete |
| Audit baseline | `a098da03fad32d712769a67e6d1612fb72cbd20b` (`main`, 15 July 2026) |
| Audit date | 15 July 2026 |
| Commercial horizon | First 5–10 Irish residential solar installer pilots in approximately 2–3 weeks |
| Audit scope | Repository and product audit only; no implementation |

## A. Executive verdict

**NOT PILOT READY**

An installer logging in tomorrow could receive a homeowner web enquiry, view an organisation-scoped pipeline, review captured qualification signals, add notes, set a follow-up date, change stages, and inspect an automatically calculated quote. They could not safely use SolarGRANT Pro as the primary system from enquiry through proposal and follow-up for a real multi-installer pilot.

The decisive reasons are:

1. Authentication is one shared admin password and one generic signed session. The runtime always resolves the same configured default installer organisation; it does not authenticate an installer user or select an organisation from that user's membership.
2. There is no normal installer-facing manual lead creation or core lead edit workflow. Homeowner/contact/property/qualification mistakes cannot be corrected from the lead record.
3. There is no customer-ready proposal document. The available printable application pack is an internal “SEAI manual submission prep” summary; there is no versioned proposal, generated PDF, secure installer download, or persisted generated file. Platform Release 1.4 is documentation only.
4. A quote is generated at intake, but an installer cannot adjust a lead-specific system/price, recalculate an existing lead, approve a final commercial offer, or turn it into a customer-facing proposal.
5. TD-015 leaves Preview, Production, Development, and local development on the same hosted database. Safe pilot verification, migrations, test submissions, and recovery rehearsals cannot be performed until production data is isolated.

The repository is materially beyond a mock-up: it has working persistence, organisation-scoped access helpers, a pipeline workflow, rules-based qualification, pricing, follow-up dates, activity/audit records, customer portal uploads, and a healthy build/test baseline. The shortest pilot path is therefore a narrow hardening and vertical-slice programme, not a rewrite.

## B. Current product summary

SolarGRANT Pro currently provides:

- A six-step public homeowner intake at `/` and `/embed`, with strict Zod validation, consent, duplicate matching, qualification inputs, indicative quote calculations, rules-based eligibility, lead scoring, and PostgreSQL persistence.
- An admin-password-protected installer dashboard at `/admin/dashboard`, an all-leads table, simple stage filtering, pipeline counts, hot-lead and follow-up-needed lists, and recent activity.
- A large lead detail page at `/installer-review-emerald/leads/[id]` showing homeowner, property, qualification, quote, documents, notes, activity, audit, pipeline, portal link, and internal review data.
- Organisation-scoped lead queries and mutations for the configured default installer, permission definitions, workflow history, and tenant-isolation unit/integration tests.
- Internal notes, follow-up dates, stage changes, document review status, audit/activity records, and manual copy-to-clipboard summaries.
- Installer-level pricing configuration and an automatically stored quote snapshot for new intake submissions.
- A tokenised homeowner portal for progress visibility and real file upload/download, plus internal application-pack and print views.
- Optional intake notification email/SMS integrations, but no installer-driven communication composer or complete communication history.

It does **not** currently provide a real installer identity/login, organisation switching, team onboarding, company profile/branding, manual CRM lead entry, core lead editing, lead search, discrete tasks/reminders, customer-ready proposal/PDF delivery, CSV import/export, or isolated non-production data environments.

Platform Release 1.4's approved specification and ADR-0015/0016/0017 describe intended document architecture only. No Release 1.4 document/template/rendering/storage implementation exists in the Prisma schema, services, routes, UI, tests, or dependencies at this baseline.

## C. Capability matrix

| Area | Capability | Status | Priority | Pilot blocker | Effort | Confidence | Evidence |
| ---- | ---------- | ------ | -------- | ------------- | ------ | ---------- | -------- |
| Authentication | Password sign-in and sign-out | NEEDS_POLISH | P0 | YES | S | HIGH | `/admin`, `/api/admin/login`, `/admin/logout`; `lib/admin-auth.ts`; one shared `ADMIN_PASSWORD` and 12-hour HMAC cookie |
| Authentication | Per-user installer identity | NOT_STARTED | P0 | YES | M | HIGH | `User` and `OrganisationMembership` exist in `prisma/schema.prisma`, but login creates no user identity and `requireDefaultInstallerOrganisationContext()` always uses `DEFAULT_ADMIN_USER_ID` |
| Authentication | Organisation context from authenticated membership | INCOMPLETE | P0 | YES | M | HIGH | `lib/identity.ts` can resolve a membership, but protected product routes call `requireDefaultInstallerOrganisationContext()` rather than deriving user/org from session |
| Authentication | Organisation switching | DEFERRED | DEFER | NO | M | HIGH | No route, action, component, or session field for organisation choice; not required if pilot users have one organisation |
| Authentication | Roles and permission catalogue | INCOMPLETE | P1 | NO | S | HIGH | `PlatformRole`, `lib/permissions.ts`, and tests exist; shared admin runtime prevents roles representing actual signed-in users |
| Authentication | Cross-tenant query/mutation scoping | INCOMPLETE | P0 | YES | M | HIGH | `lib/lead-access.ts`, `lib/authorization.ts`, and tenant tests scope records, but the session cannot establish distinct installer tenants and some legacy/direct Prisma paths remain (TD-007) |
| Authentication | Unauthorised redirect/API behaviour | NEEDS_POLISH | P0 | YES | XS | HIGH | `middleware.ts` redirects protected pages; `/api/leads/[id]` returns 401; no consistent 403/not-found handling across server actions |
| Authentication | Internal admin/support access | INCOMPLETE | P1 | NO | M | HIGH | Internal roles/models exist, but shared password session and default-admin memberships do not distinguish support actors |
| Onboarding | Create pilot organisation | INCOMPLETE | P0 | YES | S | HIGH | `ensureInstallerOrganisation()` exists in `lib/identity.ts`; no supported admin/runbook flow for creating a distinct pilot org |
| Onboarding | Create/invite installer users | NOT_STARTED | P0 | YES | M | HIGH | No invite, account creation, password reset, or user-management route/UI; manual DB intervention would be needed |
| Organisation setup | Company name and SEAI company ID | INCOMPLETE | P0 | YES | S | HIGH | `Installer.name` and `seaiCompanyId` exist; populated from default env/seed, not a pilot setup workflow |
| Organisation setup | Address, phone, email and contact identity | NOT_STARTED | P1 | NO | S | HIGH | Fields are absent from `Installer` and `Organisation` models |
| Organisation setup | Logo and proposal branding | NOT_STARTED | P1 | NO | S | HIGH | No installer logo/brand model, upload, or output binding |
| Organisation setup | Installer pricing configuration | READY | P0 | NO | S | HIGH | `InstallerQuotePricing`, `/admin/dashboard/quote-pricing`, `InstallerQuotePricingForm`, permission check |
| Organisation setup | Team/ownership configuration | INCOMPLETE | P1 | NO | M | HIGH | Membership/role models exist; no usable administration surface; lead assignee is free text |
| Lead capture | Public homeowner intake | READY | P0 | NO | S | HIGH | `/`, `/embed`, `components/LeadForm.tsx`, `/api/intake`, `lib/validation.ts`, validation tests |
| Lead capture | Organisation-scoped persistence | READY | P0 | NO | S | HIGH | Intake looks up installer, writes `organisationId`, enforces installer/organisation relation; migrations and scope tests |
| Lead capture | Duplicate handling | NEEDS_POLISH | P1 | NO | XS | HIGH | `/api/intake` matches email/MPRN within organisation and returns existing lead; no installer merge/review UI |
| Lead capture | Manual lead entry | NOT_STARTED | P0 | YES | M | HIGH | No installer create-lead route/action; “Open intake” sends staff to the full homeowner form |
| Lead capture | CSV/import/API integration | NOT_STARTED | P1 | NO | M | HIGH | No import route/service/UI; intake API is public-form-specific and requires the full qualification payload |
| Lead capture | Spam/rate-limit controls | NOT_STARTED | P1 | NO | S | HIGH | Validation exists, but no CAPTCHA, honeypot, IP throttling, or durable abuse control on `/api/intake` |
| Lead capture | Homeowner acknowledgement | INCOMPLETE | P1 | NO | S | HIGH | Browser thank-you result and optional notification utilities exist; copy says email will follow but delivery/configuration is not guaranteed or visible |
| Lead list | Active lead list | READY | P0 | NO | S | HIGH | `/installer-review-emerald/leads`; scoped query; latest 200 records |
| Lead list | Pipeline stages and inline status changes | READY | P0 | NO | S | HIGH | `RecentLeadsTable`, `lib/lead-workflow.ts`, workflow definition/history, stage mutation tests |
| Lead list | Filters | NEEDS_POLISH | P1 | NO | XS | HIGH | Client filter covers hot and selected stages only; won/lost/survey-completed/cold/warm and due-work filters are incomplete |
| Lead list | Search and sorting | NOT_STARTED | P1 | NO | S | HIGH | No search input/query or user-selectable sorting in `RecentLeadsTable` or leads page |
| Lead list | Assignee/ownership | INCOMPLETE | P1 | NO | S | HIGH | Free-text `assignedAdmin`/`assignedInstaller` fields exist only on detail; not membership-backed or list-visible |
| Lead list | Urgency/overdue indicators | NEEDS_POLISH | P0 | NO | S | HIGH | Dashboard computes a five-item “Follow-up needed” list and stale >7-day heuristic; all-leads table does not show due/overdue date or filter |
| Lead list | Empty state | INCOMPLETE | P1 | NO | XS | HIGH | Dashboard substitutes three sample leads when empty, which can be mistaken for real data; other tables have basic empty states |
| Lead list | Pilot-scale performance | READY | P1 | NO | XS | MEDIUM | Bounded queries (50 dashboard, 200 leads) are suitable for pilot volume; no runtime load test |
| Lead detail | Homeowner/property/qualification display | READY | P0 | NO | S | HIGH | `/installer-review-emerald/leads/[id]` renders contact, address, dwelling, MPRN, ownership, roof/usage and grant signals |
| Lead detail | Edit homeowner and property details | NOT_STARTED | P0 | YES | M | HIGH | Detail page displays core fields but has no action/form to update name, contact, address, MPRN, dwelling, roof, usage, ownership or consents |
| Lead detail | Internal notes | READY | P0 | NO | XS | HIGH | `addLeadNote()` validates 1–3000 chars and creates activity/audit evidence |
| Lead detail | Activity timeline and status history | READY | P0 | NO | XS | HIGH | `LeadActivity`, `WorkflowHistory`, detail timeline, dashboard recent activity |
| Lead detail | Responsible user and next action | INCOMPLETE | P0 | NO | S | HIGH | Follow-up date and free-text assignees exist; no structured next-action text/type or membership-backed owner |
| Qualification | Required qualification questionnaire | READY | P0 | NO | S | HIGH | `LeadForm`, strict `leadFormSchema`, property/roof/usage/timeline/consent fields |
| Qualification | Missing-information indicator | READY | P0 | NO | S | HIGH | `runRulesBasedEligibility()` stores `missingItemsJson`; detail displays missing items and warnings |
| Qualification | Eligibility outcome and warnings | NEEDS_POLISH | P0 | NO | S | HIGH | Deterministic rules flag ownership, property age, works started and prior grant; explicit SEAI/manual-review disclaimer shown |
| Qualification | Authoritative SEAI validation | INCOMPLETE | P1 | NO | M | HIGH | Logic is local heuristic (`lib/eligibility.ts`, `lib/quote-estimate.ts`); no SEAI registry/API verification |
| Qualification | Installer requalification after edits | NOT_STARTED | P0 | YES | S | HIGH | No core edit action and no recalculation/review action for an existing lead |
| Quote | Indicative system and savings estimate | READY | P0 | NO | S | HIGH | `lib/quote-estimate.ts` calculates sizes, grant, generation, savings and payback with disclosed assumptions |
| Quote | Installer-priced quote snapshot | READY | P0 | NO | S | HIGH | `lib/installer-quote-pricing.ts`, `generatedQuoteJson`, intake transaction, pricing page |
| Quote | Per-lead quote editing/recalculation | NOT_STARTED | P0 | YES | M | HIGH | Stored intake quote is read-only; pricing changes apply to new submissions only; no lead quote action/UI |
| Proposal | Customer-ready proposal/assessment | NOT_STARTED | P0 | YES | M | HIGH | No proposal model/template/version, proposal route, or customer-facing document; application pack is internal submission prep |
| Proposal | PDF generation and persisted generated file | NOT_STARTED | P0 | YES | M | HIGH | Print HTML only; no PDF renderer/generator/storage service/model/dependency; Release 1.4 docs and ADRs are unimplemented |
| Proposal | Secure installer download/share | INCOMPLETE | P0 | YES | S | HIGH | Internal print route is session-protected and can be browser-printed; no generated artifact, proposal download, expiring share, or delivery record |
| Follow-up | Set/clear follow-up date | READY | P0 | NO | XS | HIGH | `setLeadFollowUp()`, `nextFollowUpAt`/`followUpDate`, activity and audit writes |
| Follow-up | Identify due/overdue work | NEEDS_POLISH | P0 | NO | S | HIGH | Dashboard due/stale calculation exists but is capped at five, has no overdue label/count, and is not filterable |
| Follow-up | Discrete tasks and completion | NOT_STARTED | P1 | NO | M | HIGH | No Task model, route, UI, completion state, due-date reminder, or task tests |
| Follow-up | Notifications/reminders | NOT_STARTED | P1 | NO | M | HIGH | No in-app reminder scheduler/outbox; intake notifications are not follow-up reminders |
| Communications | Intake email notification | INCOMPLETE | P1 | NO | S | HIGH | `lib/email.ts`/`lib/intake-notifications.ts` support optional SMTP with bounded failure; no admin delivery state/retry |
| Communications | SMS intake notification | DEFERRED | DEFER | NO | S | HIGH | `lib/sms.ts`/Twilio exist; TD-016 recommends removal rather than pilot reliance due to unmanaged-device privacy risk |
| Communications | Manual email/SMS/call logging | NOT_STARTED | P1 | NO | M | HIGH | Activity enum has email/SMS values, but no composer or manual call/email/SMS log action/UI |
| Communications | Proposal delivery/history | NOT_STARTED | P0 | YES | M | HIGH | No proposal artifact, send/share action, delivery log, viewed event implementation, or customer-visible proposal |
| Dashboard | Pipeline counts and lead attention | READY | P0 | NO | S | HIGH | KPIs, eight-stage counts, hot leads, follow-up needed, blockers and recent activity on dashboard |
| Dashboard | Owner-level commercial visibility | NEEDS_POLISH | P1 | NO | M | HIGH | No quote value, conversion, won/lost trend, response-time, appointment or team views; enough basic attention data for pilot |
| Documents | Customer portal upload | READY | P1 | NO | S | HIGH | Token portal validates type/size, stores bytes, logs activity/audit, and supports download |
| Documents | Installer upload | NOT_STARTED | P1 | NO | S | HIGH | Document model distinguishes roles, but no installer upload route/action/UI |
| Documents | Intake attachment persistence | INCOMPLETE | P1 | NO | M | HIGH | Intake stores supplied filename/type/size metadata and an `uploaded://` path but no bytes; actual file is unavailable until portal upload |
| Documents | Review status/checklist | READY | P1 | NO | XS | HIGH | Document type/status enums, checklist builder, approve/reject/replacement actions and portal visibility |
| Documents | Secure retrieval | NEEDS_POLISH | P1 | NO | S | HIGH | Portal route binds token + document ID and serves DB bytes; bearer token has no expiry and redirectable `storageUrl` support needs deployment review |
| Documents | Uploaded/generated distinction | INCOMPLETE | P1 | NO | S | HIGH | Uploaded-by role exists; no generated-document domain or Release 1.4 generated-file records |
| Mobile | Public intake | READY | P0 | NO | XS | MEDIUM | Responsive CSS collapses form/layout grids at mobile breakpoints; stepped form and upload controls are touch-oriented; not browser-tested in this audit |
| Mobile | Dashboard and lead list | NEEDS_POLISH | P0 | YES | M | MEDIUM | Responsive rules exist, but the six-column table relies on horizontal scrolling and navigation has no mobile menu; no safe data-isolated browser test |
| Mobile | Lead detail actions/forms | NEEDS_POLISH | P0 | YES | M | MEDIUM | Detail grids collapse, but the 1,200+ line dense page has sticky/action/table sections and no runtime mobile verification |
| Reliability | Lint, typecheck and unit tests | READY | P0 | NO | XS | HIGH | `npm run lint`, `npm run typecheck`, and 51/51 platform tests passed on 15 July 2026 |
| Reliability | Production build | READY | P0 | NO | XS | HIGH | `npm run build` passed; Next.js 15.5.15 produced all expected routes |
| Reliability | PostgreSQL integration tests | BLOCKED | P0 | YES | M | HIGH | Tests and safety runner exist, but `TEST_DATABASE_URL` is absent and TD-015 prohibits using the shared hosted DB |
| Reliability | Environment/database isolation | BLOCKED | P0 | YES | M | HIGH | TD-015 states Preview, Production, Development and local share one Neon database |
| Reliability | Migration/deployment gate | INCOMPLETE | P0 | YES | S | HIGH | Migrations exist and TD-013 is documented; no CI or automatic `prisma migrate status` promotion gate |
| Reliability | Error/loading/empty recovery | NEEDS_POLISH | P1 | NO | M | MEDIUM | Intake has staged error responses and loading UI; server actions generally throw raw errors and dashboard sample empty data is misleading |
| Reliability | Audit coverage | NEEDS_POLISH | P1 | NO | S | HIGH | Typed audit foundation and sanitisation tests exist; legacy actor strings/direct mutations remain per TD-001/TD-007 |
| Data portability | CSV export | NOT_STARTED | P1 | NO | M | HIGH | `lead.export` permission exists but no route/service/UI/export tests |
| Data portability | Pilot data/document exit | INCOMPLETE | P1 | NO | S | MEDIUM | Founding team can perform controlled DB export and portal document retrieval; no customer-operable export bundle/runbook |
| Support | Manual onboarding runbook | NOT_STARTED | P0 | YES | S | HIGH | README covers one default admin/installer only; no repeatable 5–10 tenant pilot procedure |
| Support | In-product support/training | NEEDS_POLISH | P1 | NO | S | HIGH | `/admin/support` exists; no installer-specific onboarding checklist or known-limitations guide |
| Release 1.4 | Full approved document architecture implementation | DEFERRED | DEFER | NO | XL | HIGH | Master specification and ADR-0015/0016/0017 exist; no runtime/schema/tests/dependencies implement them; only the narrow proposal slice is pilot-critical |

## D. End-to-end journey audit

### Realistic journey: Aoife's new solar enquiry

1. **Lead enters SolarGRANT Pro — succeeds through the public form.** Aoife completes `/` or an embedded `/embed` form. Strict validation requires contact, property, MPRN, energy, timing and consent information. `/api/intake` resolves the configured installer, detects an organisation-local duplicate and saves the lead transactionally. There is no simple staff/manual lead entry for a phone or referral enquiry.
2. **Installer sees the new lead — succeeds for the one configured default installer.** The dashboard and leads page query the configured default organisation. A pilot employee is not actually authenticated as themselves, and a second pilot organisation cannot use the same runtime safely through its own membership.
3. **Installer reviews homeowner/property information — read-only.** The detail page is comprehensive, but mistakes in name, phone, address, Eircode, MPRN, ownership, roof or usage cannot be fixed. This is the first unavoidable operational break for normal sales work.
4. **Missing information and grant qualification — partially succeeds.** The detail page shows missing items, risks, likely eligibility, confidence, disclaimers and heuristically calculated grant information. Because the underlying answers cannot be corrected or re-run, the qualification state can become stale or wrong.
5. **Installer records notes and next actions — succeeds narrowly.** Internal notes create activity/audit entries. A follow-up date can be set, free-text assignee fields can be saved, and a dashboard list identifies up to five due/stale leads. There is no task completion, reminder notification or structured next-action field.
6. **Installer produces estimate/proposal — estimate only.** A quote snapshot is produced automatically at homeowner intake using installer-wide pricing. The installer cannot adjust a lead-specific quote or regenerate it after a survey/correction. The internal application pack can be viewed and browser-printed, but it is not a customer proposal.
7. **Installer downloads/shares output — breaks.** There is no generated PDF or secure proposal download/share/delivery record. Copy buttons and browser print are workarounds, not a controlled commercial proposal workflow.
8. **Installer schedules/records follow-up — succeeds narrowly.** A date and activity event can be recorded. Communication itself is not manually logged, and no reminder is sent.
9. **Lead status is updated — succeeds.** Pipeline transitions are permission-checked, transactionally projected to the lead and captured in workflow history/activity/audit data.
10. **Business owner sees what needs attention — partially succeeds.** The dashboard shows counts, hot leads, recent activity and a small follow-up list. It lacks a complete due-work queue, owner/assignee view, quote value and response visibility. At pilot volume it is useful, but not yet sufficient to replace spreadsheet oversight without the P0 fixes above.

**Answer to the audit question:** No. Today the workflow breaks at real installer access/onboarding, correction of lead information, lead-specific quote finalisation, and customer-ready proposal generation/download. Safe validation is additionally blocked by the shared environment database.

## E. P0 pilot blockers

### P0-1 — Real installer authentication and tenant context

- **Problem:** One password grants one undifferentiated admin session. Product routes then bind to the configured default installer and bootstrap the same default admin membership.
- **User impact:** Pilot staff cannot have accountable access, roles or a reliable organisation context; multiple installer businesses cannot safely share the deployment.
- **Repository evidence:** `lib/admin-auth.ts`; `/api/admin/login`; `lib/identity.ts`; every installer product route calls `requireDefaultInstallerOrganisationContext()`.
- **Smallest fix:** Add a narrow pilot identity flow that authenticates a user, stores user and active organisation IDs in the signed session, verifies active membership on every request, and limits each pilot user to one organisation. Keep Clada support access explicit and separately attributable. Organisation switching can remain deferred.
- **Acceptance criteria:** Two test organisations and users see only their own leads/documents/pricing; inactive/wrong membership is denied; activity/audit records name the real actor; sign-out invalidates access; cross-tenant integration tests pass.
- **Effort:** M.
- **Dependencies:** Chosen pilot credential mechanism; isolated disposable test database.
- **Risk if deferred:** Cross-customer access/accountability failure and inability to onboard 5–10 installers safely.

### P0-2 — Repeatable manual pilot onboarding

- **Problem:** Models exist, but no supported operation creates an installer organisation, owner membership, company identity and initial pricing together. Ordinary onboarding currently requires code/env or direct database intervention.
- **User impact:** Founders cannot repeatably onboard, suspend or support pilot accounts without developer-only knowledge and error-prone database edits.
- **Repository evidence:** `Installer`, `Organisation`, `User`, `OrganisationMembership`; `prisma/seed.ts`; default installer env fields; no user/org admin route or runbook.
- **Smallest fix:** Provide an internal, authenticated Clada-only onboarding command or admin action plus a step-by-step runbook. Capture company name, SEAI ID, contact details needed for proposal, owner email and pricing; output a verification checklist. Self-service is not required.
- **Acceptance criteria:** A non-author developer/founder can create, verify, disable and re-verify a pilot tenant without hand-written SQL; reruns are safe; owner membership and pricing are correct.
- **Effort:** S (after P0-1 session decisions).
- **Dependencies:** P0-1 identity/session model; minimum company-profile fields from the proposal slice.
- **Risk if deferred:** Slow and inconsistent onboarding, wrong-tenant configuration, and direct production DB edits.

### P0-3 — Manual lead entry and editable source-of-truth record

- **Problem:** The only create path is the homeowner-grade intake. Core homeowner, contact, property and qualification fields are read-only after persistence.
- **User impact:** Phone/referral leads are awkward to enter, and ordinary corrections require developer/database work; qualification and quote outputs remain stale.
- **Repository evidence:** `/`, `/embed`, `/api/intake`; detail page display; no protected create/update action for core lead fields.
- **Smallest fix:** Add one organisation-scoped “New lead” form with a pilot minimum and one edit form on lead detail. Reuse Zod field definitions, permit incomplete manual records with explicit missing-item state, and re-run deterministic qualification/quote projections after relevant edits.
- **Acceptance criteria:** Installer creates a phone lead in under two minutes, edits contact/address/MPRN/property/roof/usage data, sees validation errors and missing fields, and the recalculated qualification is activity/audit recorded without changing tenant ownership.
- **Effort:** M.
- **Dependencies:** P0-1 authenticated context; decisions on which fields may be incomplete for manual capture.
- **Risk if deferred:** Spreadsheet remains the correction/import buffer and the product is not a reliable system of record.

### P0-4 — Lead-specific quote finalisation and customer-ready proposal

- **Problem:** Intake stores an automatic quote snapshot, but it cannot be revised for the lead or converted into an installer-approved, customer-facing proposal.
- **User impact:** Installers must return to Word, PDF tools or spreadsheets to quote the homeowner—the central commercial handoff.
- **Repository evidence:** `generatedQuoteJson`; `InstallerQuotePricing`; read-only quote cards; internal `ApplicationPackView`; no proposal/template/generated-document implementation.
- **Smallest fix:** Build a narrow vertical slice: editable lead quote inputs and line totals, explicit installer approval, a fixed branded proposal view with estimate/grant disclaimers, server-generated PDF, immutable snapshot/version metadata, and organisation-scoped secure download. Implement only the minimum ADR-0015, ADR-0016 and ADR-0017 document foundation required for this proposal slice, not the entire Release 1.4 platform. Generated proposal bytes must use PostgreSQL-backed generated-file storage behind the approved platform-owned, provider-neutral storage abstraction, with organisation ownership, immutable output metadata, final byte size, SHA-256 integrity and authenticated download. Deployed local filesystem storage, unmanaged private paths and public file URLs are not acceptable.
- **Acceptance criteria:** From an edited qualified lead, installer adjusts and saves a quote, previews exactly what the homeowner sees, generates a PDF, downloads it securely, and the lead timeline records generation and “quote sent” marking. Another organisation cannot fetch it.
- **Effort:** L.
- **Dependencies:** P0-1 tenant identity; minimum installer company/contact/branding data; isolated test environment; the narrow ADR-0015/ADR-0016/ADR-0017 foundation using PostgreSQL as the generated-file provider.
- **Risk if deferred:** No end-to-end lead-to-proposal workflow; spreadsheets/document tools remain primary.

### P0-5 — Isolated pilot environment and deployment safety gate

- **Problem:** TD-015 states local, Preview, Development and Production share the same Neon database. There is no automatic migration-status/promotion gate.
- **User impact:** Test submissions, migrations, destructive verification or defects can change real pilot data; integration and recovery evidence cannot be gathered safely.
- **Repository evidence:** TD-015 and TD-013 in `docs/03-engineering/TECHNICAL_DEBT_REGISTER.md`; `scripts/run-postgres-integration-tests.mjs` correctly refuses unsafe database names; no CI workflow.
- **Smallest fix:** Provision separate Production and disposable Preview/test database branches at minimum; configure environment-specific URLs; add database fingerprint/ownership checks, migration-status gate, backup confirmation and a non-destructive smoke runbook.
- **Acceptance criteria:** Preview/test cannot access production rows; integration tests pass on a disposable DB; migrations are checked before promotion; a backup/restore or provider point-in-time recovery procedure is verified; production test data policy is documented.
- **Effort:** M.
- **Dependencies:** Neon/Vercel access and named operational owner.
- **Risk if deferred:** Destructive production test risk and no defensible go-live verification.

### Mobile condition within the P0 work

Mobile remediation is not a sixth platform project. Each P0 vertical slice must include 375 px verification. The leads table/navigation and dense detail/proposal actions must be usable without hidden primary actions, clipped dialogs or unmanageable horizontal scrolling before go-live.

## F. P1 pilot improvements

If capacity remains after the P0 journey is complete:

1. Add lead search, complete stage/score filters, overdue/due filters and visible next follow-up/assignee columns.
2. Replace empty-dashboard sample records with an unambiguous demo/empty state.
3. Add a structured next action and membership-backed owner; keep full task management deferred unless pilot evidence demands it.
4. Add a simple manual activity logger for call, email and SMS outcomes; external sending remains optional.
5. Add installer upload to the existing document checklist and clarify real intake uploads versus metadata placeholders.
6. Add a controlled CSV lead export and documented pilot exit bundle; CSV import can remain founder-assisted.
7. Add spam/rate limiting to public intake and visible notification delivery status/retry guidance.
8. Improve server-action error feedback and complete representative desktop/mobile browser checks.
9. Add basic owner visibility: total open quote value, won/lost count and full due-work queue.
10. Retire or disable SMS intake notifications for pilots in line with TD-016 unless a centrally governed business channel is approved.

## G. Deferred backlog

Defer until pilot evidence justifies it:

- Organisation switching for users who belong to multiple tenants; custom roles and self-service account administration.
- Self-service onboarding, broad installer profile administration and customer-configurable branding systems.
- Full installation operations, crew scheduling, inventory, procurement, accounting and payment processing.
- Complete SEAI submission automation or authoritative SEAI registry integrations.
- Full Platform Release 1.4 general document/template/version/render/storage platform beyond the narrow proposal slice.
- External object-storage providers, storage migration tooling and general document-management features are deferred. The narrow provider-neutral storage abstraction and PostgreSQL-backed generated-file provider required by ADR-0017 remain part of the pilot proposal slice.
- Discrete task projects, calendar integrations, automated reminders and workflow automation.
- Digital signatures, customer portal expansion, WhatsApp Business, marketing automation and automated campaigns.
- Advanced AI qualification/extraction, broad analytics, cohort reporting and forecasting.
- Native mobile application; responsive web is sufficient.

## H. Manual pilot operations

Clada Systems can deliberately absorb the following for 5–10 pilots:

- Founder-led discovery, data-processing terms, support and 45–60 minute live training.
- Internal creation of each organisation, first owner account, company details and initial pricing through the approved pilot onboarding mechanism.
- One user per installer initially; add staff only after access tests pass. Do not share credentials between businesses.
- Founder-assisted CSV cleansing/import through a controlled one-off script or manual entry. Do not run hand-written production SQL for everyday lead work.
- Manual logo preparation and one fixed proposal layout; no theme builder.
- Manual review of eligibility warnings and SEAI facts; the product must label calculations as indicative.
- Manual proposal email using the installer's managed mailbox after secure PDF download, with a manual “sent” activity/status record.
- Direct support channel, daily log review, failed-notification review and weekly pilot check-in.
- Weekly controlled export/backup confirmation and an on-request lead/document exit package.
- Manual monitoring of stale leads and support-assisted correction only for exceptional legacy records—not everyday field edits.

### Data to request from each installer

- Legal/trading name, SEAI company/registration identifier and primary county/service area.
- Business address, phone, reply-to email, website and approved logo file.
- Named owner/user email and any initial staff with required role.
- Pricing inputs, VAT treatment, markup/discount policy, travel/base labour and proposal disclaimers/validity period.
- Existing active leads in the agreed CSV shape, lawful basis/consent provenance and documents to migrate.
- Preferred pipeline terminology, support contact and data-retention/export expectations.

### Training focus

Intake link, manual lead entry, correcting qualification data, notes versus homeowner-visible information, follow-up queue, stage discipline, quote approval, proposal generation/download, portal document review, privacy escalation and support contact.

## I. Two-week implementation plan

This is a risk-ordered sequence, not a calendar guarantee. Effort remains relative and the proposal slice may require parallel engineering within the same sprint objective.

### Sprint 1 — Secure tenant and editable lead journey

- **Objective:** A named pilot user can enter the correct organisation and operate an accurate lead record without developer intervention.
- **Tasks:** Isolate databases and add environment fingerprint/runbook; implement user-bound pilot session and single-org context; prove cross-tenant denial; add internal onboarding operation; add manual lead create and core lead edit/requalification; remove misleading empty sample data; verify dashboard/list/detail at 375 px.
- **Dependencies:** Credential choice; Neon/Vercel access; minimum editable-field definition.
- **Acceptance criteria:** Two tenants/users pass isolation tests; onboarding is repeatable; phone lead can be created and corrected; qualification refreshes; lint/typecheck/unit/build and disposable PostgreSQL integration tests pass; desktop/mobile core journey passes.
- **Demo outcome:** Installer A logs in, creates/edits a referral lead and schedules follow-up; Installer B cannot discover or access it.

### Sprint 2 — Quote-to-proposal, reliability and onboarding

- **Objective:** Turn a qualified lead into a controlled proposal and operate the first pilots safely.
- **Tasks:** Add per-lead quote edit/approval; fixed customer proposal preview and PDF; organisation-scoped generated-file download; proposal generation/sent activity; minimum company/contact/logo binding; full due-work visibility; P1 search/export only if capacity remains; production migration/backup/smoke checklist; onboarding/support/training pack.
- **Dependencies:** Sprint 1 identity/context; proposal content approval; pilot storage and backup decision.
- **Acceptance criteria:** Approved quote produces repeatable PDF snapshot; cross-tenant download fails; disclaimer and company identity are correct; sent/follow-up status is visible; go/no-go and per-installer acceptance scripts pass in isolated Preview, then non-destructive Production smoke passes.
- **Demo outcome:** A real-looking homeowner enquiry progresses from capture through corrected qualification, approved proposal download, sent marking and visible follow-up without a spreadsheet.

### Optional stretch work

- Search and complete pipeline/due filters.
- Membership-backed assignee and manual call/email activity logger.
- Controlled CSV export and founder-assisted import tooling.
- Installer-side document upload and public-intake rate limiting.
- Basic open quote value and won/lost owner metrics.

Do not start calendar integrations, broad communications automation, general document infrastructure or advanced analytics until the acceptance journey passes.

## J. Pilot acceptance test

Run this in isolated Preview for every pilot configuration, then run a non-destructive subset in Production.

1. Create the installer organisation, company/proposal identity, owner user and pricing through the approved onboarding operation.
2. Sign in as the installer owner; sign out and confirm protected routes redirect/deny.
3. Sign in as a user from a second test organisation and prove they cannot list, open, mutate or download the first organisation's lead/documents/proposal.
4. Submit a unique public homeowner enquiry and confirm one organisation-scoped lead appears once, including after a duplicate submission.
5. Create a phone/referral lead manually with missing details; confirm missing-information indicators are clear.
6. Edit contact, address/Eircode, MPRN, property, roof and usage fields; confirm invalid values are rejected and qualification/quote projections refresh with activity/audit evidence.
7. Add an internal note, assign an owner/next action, set yesterday/today/future follow-ups and confirm due/overdue visibility.
8. Move the lead through Contacted, Qualified and Survey Booked; verify history and unauthorised transitions fail safely.
9. Adjust the lead quote, approve it, preview the customer version, generate/download the PDF and verify company identity, figures, assumptions, grant disclaimer and version/timestamp.
10. Confirm another organisation and an unauthenticated browser cannot fetch the proposal URL.
11. Mark/send the proposal through the supported manual process, record communication, schedule follow-up and confirm dashboard attention state.
12. Upload a homeowner portal document, download it as the authorised party, review status, request replacement and verify audit/activity history.
13. Repeat steps 4–11 at 375 px width on a real phone or browser device emulation; no primary action may be clipped or require impractical horizontal table navigation.
14. Export the pilot's leads and documents, verify the files open, and confirm backup/recovery ownership.
15. Run lint, typecheck, unit tests, production build and disposable PostgreSQL integration tests; verify migration status before promotion.

## K. Go/no-go checklist

### Security and tenant isolation

- [ ] Named users authenticate; no shared cross-business credential.
- [ ] Session binds user and active organisation to a verified active membership.
- [ ] Cross-tenant list/read/update/document/proposal tests pass on PostgreSQL.
- [ ] Clada support access is explicit, least-privilege and attributable.

### Lead management

- [ ] Public and manual leads persist once in the correct organisation.
- [ ] Installer can correct core homeowner/property/qualification data.
- [ ] Missing fields, notes, ownership, stage and next action are usable.

### Proposal output

- [ ] Installer can adjust and approve a lead-specific quote.
- [ ] Customer-ready proposal PDF has correct company identity, figures, validity and disclaimers.
- [ ] Generated output is versioned, securely retrievable and tenant-isolated.

### Follow-up and management

- [ ] Installer can record notes, next action and due date.
- [ ] All overdue/outstanding pilot work is visible, not only a five-item sample.
- [ ] Owner can see pipeline and open commercial attention without spreadsheet export.

### Mobile usability

- [ ] Intake, list, detail/edit, notes, follow-up, quote and proposal download pass at 375 px.
- [ ] Navigation, dialogs, tap targets and validation are usable; primary actions are not hidden by horizontal overflow.

### Production deployment

- [ ] Production and Preview/test databases are isolated and fingerprinted.
- [ ] Migration status is checked before promotion; no destructive test targets Production.
- [ ] Build and all test gates pass; non-destructive production smoke succeeds.

### Onboarding and support readiness

- [ ] Repeatable runbook creates/disables tenant, user, profile and pricing without ad-hoc SQL.
- [ ] Installer data, pricing, consent provenance and support contacts are collected.
- [ ] Training, known limitations, escalation owner and response expectation are agreed.

### Data backup/export

- [ ] Backup/PITR ownership and recovery procedure are verified.
- [ ] Installer leads and documents can be exported in a usable exit package.
- [ ] Retention, deletion and failed-notification handling are documented.

**Go only when every P0 checkbox passes.** A waived item needs a named owner, written risk acceptance and a dated resolution; tenant isolation, core record editing, proposal output and production-data safety are not waivable.

## L. Recommended next implementation PRs

### PR 1 — Isolate pilot data environments and add deployment guardrails

- **Scope:** Separate database configuration, fingerprint/ownership guard, migration-status/smoke runbook and disposable integration-test setup. No product UI.
- **User-visible result:** No direct feature, but pilot data and verification become safe.
- **Dependencies:** Neon/Vercel access.
- **Validation:** Preview cannot read Production; safe runner accepts only disposable DB; migrations and integration suite pass; backup path confirmed.

### PR 2 — Authenticate pilot users into one verified installer organisation

- **Scope:** User-bound signed session, active membership resolution, protected-route adoption, explicit internal support context and end-to-end tenant isolation.
- **User-visible result:** Each pilot signs in to their own business workspace with attributable actions.
- **Dependencies:** PR 1; chosen credential/bootstrap method.
- **Validation:** Auth lifecycle, inactive membership, role denial and cross-tenant PostgreSQL tests; lint/typecheck/unit/build.

### PR 3 — Add repeatable internal pilot onboarding

- **Scope:** Clada-only operation/runbook to create/suspend organisation, owner user, installer identity and pricing defaults idempotently.
- **User-visible result:** Pilot account can be prepared consistently without manual SQL.
- **Dependencies:** PR 2; minimum company-profile data decision.
- **Validation:** Create/rerun/disable flow on disposable environment; resulting login and pricing smoke test.

### PR 4 — Create and edit a qualified lead vertical slice

- **Scope:** Protected manual creation, editable core contact/property/qualification fields, incomplete-record support, deterministic recalculation, activity/audit and clear errors.
- **User-visible result:** Phone/referral leads and corrections stay in SolarGRANT Pro.
- **Dependencies:** PR 2.
- **Validation:** Create/edit/invalid/missing/recalculate flows; organisation isolation; 375 px browser verification.

### PR 5 — Finalise a lead-specific quote

- **Scope:** Editable lead quote inputs, recalculation, explicit approval and immutable commercial snapshot; preserve installer pricing defaults.
- **User-visible result:** Installer can turn survey knowledge into an approved customer price.
- **Dependencies:** PRs 2 and 4.
- **Validation:** Calculation/rounding/VAT/grant tests, stale-input handling, audit trail, tenant isolation and mobile UI.

### PR 6 — Generate and securely download the pilot proposal PDF

- **Scope:** Implement only the Release 1.4 subset required by this vertical slice: one governed `Document` generation attempt; one immutable template/version snapshot, or the narrowest ADR-0016-approved equivalent; one generated-file record containing PostgreSQL-backed PDF bytes, final byte size and SHA-256 checksum; installer identity/logo and disclaimers; authenticated organisation-scoped secure download; and generation/sent activity. Do not add a public link, signed URL, deployed local filesystem, general-purpose document-management UI or external object-storage provider.
- **User-visible result:** Installer can preview and download a professional homeowner proposal without Word or a spreadsheet.
- **Dependencies:** PRs 1, 2, 3 and 5; approved content/storage decision.
- **Validation:** Golden-content/render check, PDF open/print, cross-tenant denial, snapshot immutability, failed-generation recovery and 375 px preview/download.

### PR 7 — Complete the pilot attention queue and operating pack

- **Scope:** Full due/overdue visibility, remove empty sample leads, minimal search/filter polish, go-live/onboarding/support/export runbooks. Add controlled CSV export if capacity permits.
- **User-visible result:** Installer and owner can see what needs attention; Clada can operate and exit a pilot safely.
- **Dependencies:** Core journey PRs.
- **Validation:** Overdue boundary cases, empty/loading/error states, mobile/browser journey, export integrity, full pilot acceptance script.

## Validation evidence and limitations

### Checks run

- Confirmed clean starting worktree and `origin/main` exactly at `a098da03fad32d712769a67e6d1612fb72cbd20b` after fetch.
- `npm run lint` — passed.
- `npm run typecheck` — passed.
- `npm test` — passed, 51 tests, 0 failures.
- `npm run build` — passed on Next.js 15.5.15; all documented application/API routes compiled.
- Inspected routes, pages, components, services, Prisma schema/migrations, validation, authorisation, tenant helpers, workflow, audit, pricing, eligibility, documents, portal, notifications, tests, environment examples, build configuration, release documents and technical debt register.

### Checks not run

- `pnpm` scripts: the available environment supplied Node 24.14.0/pnpm 11.7.0 while the repo pins Node 22.x/pnpm 10.11.0; pnpm refused to reconcile `node_modules` without a TTY. Existing local binaries were used via `npm run` without changing dependencies.
- PostgreSQL integration tests: `TEST_DATABASE_URL` is not set. The local `.env` has a database URL and TD-015 identifies it as potentially shared with Production; the safe test runner must not target it.
- Prisma migration status/deploy, seed, intake smoke submissions, portal uploads and protected route runtime testing: these can write through the shared hosted database. Dashboard reads also call default identity/installer `upsert` helpers. Running them would violate TD-015 and the audit's no-production-data/no-destructive-test rules.
- Desktop/mobile live browser inspection: core authenticated routes require the potentially shared database and can invoke setup writes. Mobile conclusions are based on component/CSS inspection and are therefore marked MEDIUM confidence where appropriate.
- Hosted deployment health/logs: no deployment mutation or production-data access was authorised or required; repository evidence and local production build were used.

## Audit integrity

This audit created documentation only. It did not change runtime code, Prisma schema, migrations, APIs, routes, UI, tests, dependencies, seeds, configuration or production data. It did not implement Platform Release 1.4, create a release tag, or create implementation PRs.
