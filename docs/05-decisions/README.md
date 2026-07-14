# Architecture Decision Records

| Field | Value |
| --- | --- |
| Document ID | ADR-INDEX-001 |
| Status | Active |
| Owner | Clada Systems Engineering |
| Review cycle | Monthly during Foundation Release 1.0, then quarterly |
| Last reviewed | 2026-07-14 |

Architecture Decision Records (ADRs) capture decisions that materially affect platform architecture, product boundaries, technical standards, data handling, security, automation, or long-term maintainability.

## ADR Index

- [ADR-0001-clada-os-terminology.md](ADR-0001-clada-os-terminology.md): establish Clada OS terminology and SolarGRANT Pro module boundary.
- [ADR-0002-organisation-tenant-model.md](ADR-0002-organisation-tenant-model.md): define organisation as the initial Clada OS tenant boundary.
- [ADR-0003-actor-and-membership-model.md](ADR-0003-actor-and-membership-model.md): define minimal user, actor, and membership concepts.
- [ADR-0004-existing-authentication-integration.md](ADR-0004-existing-authentication-integration.md): adapt current admin authentication into identity context.
- [ADR-0005-tenant-aware-data-access.md](ADR-0005-tenant-aware-data-access.md): require organisation context for tenant-owned data access.
- [ADR-0006-existing-data-migration.md](ADR-0006-existing-data-migration.md): migrate existing SolarGRANT Pro data to installer organisations.
- [ADR-0007-role-and-permission-model.md](ADR-0007-role-and-permission-model.md): define platform roles, permission naming, and role-to-permission mapping.
- [ADR-0008-authorisation-enforcement-boundary.md](ADR-0008-authorisation-enforcement-boundary.md): define where protected service boundaries enforce permissions and resource ownership.
- [ADR-0009-actor-aware-audit-model.md](ADR-0009-actor-aware-audit-model.md): define typed actor-aware audit attribution and compatibility with existing records.
- [ADR-0010-internal-administrative-access.md](ADR-0010-internal-administrative-access.md): define explicit internal administrative access rules.
- [ADR-0011-workflow-foundation-architecture.md](ADR-0011-workflow-foundation-architecture.md): define the minimum persisted workflow foundation.
- [ADR-0012-workflow-transition-validation-boundary.md](ADR-0012-workflow-transition-validation-boundary.md): define server-side transition validation responsibility.
- [ADR-0013-workflow-history-model.md](ADR-0013-workflow-history-model.md): define workflow history and audit relationship.
- [ADR-0014-product-workflow-consumption-boundary.md](ADR-0014-product-workflow-consumption-boundary.md): define how product modules consume workflow foundation.
- [ADR-0015-document-domain-ownership-and-resource-linking.md](ADR-0015-document-domain-ownership-and-resource-linking.md): define generated-document domain, organisation ownership, product namespacing, resource links, lifecycle, and existing-document compatibility.

Platform-specific ADR navigation is maintained in [../01-platform/PLATFORM_ADR_INDEX.md](../01-platform/PLATFORM_ADR_INDEX.md).

## When To Write An ADR

Write an ADR when a decision:

- changes architectural direction,
- introduces or removes a major dependency,
- changes the data model in a meaningful way,
- affects trust, security, privacy, or compliance,
- defines a reusable Clada OS boundary,
- intentionally diverges from existing standards.

## Template

Use [ADR_TEMPLATE.md](ADR_TEMPLATE.md).
