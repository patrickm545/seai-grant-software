# Truthful dashboard data and empty states

## Runtime data

The authenticated dashboard no longer substitutes hard-coded homeowner records when an organisation has no leads. Lead rows, hot leads, follow-ups, recent activity, KPI values, and pipeline counts are sourced only from organisation-scoped database queries. The non-zero tracked-county fallback was removed from all authenticated dashboard surfaces, and zero is rendered as `0`.

## KPI definitions

- **Active Leads**: leads whose persisted pipeline stage is neither `WON` nor `LOST`.
- **Hot Leads**: active leads whose persisted lead score is `HOT`.
- **Applications Submitted**: leads with a persisted status of `SUBMITTED`, `INSTALLATION_PENDING`, `PAYMENT_DOCS_PENDING`, or `COMPLETED`. This does not claim an SEAI approval.
- **Leads Without Documents**: leads with no related uploaded document records. This does not claim that a document checklist is incomplete.
- **Open Blockers**: leads in a review status, with works already started, or explicitly assessed as not likely eligible.
- **Eligibility Concerns**: leads with works already started, a prior solar grant at the MPRN, or an explicit not-likely-eligible assessment. This replaces the unclear “Liability Leads” label.

“Tracked Counties” was removed because it does not guide a daily action. No authoritative SEAI approval event is stored, so the former “SEAI Approvals” label was removed.

## Pipeline and empty states

The full eight-stage CRM pipeline workflow is the single retained pipeline-count visualisation. It uses organisation-scoped lead records and shows `0 leads` for an empty stage. The duplicate summary-card row was removed.

An organisation with no leads receives a primary “No leads yet” state explaining that homeowner enquiries arrive through the existing intake form, with safe open and copy-link actions. Those actions include the authenticated organisation's installer ID so a submitted enquiry is stored under the intended tenant. Hot leads, follow-ups, activity, and lead-table panels show neutral empty copy. A filter with no matches shows “No leads match this filter” and a reset action, distinct from the whole-organisation state. No manual lead-creation action is presented.

## Tests

Deterministic platform tests cover zero metrics and pipeline stages, populated metric definitions, removal of runtime sample/fallback paths, the retained pipeline treatment, and distinct organisation/filter empty states. Existing lead-access and PostgreSQL tenant-isolation tests continue to cover organisation-scoped lead, document, and activity access.
