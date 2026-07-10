# Active Sprint

| Field | Value |
| --- | --- |
| Document ID | SPRINT-ACTIVE-001 |
| Status | Active |
| Owner | Clada Systems Product and Engineering |
| Review cycle | Every sprint |
| Last reviewed | 2026-07-10 |

## Sprint

Platform Release 1.2 - Users, Roles, Permissions and Audit Foundation.

## Objective

Implement the minimum reusable Clada OS authorisation and audit foundation required to support secure multi-user operation, proved through one protected SolarGRANT Pro workflow.

## In Scope

- platform role foundation
- platform permission catalogue
- server-side permission evaluation
- default-deny authorisation helpers
- actor-aware audit-event foundation
- organisation and membership attribution in audit records
- protected service boundary for a SolarGRANT Pro proving slice
- automated unit and PostgreSQL integration tests
- COM, ADR, feature specification, sprint, security, and debt documentation updates
- pull request to `main`

## Out Of Scope

- enterprise SSO
- user invitations
- self-service user administration
- custom roles
- broad ABAC or policy scripting
- billing or subscription permissions
- workflow, document, notification, AI, reporting, marketplace, or SDK implementation
- broad UI redesign
- Platform Release 1.3 implementation

## Definition Of Done

Platform Release 1.2 is complete when the role, permission, authorisation, and audit foundations are specified, implemented, tested, documented, validated, and proved through the SolarGRANT Pro protected workflow slice; a draft pull request is opened to `main`; and Platform Release 1.3 has not begun.
