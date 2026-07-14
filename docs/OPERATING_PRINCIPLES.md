# Operating Principles

| Field | Value |
| --- | --- |
| Document ID | GOV-OPS-001 |
| Status | Active |
| Owner | Clada Systems Engineering |
| Review cycle | Monthly during Foundation Release 1.0, then quarterly |
| Last reviewed | 2026-07-12 |

These principles translate the Constitution and The Clada Way into daily operating rules.

## Before Changing Code

1. Read the relevant COM documents.
2. Read the active sprint.
3. Read linked feature specifications.
4. Read linked ADRs.
5. Inspect nearby implementation and tests.
6. Keep the change focused.
7. Update documentation when behaviour, architecture, or operational practice changes.

## Release Governance

Platform release implementation may not begin from chat instructions alone.

Every future platform release must begin with a Master Release Specification stored in [release-specifications](release-specifications/README.md). Implementation may begin only after CTO architecture approval, CEO specification approval, required feature specifications, required ADRs, and sprint scope are documented.

Every platform release ends with a draft pull request, CTO review, CEO approval, merge, release tag, and roadmap update.

## Product Scope

SolarGRANT Pro is the first product module. New capabilities should be evaluated as either:

- module-specific behaviour for SolarGRANT Pro, or
- reusable Clada OS capability that can support more contractor-led workflows.

The distinction should be documented in feature specs and ADRs.

## Engineering Scope

Use the existing stack and local patterns unless a documented decision justifies change. Avoid broad rewrites, hidden behaviour changes, and unrelated redesigns.

Small focused commits are preferred. Each commit should explain a coherent unit of work.

## AI And Automation

AI-assisted work must follow the same documentation and review standards as human work. AI may help draft, inspect, implement, and test, but it must not silently change product policy, compliance posture, or architecture.

Automation involving external portals, customer data, or regulated workflows must be human-reviewed and documented before release.

## Security And Privacy

Treat trust as a product feature. Protect secrets, customer information, installer data, and operational records. Avoid logging sensitive data. Preserve auditability for workflows that affect submissions, approvals, customer communication, or business records.

## Release Readiness

A release is ready only when:

1. Scope is documented.
2. Risks are known.
3. Tests or verification steps are complete.
4. Documentation reflects the shipped state.
5. Rollback or mitigation is understood for risky changes.
