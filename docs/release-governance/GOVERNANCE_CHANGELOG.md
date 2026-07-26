# Governance Changelog

| Field | Value |
| --- | --- |
| Document ID | GOV-REL-CHANGELOG-001 |
| Status | Active |
| Owner | Clada Systems Leadership |
| Review cycle | Every governance change |
| Last reviewed | 2026-07-26 |

This changelog records durable changes to release governance.

## Migration Lineage Reconciliation Governance

Date: 2026-07-26

Status: Accepted in ADR-0024; implementation pending

### Introduced

- Permanently missing applied migrations require an incident record and ADR.
- Historical SQL may not be fabricated from schema equivalence.
- Applied Production migration records are preserved.
- Any accepted lineage exception must bind exact database identity, full
  migration metadata, repository inventory and schema evidence.
- Fresh and upgrade migration paths require separate validation.
- Production release remains blocked until a separately approved
  attestation-aware gate and reconciliation runbook pass.

### Governance Effect

Migration files must be committed before application, retained immutably and
traceable to deployment artifacts. A broad or name-only safety-gate ignore list
is prohibited.

## Release Governance Framework v1.0

Date: 2026-07-12

Status: Active

### Introduced

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

### Governance Effect

No future platform release may begin implementation from private conversation alone.

Every future platform release must be specified, reviewed, implemented, validated, approved, merged, tagged, and reflected in the roadmap through repository documentation.
