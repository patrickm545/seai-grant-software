# Clada OS Roadmap

| Field | Value |
| --- | --- |
| Document ID | PROD-ROADMAP-001 |
| Status | Proposed |
| Owner | Clada Systems Product |
| Review cycle | Quarterly |
| Last reviewed | 2026-07-24 |

This roadmap is a supporting planning reference. It does not override the [Company Strategy](../00-company/strategy.md), [Clada OS Product Model](../01-product/CLADA_OS_PRODUCT_MODEL.md), or active sprint documents.

## Required Pre-Pilot Authentication Gate

Before the first 5–10 external installer users are onboarded, SolarGRANT Pro must implement the [self-service password reset specification](../04-features/FEAT-PRE-PILOT-SELF-SERVICE-PASSWORD-RESET.md) and [ADR-0023](../05-decisions/ADR-0023-self-service-password-reset-security-boundary.md). Reset email delivery, shared abuse controls, Preview security acceptance, Production verification, normal login health, and the ADR-0022 exceptional recovery runbook must all pass. This gate takes precedence over feature sequencing below and is not optional technical debt.

## Phase 0: Foundation

Goal: make the repository safe and consistent for future Codex sprints.

- Rebrand project documentation to Clada OS
- Add company, product, design, engineering, and sprint docs
- Document current SolarGRANT Pro functionality
- Define feature decision rules
- Define design and engineering guardrails

## Phase 1: App shell and product structure

Goal: create a clean Clada OS foundation without breaking the current lead funnel.

- App shell
- Navigation structure
- Dashboard layout
- Shared UI patterns
- Product naming cleanup
- Route structure review
- Basic design system implementation

## Phase 2: CRM core

Goal: turn the admin area into a practical installer CRM.

- Lead pipeline
- Lead statuses
- Lead owner or assignee field
- Follow-up notes
- Contact history
- Lead priority
- Simple filtering and search
- Approved authenticated minimum Manual Lead Creation into the canonical lead workspace under Accepted ADR-0021; implementation not begun

## Phase 3: Lead intake and qualification

Goal: improve lead quality without making the homeowner form too long.

- Refined homeowner form
- Stronger lead scoring
- Better result page
- Cleaner installer summary
- Optional customer consent fields
- Improved notification content

## Phase 4: Quote and proposal workflow

Goal: help installers move from lead to quote faster.

- Quote estimate view
- Recommended system summary
- Grant estimate section
- Proposal notes
- Quote status tracking
- Export or copy summary

## Phase 5: Grant and document workflow

Goal: make SEAI-related admin easier to track.

- Grant checklist
- Missing document tracker
- Customer upload requirements
- Application status
- Internal admin notes

## Phase 6: Customer portal

Goal: give homeowners visibility and reduce installer admin.

- Customer progress page
- Document requests
- Status updates
- Message history
- Next step explanation

## Phase 7: AI assistance

Goal: add helpful AI where it supports real workflows.

- Lead summary drafts
- Customer follow-up drafts
- Proposal wording support
- Admin task summaries
- Risk and delay prompts

AI features should not be added until the core workflow is strong.
