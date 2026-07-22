# Republic of Ireland Grant Routing

| Field | Value |
| --- | --- |
| Document ID | FEAT-SGP-ROI-GRANT-ROUTING-001 |
| Status | Active |
| Owner | SolarGRANT Pro Product and Engineering |
| Review cycle | Per feature milestone |
| Last reviewed | 2026-07-21 |
| Product | SolarGRANT Pro |
| Risk level | High |
| Source finding | PUX-007 |

## Summary

SolarGRANT Pro must route a property through its SEAI grant-assistance workflow only when the property is in the Republic of Ireland. The current public intake and eligibility API accept a shared list of all 32 counties, while the deterministic eligibility and quote calculations do not inspect location. A Northern Ireland property can therefore receive a positive SEAI eligibility summary, an estimated SEAI grant deduction, a generated quote, persistence as a grant lead, notifications, and downstream grant documents.

This specification defines the smallest safe correction and is approved for implementation in a separate application PR. SolarGRANT Pro will own a deterministic property-jurisdiction classifier. County will be the required primary routing input; an optional Eircode will be a supporting format and conflict signal, not a county lookup. Northern Ireland will receive a clear unsupported-route outcome before eligibility, quote, persistence, notification, or AI work. Clada OS intake, tenant, audit, and storage capabilities remain region-neutral.

The approved design is now implemented in the application. The implementation remains a SolarGRANT Pro module boundary and does not add a schema migration or regional policy to Clada OS.

## Problem

The current experience asks for location in the context of an SEAI grant check but permits counties outside the scheme's Republic of Ireland property boundary. This creates four linked risks:

- a homeowner can receive an SEAI eligibility conclusion that does not apply to the property;
- an installer can receive and prioritise a misleading grant-qualified lead;
- quotes, portals, packs, exports, and notifications can repeat an inaccurate grant deduction or status;
- a future Northern Ireland or non-SEAI workflow can become mixed into SolarGRANT Pro without an explicit product decision.

Jurisdiction is not ordinary address completeness. It is a policy boundary that must be resolved before any SEAI-specific conclusion or commercial output is produced.

## Evidence

- The [SolarGRANT Pro Product and UX/UI Audit V1](../product/audits/SOLARGRANT_PRO_PRODUCT_UX_AUDIT_V1.md) records the issue as PUX-007 and identifies Republic-only validation as a pilot requirement.
- The audit cites the SEAI Solar Electricity Grant terms stating that the home must be in the Republic of Ireland.
- Repository inspection was performed from `main` at `c3dcb61` on 2026-07-21. No Production or shared database was accessed.

## Product Scope

### In scope

- deterministic Republic of Ireland, Northern Ireland, and unknown jurisdiction classification for the SolarGRANT Pro intake;
- polite client-side routing before the homeowner completes an unsupported SEAI journey;
- authoritative server-side enforcement for public intake and direct eligibility API calls;
- prevention of eligibility, quote, AI, persistence, notification, portal, submission-package, and reporting claims for newly submitted unsupported properties;
- safe display and export behaviour for any pre-existing unsupported record;
- restored browser draft handling;
- automated and desktop/mobile browser verification.

### Out of scope

- a Northern Ireland grant product or advice service;
- international address support;
- geocoding, mapping, address lookup, or third-party location providers;
- a generic rules engine;
- automatic county inference from free-text addresses;
- installer business-address validation;
- changes to identity, authentication, tenant provisioning, recovery, Vercel, Neon, GDPR policy, retention, or legal notices;
- Production data inspection or mutation;
- a schema migration unless implementation discovers evidence that the read-time compatibility plan cannot be made safe.

## Platform Classification

This is a **SolarGRANT Pro module feature**.

SolarGRANT Pro owns SEAI policy, the Republic of Ireland scheme boundary, the county groupings used by this flow, eligibility language, and unsupported-region copy. Clada OS may continue to provide generic intake, customer records, tenant ownership, audit, documents, and reporting, but those capabilities must not import Irish counties or SEAI rules.

The current code keeps several product rules under the top-level `lib` folder. The implementation may add a focused SolarGRANT Pro jurisdiction module there without pretending it is a generic Clada OS capability. No platform ADR is required for this correction because it preserves the existing module boundary. An ADR is required only if review expands the work into a reusable multi-region platform contract or changes the persistent data model.

## Current-State Analysis

### Location collection

| Data | Current collection | Required status | Current client handling |
| --- | --- | --- | --- |
| County | Public intake property step in `components/LeadForm.tsx` | Required | Select populated from `counties` in `lib/types.ts`; only non-empty is checked locally. |
| Eircode | Public intake property step | Optional | Uppercased while typing; no syntax or jurisdiction validation. |
| MPRN | Public intake property step | Required | Digits only, capped at 11; MPRN is not used to resolve jurisdiction. |
| Address line 1 | Final contact step | Required | Trimmed length must be at least five characters. |
| Address line 2 | Final contact step | Optional | No meaningful length, location, or syntax check. |

The county is collected before the free-text address. Browser drafts store all form fields, the selected system size, and the current step in installer-scoped `sessionStorage` under draft version 1. Draft restoration merges stored values directly into the current form state and does not reclassify county values.

Installer `county` is also stored during tenant provisioning, but that value describes the installer business and is not evidence of the homeowner property's jurisdiction. It is outside this feature.

### County source and duplication

`lib/types.ts` contains one 32-county constant. It includes Antrim, Armagh, Derry, Down, Fermanagh, and Tyrone along with the 26 Republic of Ireland counties. The browser selector and server `z.enum` both import this same constant, so the list itself is not duplicated between client and server.

Location values are nevertheless copied into several representations after acceptance:

- scalar `Lead.addressLine1`, `addressLine2`, `county`, and `eircode` columns;
- `structuredExportJson.property`;
- submission-package and portal-fill-preview payloads;
- application-pack fields and readiness checks;
- installer tables, dashboard location labels, lead detail, and homeowner portal address;
- email and SMS notification text.

The database `Lead.county` column is an unconstrained `String`, so records created outside the public schema or by older versions can contain arbitrary values. This flexibility is useful for backward compatibility but means the database is not the policy enforcement boundary.

### Client and server validation

Client validation in `components/LeadForm.tsx` checks only that county is non-empty. It does not distinguish jurisdiction. Eircode is optional and unvalidated. Address line 1 is checked only for minimum length.

Server validation in `lib/validation.ts` is authoritative for the public intake payload shape, but currently uses `z.enum(counties)`, where `counties` contains all 32 counties. It accepts any string as an optional Eircode, accepts optional address line 2 without a bound, and has no cross-field jurisdiction check.

`POST /api/intake` validates before normalising values, then normalises name, email, phone, address, Eircode, MPRN, and notes. A direct request that supplies a Northern Ireland county passes the same server schema as the browser.

`POST /api/ai/eligibility` reuses `leadFormSchema` and therefore also accepts Northern Ireland counties. It calls the AI-backed eligibility function directly and has no typed handling for unsupported jurisdiction.

Authenticated `GET /api/leads/[id]` returns the raw tenant-scoped lead, including scalar location and stored eligibility/quote fields. It preserves tenant isolation but provides no derived jurisdiction or warning for a historical unsupported value.

### Eligibility and grant summaries

There are two deterministic grant paths and one optional AI enhancement:

1. `lib/eligibility.ts` calculates `likelyEligible`, confidence, risks, summary, next step, and lead temperature from ownership, property age, works started, prior MPRN grant, MPRN format, documents, and operational fields. It does not inspect county, address, or Eircode.
2. `lib/quote-estimate.ts` calculates the potential SEAI grant, whether it is likely, the estimated grant deduction, net cost, grant status, warnings, and recommended action. It does not accept location in `SolarQuoteInput` and therefore cannot reject an unsupported jurisdiction.
3. `lib/ai.ts` starts with the deterministic fallback, then may send the complete lead input to OpenAI and merge the returned eligibility fields over the fallback. The prompt says only that this is an Irish SEAI workflow. It does not impose a deterministic Republic of Ireland guard, and AI output can replace the fallback eligibility conclusion.

The public form also calls `buildSolarQuoteEstimate` on the client while the user progresses. As a result, an NI county selection can be followed immediately by Republic of Ireland grant preview language before the server is involved.

### Persistence and side effects

After validation, `/api/intake` currently performs this sequence:

1. resolve the installer and tenant organisation;
2. return a recent duplicate if one matches;
3. calculate the quote estimate and installer-generated quote;
4. generate rules/AI eligibility analysis;
5. create a tenant-owned `Lead`, copied structured export, quote snapshot, optional document records, workflow instance, activity records, and audit log in a transaction;
6. send optional email and SMS notifications;
7. return the eligibility and quote result to the homeowner.

The new jurisdiction guard must run before duplicate lookup. Otherwise an unsupported retry could return a historical lead and its stored SEAI result even after new submissions are blocked.

### Downstream reuse

| Workflow or surface | Current reuse and risk |
| --- | --- |
| Homeowner result | Shows eligibility label, grant deduction, net cost after grant, recommended action, and summary from the intake response. |
| Installer dashboard and lead list | Shows county/Eircode and `likelyEligible`; dashboard metrics count false eligibility as a concern but do not understand unsupported jurisdiction. |
| Lead detail | Shows address, eligibility, risks, quote grant likelihood, grant deduction, and copyable lead summary. |
| Customer portal | Shows the persisted address and grant/workflow progress for the lead. |
| Application pack | Treats any non-empty county as complete and includes stored eligibility, risk, grant, and quote data. |
| Submission package | Labels the scheme as the SEAI Solar Electricity Grant and exports address, eligibility, and quote data. |
| Portal-fill preview | Exports county/Eircode and estimated net cost after grant for manual SEAI use. |
| Authenticated lead API | Returns raw location and historical eligibility fields without a jurisdiction-safe derived state. |
| Email and SMS | Notify the installer with county and quote/grant-derived values. |
| CRM score and reporting | Award points for address/county/MPRN completeness and positive eligibility; do not classify jurisdiction. |

There is no customer-ready proposal implementation in the current baseline. Any future proposal or generated-document merge contract must consume the jurisdiction-safe representation rather than raw historical eligibility fields.

### Existing-record evidence

No tracked seed, migration, test fixture, JSON export, CSV, SQLite, or other repository-held data file contains a Northern Ireland property record. The tracked seed creates Republic of Ireland examples only. This does **not** prove that deployed databases contain no NI records: the current public and AI API contracts have permitted them.

Production data was not queried and must not be queried as part of this documentation task. Before implementation rollout, an authorised operator should use an environment-safe, read-only aggregate check for exact NI county values. The result should be a count by environment and organisation, not exported homeowner data.

### Existing test coverage

- `tests/platform/lead-form-validation.test.ts` proves that a Dublin submission passes, invalid MPRN and consent fail, document limits match the UI, and unknown fields are rejected. It does not test NI counties, missing county, arbitrary Eircode, or jurisdiction conflicts.
- `tests/platform/lead-form-error-visibility.test.ts` covers step error visibility and includes location field names, but not jurisdiction behaviour or draft restoration.
- PostgreSQL integration fixtures use Republic of Ireland counties while testing tenant isolation, permissions, workflows, provisioning, and rehearsal cleanup. They do not test location policy.
- No dedicated tests cover `runRulesBasedEligibility` or `buildSolarQuoteEstimate` against property jurisdiction.
- No route-level test proves that direct `/api/intake` or `/api/ai/eligibility` bypass attempts are refused before side effects.
- No desktop/mobile browser test covers an unsupported location outcome.

## Approved Product Behaviour

The following behaviour is approved for implementation. It becomes Active product behaviour only after the application implementation is shipped and verified.

| Situation | Required behaviour |
| --- | --- |
| Republic of Ireland property | Continue the existing intake. Eligibility and estimate calculations may run after all other validation passes. |
| Northern Ireland property | Stop the SEAI path as soon as the county is selected or an explicit NI conflict is detected. Show the unsupported-route explanation. Do not calculate or display an SEAI eligibility conclusion or grant deduction. Do not persist a lead, create workflow/audit records tied to a lead, notify an installer, or call AI. |
| Missing county | Keep the homeowner on the property step with a clear required-field message. Server requests return the existing structured field-validation response with HTTP 400. |
| Unknown county value | Treat as invalid input, not as Northern Ireland. Do not persist or calculate. Direct API requests return HTTP 400. |
| Valid ROI county and no Eircode | Continue. Eircode remains optional for the pilot. |
| Malformed supplied Eircode | Ask the homeowner to correct or remove it. Server requests return HTTP 400. Do not infer a jurisdiction from arbitrary malformed text. |
| NI county or an explicit `BT` postcode signal | Classify as Northern Ireland and return the unsupported outcome. |
| ROI county combined with an explicit NI signal | Treat as conflicting/ambiguous location. Ask the homeowner to correct county or postcode. Do not calculate, persist, notify, or call AI. Server returns HTTP 422 with a stable ambiguity code. |
| Free-text address appears inconsistent | Do not guess from address words. Rely on the explicit county and validated postcode signal; leave manual address verification to the installer after a supported submission. |
| Restored draft with NI county | Preserve the visible old value, classify it immediately after hydration, and show the unsupported outcome. Do not silently clear it or allow progression into grant previews. |
| Restored draft with a no-longer-recognised county | Preserve it long enough to explain that the location must be selected again, then require a valid current value before progression. |
| Direct API bypass | Enforce the same deterministic classifier on the server before duplicate lookup and every eligibility, quote, AI, persistence, or notification side effect. Browser behaviour is never trusted as enforcement. |
| Pre-existing NI record | Preserve the stored record and tenant ownership. Derive `NORTHERN_IRELAND` at read/export time, label it unsupported for the SEAI route, suppress positive SEAI conclusions and stored grant deductions from customer/installer outputs, and require manual correction or a non-SEAI process outside this feature. Do not delete, rewrite, or silently reclassify source data. |
| Pre-existing unknown or contradictory record | Display a location-review warning and suppress definitive SEAI conclusions until corrected. Preserve historical values and audit evidence. |

Unsupported properties are not an alternate lead type in this PR. Capturing a non-SEAI enquiry, obtaining contact consent for it, assigning it to an installer, or building a Northern Ireland workflow requires a separate approved product specification.

## UX Behaviour

### Northern Ireland message

Use this meaning in plain, non-technical language:

> This grant assistant currently supports properties in the Republic of Ireland for the SEAI Solar Electricity Grant. A property in Northern Ireland cannot continue through this SEAI grant check. You can change the county if it was selected by mistake, or contact a local solar installer or energy-advice service about options available for the property.

The message must not say that the homeowner is generally ineligible for solar support, must not name or promise a Northern Ireland scheme, and must not imply that Clada Systems currently provides a Northern Ireland service.

Provide a primary **Change county** action. Any external energy-advice link requires separate content review and is not required for the smallest implementation.

### Missing, invalid, and ambiguous messages

- Missing county: **Choose the county where the property is located.**
- Unknown county: **Choose a county from the list.**
- Malformed optional Eircode: **Enter a valid Eircode or leave this field blank.**
- Conflicting county/postcode: **The county and postcode do not appear to describe the same jurisdiction. Check both before continuing.**

These are correction messages, not eligibility conclusions.

### Interaction requirements

- Retain all 32 counties in one selector, separated into clearly labelled Republic of Ireland and Northern Ireland groups.
- Label the Northern Ireland group as not currently supported by the SolarGRANT Pro SEAI grant assistant. Selecting an NI county must produce the dedicated unsupported-route explanation rather than a generic invalid-field message.
- Show the unsupported state on the first property step before grant previews or later contact/consent collection.
- Preserve focus and error-summary behaviour used by the current form.
- Announce the unsupported state to assistive technology.
- Do not use colour alone to communicate it.
- Keep the action and explanation readable without horizontal scrolling at 375 px.
- A restored draft must not flash an SEAI grant estimate before the jurisdiction is classified.
- Keep the approved guidance text-only. Provide the primary **Change county** action and do not add an external advice-service link in this feature.

## Technical Design

### Canonical jurisdiction model

Add a SolarGRANT Pro-owned deterministic model equivalent to:

```ts
type SolarGrantPropertyJurisdiction =
  | 'REPUBLIC_OF_IRELAND'
  | 'NORTHERN_IRELAND'
  | 'UNKNOWN';
```

The classifier should return the jurisdiction plus a stable reason such as `SUPPORTED_COUNTY`, `NORTHERN_IRELAND_COUNTY`, `NORTHERN_IRELAND_POSTCODE`, `MISSING_COUNTY`, `UNKNOWN_COUNTY`, `INVALID_EIRCODE`, or `CONFLICTING_LOCATION`.

Maintain explicit, immutable module constants for:

- the 26 supported Republic of Ireland counties;
- the six recognised Northern Ireland counties;
- a display list composed from both sets only where the UI needs to explain unsupported routing.

Do not add these rules to Clada OS platform packages or tenant configuration. Future regional support must be introduced through an explicit product/module decision, at which point this narrow model can evolve deliberately.

### Routing signal decision

Use a combination with clear precedence:

1. **County is required and authoritative for the current pilot route.** It is explicit, already collected, understandable to users, and sufficient to distinguish the 26 supported counties from the six recognised NI counties.
2. **Eircode is optional supporting evidence.** If present, validate only a locally implemented, reviewed Eircode structure. Recognise a `BT` postcode as an explicit NI signal. Do not use an Eircode to infer or verify county without an authoritative dataset or provider.
3. **Free-text address is not a jurisdiction engine.** Validate its existing completeness constraints, but do not parse place names.
4. **Do not add a country selector for this single-jurisdiction pilot.** It adds another potentially contradictory input without improving the supported route. A future multi-region intake should add an explicit country/jurisdiction choice under its own product specification.

### Server-side boundary

The authoritative boundary is a SolarGRANT Pro service/schema invoked by both `POST /api/intake` and `POST /api/ai/eligibility` immediately after request-shape parsing and before any domain calculation or side effect.

Required response contract:

| Outcome | HTTP | Stable code | Side effects |
| --- | ---: | --- | --- |
| Supported | Continue | None | Existing flow may proceed. |
| NI property | 422 | `UNSUPPORTED_PROPERTY_JURISDICTION` | None. |
| Conflicting explicit signals | 422 | `AMBIGUOUS_PROPERTY_JURISDICTION` | None. |
| Missing/unknown/invalid field | 400 | Existing validation envelope | None. |

The 422 response may include the safe user message, `firstErrorField`, property step identifier, and request ID. It must not echo the full address, Eircode, MPRN, or other personal data.

The guard must run before duplicate lookup, pricing upsert, quote generation, AI, transaction start, lead/workflow/activity/audit creation, and notifications. `generateEligibilityAnalysis`, `runRulesBasedEligibility`, and `buildSolarQuoteEstimate` should also fail closed or require a supported-jurisdiction input so future callers cannot bypass the route-level guard.

AI output must never override deterministic jurisdiction. Unsupported input must not be sent to OpenAI.

### Client behaviour

The client may use the same SolarGRANT Pro constants/classifier to provide immediate feedback, but its result is advisory. On county or Eircode changes:

- supported values continue through ordinary field validation;
- NI values render the terminal unsupported panel and prevent step progression and preview calculations;
- ambiguous values render correction guidance;
- changing the county or removing/correcting the postcode re-evaluates the state;
- submission errors returned by the server remain the final authority.

Move any grant preview computation behind a supported-jurisdiction check. Do not calculate a zero grant and label that as the NI outcome: zero can be mistaken for an eligibility calculation, while this is an unsupported product route.

### Persistence and migration

No schema migration is recommended.

Keep `Lead.county` and `Lead.eircode` unchanged for compatibility. New supported submissions retain canonical county spelling and normalised Eircode casing/spacing. Do not rewrite historical values automatically.

For reads and exports, classify from the scalar county/Eircode fields, which remain the source property facts. Treat `structuredExportJson.property` and stored quote/eligibility JSON as historical snapshots, not as authority for current jurisdiction. A jurisdiction-safe presentation adapter should suppress or replace stale grant conclusions without deleting the stored evidence.

If implementation proves that every downstream consumer cannot safely derive this state without persistent data, stop and return for architecture review rather than introducing a migration opportunistically.

### Eligibility, quote, and downstream rules

- `REPUBLIC_OF_IRELAND`: eligibility and quote behaviour remains unchanged by this feature.
- `NORTHERN_IRELAND`: no SEAI likelihood, confidence, grant deduction, net-after-SEAI value, SEAI next action, or AI summary may be generated or presented.
- `UNKNOWN`: display location review, not an eligibility answer.
- Historical `likelyEligible`, `aiSummary`, `estimatedSeaiGrantDeduction`, and `grantLikely` fields remain stored for audit compatibility but cannot override the current deterministic jurisdiction guard.
- Submission package and portal-fill preview must refuse generation for unsupported or unknown jurisdiction with a stable safe error, because their purpose is specifically SEAI manual assistance.
- Authenticated lead API responses that are consumed as product views must include the derived jurisdiction-safe state or use the same presentation adapter; raw historical fields must not be mistaken for a current SEAI conclusion.
- Application pack, lead detail, portal, dashboard/list status, and future proposal/report consumers must use the jurisdiction-safe view. Raw location may remain visible to authorised users for correction, but positive SEAI claims must be suppressed.
- CRM scoring must not award grant-readiness or positive-eligibility points to unsupported/unknown records. Whether the record remains a commercial solar lead is outside this PR; historical records should be visibly held for manual handling.
- The single jurisdiction-safe presentation adapter and every grant-bearing downstream consumer must ship atomically. Do not deploy intake rejection while any current portal, pack, export, API, scoring, reporting, or notification path can still repeat an unsafe historical SEAI conclusion.
- If complete read-time coverage cannot be made safe within this design, stop and return for architecture review. Do not introduce a schema migration or partial workaround without approval.

### Audit and operational evidence

New unsupported public submissions are deliberately not persisted, so no lead-scoped activity or audit record exists. Emit only the existing request ID and a sanitised operational event containing the classifier outcome and installer identifier; do not log address, Eircode, MPRN, name, email, or phone.

Reading a historical unsupported record does not mutate it and therefore does not require an audit write. A later user correction feature should audit old/new jurisdiction-relevant fields and the recalculation outcome, but lead editing is outside this implementation.

Implement a dedicated narrow command named `pnpm solargrant:jurisdiction-audit` for historical-record evidence. Do not add this aggregate check to `db:status` or another unrelated database command.

The command must:

- use the repository's existing database identity, fingerprint, branch, and environment guardrails;
- be read-only and perform no updates, corrections, migrations, or record recalculation;
- refuse ambiguous, unclassified, or mismatched database targets before connecting or querying;
- support isolated Development and Preview targets;
- require the established Production operations acknowledgement and change ID before any Production execution;
- return aggregate counts only, grouped only by safe environment, organisation identifier, and jurisdiction classification where needed;
- never return or print homeowner names, addresses, Eircodes, MPRNs, emails, phone numbers, lead notes, or full records;
- remain a fixed-purpose jurisdiction audit and not accept arbitrary tables, fields, filters, SQL, or general-purpose query input.

Production execution remains outside the implementation PR unless separately and explicitly authorised. Before rollout, an authorised operator should run the command against isolated Development and Preview only.

### Backward compatibility

- Existing ROI leads, portal links, workflow instances, tenant ownership, quote snapshots, and documents remain readable.
- Existing 32-county drafts remain parseable long enough to route them; draft version need not change if the state shape is unchanged.
- Existing NI or unknown records remain stored and tenant-scoped. Their current SEAI conclusions are treated as historical unsafe output and are not repeated.
- Installer county fields remain unchanged.
- API clients that submit NI counties will change from success to HTTP 422. This is an intentional safety correction.
- API clients submitting arbitrary counties or malformed supplied Eircodes will receive HTTP 400 and must correct input.

## Test Plan

### Unit and contract tests

- all 26 Republic of Ireland counties classify as supported;
- all six Northern Ireland counties classify as unsupported;
- case and surrounding-space normalisation follows the approved API input policy;
- missing and unknown county classify as unknown/invalid;
- blank optional Eircode is accepted for an ROI county;
- reviewed valid Eircode shapes are accepted;
- malformed supplied Eircode is rejected;
- a `BT` postcode is classified as NI;
- ROI county plus explicit NI postcode is ambiguous and blocked;
- free-text address words do not silently override explicit signals;
- rules eligibility and quote estimate cannot produce SEAI output for unsupported/unknown jurisdiction;
- optional AI is not called for unsupported/unknown jurisdiction and cannot override the guard;
- restored version-1 drafts with ROI, NI, unknown, and conflicting values render the correct state without silently clearing data;
- downstream presentation adapters suppress historical positive SEAI conclusions and deductions for unsupported records.

### API and side-effect tests

- supported ROI `/api/intake` request follows the existing happy path;
- direct NI `/api/intake` request returns 422 with `UNSUPPORTED_PROPERTY_JURISDICTION`;
- direct conflicting request returns 422 with `AMBIGUOUS_PROPERTY_JURISDICTION`;
- missing/unknown/invalid input returns structured 400 field errors;
- rejected requests do not perform duplicate lookup result reuse, pricing upsert, AI calls, lead/document/workflow/activity/audit creation, or email/SMS notification;
- `/api/ai/eligibility` applies the same server boundary and safe error contract;
- submission-package and portal-fill-preview refuse a historical unsupported record;
- supported record behaviour remains unchanged.

### Existing-record and tenant tests

- tenant A can see only its own historical unsupported record through authorised views;
- tenant B cannot read or export tenant A's record;
- the unsupported classifier does not broaden tenant queries or change organisation context;
- a historical NI record remains stored with original values and displays the safe unsupported state;
- an arbitrary historical county displays location review and no definitive SEAI result;
- ROI historical records remain compatible;
- repository seed data continues to work without introducing NI examples into ordinary demo flows.

### Regression tests

- unrelated intake steps, uploads, draft save/restore, duplicate protection, and success handling continue to work;
- eligibility summaries and quote grant deductions remain correct for supported ROI cases;
- dashboard, lead list/detail, portal address, application pack, notifications, scoring, and authorised exports retain ROI behaviour;
- tenant isolation, authentication, provisioning, recovery, and workflow tests remain unchanged and passing.

### Browser verification

Verify the public intake at desktop and 375 px mobile widths:

1. ROI selection progresses and completes normally.
2. NI selection stops on the property step with the approved explanation and working **Change county** action.
3. Correcting NI to ROI removes the unsupported state and permits progression.
4. Restoring an NI draft shows the unsupported state without a grant-estimate flash.
5. Keyboard focus and screen-reader announcement reach the message.
6. Invalid and conflicting fields remain visible and do not cause horizontal overflow.

Use only an isolated Development database for any persistence verification. Do not use a shared database.

## Smallest Safe Implementation Plan

Implement one focused application PR after this approved documentation is accepted through final review.

### Likely files to add or change

| Area | Likely files |
| --- | --- |
| Canonical module rule | Add `lib/solargrant-jurisdiction.ts`; amend `lib/types.ts` only to replace the ambiguous 32-county product type/imports. |
| Server validation | `lib/validation.ts`, `lib/lead-form-flow.ts`, `app/api/intake/route.ts`, `app/api/ai/eligibility/route.ts`. |
| Client routing | `components/LeadForm.tsx` and existing styles in `app/globals.css` only if needed. |
| Eligibility and quotes | `lib/eligibility.ts`, `lib/quote-estimate.ts`, `lib/ai.ts`. |
| Historical safe view | A focused jurisdiction-safe adapter plus direct consumers in `lib/application-pack.ts`, `lib/submission-package.ts`, lead/dashboard/list pages, and `app/portal/[token]/page.tsx`. Prefer one adapter over repeated conditionals. |
| Scoring/reporting | `lib/crm.ts`, `lib/dashboard-metrics.ts` if current positive eligibility would otherwise survive for historical unsupported records. |
| Historical audit command | Add a narrow `scripts/solargrant-jurisdiction-audit.ts` entry point and `solargrant:jurisdiction-audit` package script using existing database safety helpers; add command-contract and guardrail tests. |
| Tests | Add `tests/platform/solargrant-jurisdiction.test.ts`; amend `lead-form-validation.test.ts`; add focused eligibility/quote/API boundary tests; add only the integration fixture needed to prove no cross-tenant impact. |
| Documentation | Mark this specification Active and update relevant current-state documentation only when implementation ships. |

### Sequence

1. Add the module-owned constants, classifier, typed outcomes, and tests.
2. Add server validation and stable 400/422 contracts before every side effect in both APIs.
3. Gate client progression and grant previews; support old drafts.
4. Make eligibility, quote, and AI functions fail closed.
5. Add one jurisdiction-safe adapter for stored records and apply it atomically to every grant-bearing downstream output.
6. Add the dedicated guarded, read-only `solargrant:jurisdiction-audit` command.
7. Add direct API, side-effect, historical compatibility, audit-command, tenant, and browser tests.
8. Run the existing repository validation plus targeted manual desktop/mobile verification in isolated Development.

### Rollout

- Deploy to isolated Preview first.
- Run `pnpm solargrant:jurisdiction-audit` against isolated Development and Preview; do not execute it against Production without separate explicit authorisation.
- Verify both a supported new intake and a synthetic historical unsupported record in Preview.
- Confirm optional AI is not called for blocked requests.
- Review server metrics for the stable unsupported/ambiguous outcome codes without logging property data.
- Use normal rollback for the application deployment. No database rollback is expected because no migration is planned.

### Risks

| Risk | Mitigation |
| --- | --- |
| Removing NI options produces only a generic invalid form | Keep recognised NI counties available to the routing classifier and show a dedicated explanation. |
| Client-only block is bypassed | Enforce before every server calculation and side effect. |
| Duplicate lookup returns an old unsafe result | Classify before duplicate lookup. |
| AI reintroduces a positive conclusion | Never call AI for unsupported/unknown input and do not permit AI to override jurisdiction. |
| Stored snapshots keep leaking old grant deductions | Use scalar location facts and one jurisdiction-safe read/export adapter; test every grant-bearing downstream surface. |
| Eircode is treated as a county database | Validate structure/conflict only; do not infer county without approved reference data. |
| Historical NI count is unknown | Use only the dedicated guarded, aggregate-only jurisdiction audit command during rollout; preserve records regardless of count. |
| New module rule leaks into Clada OS | Keep constants, codes, and copy under SolarGRANT Pro ownership. |

### Explicit non-goals

- storing an NI sales lead;
- contacting the homeowner or installer after an unsupported outcome;
- suggesting a specific NI grant;
- changing historical source values or recomputing them in a migration;
- validating installer business counties;
- adding country tables, geocoding, mapping, external APIs, or a generic jurisdiction framework;
- editing existing lead facts;
- changing tenant identity, authentication, provisioning, recovery, or database environment configuration.

## Approved Decision Record

| Decision | Approved outcome |
| --- | --- |
| Public county selector | Retain all 32 counties and separate them into clearly labelled Republic of Ireland and Northern Ireland groups. Label NI as not currently supported by the SolarGRANT Pro SEAI grant assistant. An NI selection receives the dedicated unsupported-route explanation, never a generic invalid-field outcome. |
| Northern Ireland next step | Use text-only neutral guidance, the plain-language explanation, and the primary **Change county** action. Do not add an external advice-service link or imply support for NI services or grant schemes. An external link requires separate future content review. |
| Historical-record audit | Add the dedicated, narrow `pnpm solargrant:jurisdiction-audit` command with existing database identity and environment guardrails, aggregate-only output, explicit Production controls, no personal data, no writes, and no general-query capability. Production execution is not authorised by this implementation plan. |

These decisions were approved by CTO direction on 2026-07-21. They resolved the design choices previously listed for review; approval alone did not activate application behaviour.

## Implementation Record

The active implementation:

- classifies the 26 Republic of Ireland counties, the six recognised Northern Ireland counties, missing or unknown county values, reviewed Eircode shapes, and explicit `BT` conflict signals in one SolarGRANT Pro jurisdiction module;
- groups all 32 public county options, stops Northern Ireland journeys on the property step, reclassifies restored drafts before grant previews, and provides accessible correction and focus behaviour;
- enforces the same deterministic boundary in `/api/intake`, `/api/ai/eligibility`, rules eligibility, quote calculation, and AI fallback before lookup, mutation, persistence, workflow, audit, or notification work;
- applies one read-time presentation adapter across tenant-scoped lead API, dashboard metrics and lists, detail and copy/export views, homeowner portal, application pack, submission package, portal-fill preview, CRM scoring, and notification boundaries;
- keeps historical source facts stored while suppressing current positive SEAI conclusions for Northern Ireland and requiring location review for unknown or contradictory records;
- adds a fixed-purpose, read-only `pnpm solargrant:jurisdiction-audit` command that emits aggregate organisation/jurisdiction counts only and retains the existing environment and Production-operation controls.

Validation completed on 2026-07-21 with lint, typecheck, 145 unit tests, 43 PostgreSQL integration tests, Prisma format/validate/generate, a production build, diff and sensitive-data checks, and live desktop/375 px browser verification. All 14 existing migrations applied successfully to a new disposable local PostgreSQL 16 database. No Production, Preview, or Development database was queried and no migration was added.

## Acceptance Criteria

The approved implementation must satisfy all of the following:

- the county-based Republic of Ireland boundary and optional Eircode supporting role are approved;
- server enforcement precedes duplicate lookup and all calculations/side effects;
- NI and ambiguous requests have stable safe contracts and no persistence;
- all downstream outputs have an explicit historical-record rule;
- no schema migration or platform generalisation is introduced;
- one jurisdiction-safe presentation adapter covers all grant-bearing downstream consumers in the same atomic implementation;
- the dedicated jurisdiction audit command satisfies its environment, Production-control, aggregate-output, no-PII, and read-only contract;
- implementation returns for architecture review if safe read-time coverage proves impractical;
- the test plan proves ROI behaviour, direct bypass refusal, draft compatibility, existing-record safety, tenant isolation, and desktop/mobile UX.

## Documentation Updates

- Add this specification to [Feature Specifications](README.md) and the [Clada Operating Manual Summary](../SUMMARY.md).
- When application implementation is merged and verified, change this document from Approved to Active and update [SolarGRANT Pro Module](../01-product/SOLARGRANT_PRO_MODULE.md) and [Architecture Overview](../03-engineering/ARCHITECTURE_OVERVIEW.md) to describe the enforced route.
- Do not update the active sprint or implement application changes in this documentation PR.

## Related Documents

- [Clada Systems Constitution](../CONSTITUTION.md)
- [The Clada Way](../THE_CLADA_WAY.md)
- [Module Architecture](../01-platform/MODULE_ARCHITECTURE.md)
- [Platform API Philosophy](../01-platform/PLATFORM_API_PHILOSOPHY.md)
- [SolarGRANT Pro Module](../01-product/SOLARGRANT_PRO_MODULE.md)
- [Engineering Standards](../03-engineering/ENGINEERING_STANDARDS.md)
- [SolarGRANT Pro Product and UX/UI Audit V1](../product/audits/SOLARGRANT_PRO_PRODUCT_UX_AUDIT_V1.md)

## What Next

Complete CTO review of the focused implementation pull request. Production rollout and any authorised aggregate Production audit remain separate operational decisions.
