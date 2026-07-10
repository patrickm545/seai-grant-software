# Security and GDPR

| Field | Value |
| --- | --- |
| Document ID | ENG-SECURITY-GDPR-001 |
| Status | Active |
| Owner | Clada Systems Engineering |
| Review cycle | Quarterly |
| Last reviewed | 2026-07-10 |

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
- server-side code must resolve active organisation context before reading or writing organisation-owned records;
- client-supplied organisation IDs are not trusted without membership validation;
- missing, inactive, or invalid organisation membership fails closed;
- cross-organisation access should return safe unavailable or unauthorized responses without revealing whether another organisation's record exists;
- audit actor and organisation ownership remain known hardening work for Platform Release 1.2.

## Sprint requirement

Any sprint that changes login, customer data, forms, uploads, business access, or storage must mention security and GDPR impact in the sprint notes.
