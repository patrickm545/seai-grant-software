# Active Sprint

| Field | Value |
| --- | --- |
| Document ID | SPRINT-ACTIVE-001 |
| Status | Active |
| Owner | Clada Systems Product and Engineering |
| Review cycle | Every sprint |
| Last reviewed | 2026-07-10 |

## Sprint

Project Atlas: Platform Release 1.1 - Identity and Organisation Foundation.

## Objective

Implement the minimum Clada OS identity and organisation foundation, validated through a SolarGRANT Pro lead proving slice.

## In Scope

- organisation model
- user and membership model
- actor context definitions
- existing admin-auth adapter into identity context
- tenant-aware access helpers
- installer and lead organisation ownership
- migration for existing installer and lead data
- SolarGRANT Pro lead proving slice
- tenant isolation tests
- feature specs, ADRs, and COM updates

## Out Of Scope

- full authentication replacement
- enterprise SSO
- invitations
- complex roles and permissions
- billing, subscriptions, marketplace tenancy, partner accounts, or SDK implementation
- workflow, document, notification, AI, or reporting platform changes
- broad UI redesign
- unrelated repository restructuring

## Definition Of Done

Platform Release 1.1 is complete when organisation ownership is implemented for the lead proving slice, tenant context is enforced server side, existing data is migrated safely, tenant isolation tests pass, COM navigation points to the release documents, and a pull request is opened to `main` without starting Platform Release 1.2.
