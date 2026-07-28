# Governance Changelog

| Field | Value |
| --- | --- |
| Document ID | GOV-REL-CHANGELOG-001 |
| Status | Active |
| Owner | Clada Systems Leadership |
| Review cycle | Every governance change |
| Last reviewed | 2026-07-28 |

This changelog records durable changes to release governance.

## ADR-0024 Pending-Evidence Capture Boundary

Date: 2026-07-28

Status: Draft PR #44; activation pending

### Pending-Evidence Controls Introduced

- Pending-attestation Production evidence uses one fixed read-only command.
- The command requires an approved change ID, named operator, distinct named
  reviewer and restore-point evidence reference.
- Exact ledger IDs and failed-log digests are retained without raw logs.
- Repeated captures are compared through a deterministic evidence digest.

### Pending-Evidence Governance Effect

Evidence capture does not activate the attestation and never authorizes
migration execution. Exact live evidence and all four genuine approvals remain
mandatory before the status can become **Production lineage accepted under
ADR-0024 attestation**.

## Migration Lineage Reconciliation Governance

Date: 2026-07-26

Status: Accepted in ADR-0024; implementation pending

### Reconciliation Controls Introduced

- Permanently missing applied migrations require an incident record and ADR.
- Historical SQL may not be fabricated from schema equivalence.
- Applied Production migration records are preserved.
- Any accepted lineage exception must bind exact database identity, full
  migration metadata, repository inventory and schema evidence.
- Fresh and upgrade migration paths require separate validation.
- Production release remains blocked until a separately approved
  attestation-aware gate and reconciliation runbook pass.

### Reconciliation Governance Effect

Migration files must be committed before application, retained immutably and
traceable to deployment artifacts. A broad or name-only safety-gate ignore list
is prohibited.

## Release Governance Framework v1.0

Date: 2026-07-12

Status: Active

### Release Framework Controls Introduced

- Release Governance Framework becomes part of the Clada Operating Manual.
- Repository documentation becomes the engineering source of truth for release decisions.
- Chat conversations are advisory unless represented in repository documentation.
- Master Release Specifications are introduced as permanent repository documents.
- Master Release Specifications are required before future platform implementation begins.
- CTO architecture review is introduced as a formal release gate.
- CEO release approval is introduced as a formal merge gate.
- The official release lifecycle is introduced from idea through roadmap update.
- CTO Review Checklist is introduced.
- CEO Release Approval checklist is introduced.
- A dedicated release specifications repository section is introduced.

### Release Framework Governance Effect

No future platform release may begin implementation from private conversation alone.

Every future platform release must be specified, reviewed, implemented, validated, approved, merged, tagged, and reflected in the roadmap through repository documentation.
