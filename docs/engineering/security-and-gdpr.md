# Security and GDPR

| Field | Value |
| --- | --- |
| Document ID | ENG-SECURITY-GDPR-001 |
| Status | Active |
| Owner | Clada Systems Engineering |
| Review cycle | Quarterly |
| Last reviewed | 2026-07-24 |

## Purpose

Clada OS handles business and customer information, so trust must be treated as a core product requirement.

## Rules

- Do not commit private environment values.
- Use environment variables for sensitive configuration.
- Keep customer data collection limited to information that supports the workflow.
- Avoid collecting unnecessary sensitive information.
- Make data handling clear to business users and customers.
- Protect business-only areas.
- Treat production data carefully during debugging.

## GDPR principles

- Collect only what is needed.
- Explain why customer information is requested.
- Store information securely.
- Restrict access to users who need it.
- Allow future deletion and export workflows to be added.
- Keep auditability in mind for important business actions.

## Product implications

Forms should ask for practical sales and workflow information, not excessive personal data.

Customer portals and upload features should be designed with privacy, access control, and clear consent in mind.

## Tenant Boundary Requirements

Platform Release 1.1 treats organisation boundaries as a security requirement:

- organisation-owned records must have an organisation owner;
- lead records must reference an installer owned by the same organisation, enforced by a PostgreSQL composite foreign key;
- server-side code must resolve active organisation context before reading or writing organisation-owned records;
- client-supplied organisation IDs are not trusted without membership validation;
- missing, inactive, or invalid organisation membership fails closed;
- cross-organisation access should return safe unavailable or unauthorized responses without revealing whether another organisation's record exists;
- tenant isolation must be verified with database-backed PostgreSQL integration tests for security-sensitive boundaries;
- audit actor and organisation ownership remain known hardening work for Platform Release 1.2.

## Authorisation And Audit Requirements

Platform Release 1.2 adds the first reusable authorisation and typed audit foundation:

- organisation membership does not automatically grant every action;
- protected server-side actions must require an explicit permission;
- tenant ownership and action permission are separate checks and both must pass;
- client-supplied roles, permissions, user IDs, membership IDs, and organisation IDs are not authoritative;
- inactive users, inactive memberships, inactive organisations, missing actors, and missing organisation context fail closed;
- internal administrative access must be explicit, membership-scoped, permission-controlled, and auditable;
- successful protected actions should write typed audit events with actor, organisation, membership, user, resource, source, outcome, and timestamp where available;
- audit metadata must not store passwords, secrets, tokens, full document contents, or excessive personal data;
- public homeowner portal access remains token-scoped and must not gain organisation permissions.

## Sprint requirement

Self-service password reset is required before the first external installer pilot. Its public request must resist account enumeration; reset tokens and passwords must not enter logs, audit metadata, analytics, URLs after exchange, or persistent plaintext storage; environment-specific links must use an allowlisted canonical origin; all sessions must be revoked atomically on completion; and terminal reset records are retained for 30 days before deletion. [ADR-0023](../05-decisions/ADR-0023-self-service-password-reset-security-boundary.md) and the [reset threat model](../03-engineering/SELF_SERVICE_PASSWORD_RESET_THREAT_MODEL.md) govern this boundary.

Platform Release 1.5 PR 2 manual lead collection is not approved for Production until Clada Systems records the ADR-0021 wording, purpose/lawful basis, retention/deletion, follow-up contact, access/correction, sensitive-note, and pilot-minimisation decisions. Implementation and synthetic disposable verification do not complete that gate.

Manual Lead Creation is technically fail-closed in every application environment. Only exact explicit enablement at the platform configuration boundary opens the UI and protected service; Production and Preview remain closed by default and require Project Shield plus the relevant company/privacy owner’s recorded operational approval. The service denies a direct call before replay lookup or writes, and denial does not create normal lead/audit success evidence or log submitted personal data. This control is not a declaration of GDPR compliance or certification.

Any sprint that changes login, customer data, forms, uploads, business access, or storage must mention security and GDPR impact in the sprint notes.
