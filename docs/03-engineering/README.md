# Engineering

| Field | Value |
| --- | --- |
| Document ID | ENG-INDEX-001 |
| Status | Active |
| Owner | Clada Systems Engineering |
| Review cycle | Monthly during Foundation Release 1.0, then quarterly |
| Last reviewed | 2026-07-24 |

This section defines engineering standards, architecture context, and AI-assisted development rules for Clada OS.

Platform capability ownership and dependency rules are defined in [../01-platform/README.md](../01-platform/README.md).

## Documents

- [ARCHITECTURE_OVERVIEW.md](ARCHITECTURE_OVERVIEW.md): current system shape and platform direction.
- [ENGINEERING_STANDARDS.md](ENGINEERING_STANDARDS.md): implementation expectations.
- [AI_ENGINEERING_RULES.md](AI_ENGINEERING_RULES.md): rules for AI coding agents and AI-assisted work.
- [POSTGRES_INTEGRATION_TESTS.md](POSTGRES_INTEGRATION_TESTS.md): disposable PostgreSQL setup for database-backed integration tests.
- [DATABASE_ENVIRONMENT_SAFETY.md](DATABASE_ENVIRONMENT_SAFETY.md): environment classification, safe fingerprints, and Vercel/Neon isolation contract.
- [DATABASE_OPERATIONS_RUNBOOK.md](DATABASE_OPERATIONS_RUNBOOK.md): guarded commands, migration gate, recovery verification, and smoke checks.
- [INCIDENT_2026_07_23_PRODUCTION_AUTH_503.md](INCIDENT_2026_07_23_PRODUCTION_AUTH_503.md): Production authentication schema-drift incident, recovery evidence, and preventive actions.
- [PILOT_AUTHENTICATION.md](PILOT_AUTHENTICATION.md): pilot login, tenant context, provisioning, revocation, and deployment operations.
- [PRODUCTION_LEGACY_CREDENTIAL_REISSUE_RUNBOOK.md](PRODUCTION_LEGACY_CREDENTIAL_REISSUE_RUNBOOK.md): proposed CTO-gated, dry-run-first recovery procedure for an eligible active legacy Production pilot owner.
- [SOLARGRANT_PRO_PILOT_ONBOARDING_RUNBOOK.md](SOLARGRANT_PRO_PILOT_ONBOARDING_RUNBOOK.md): proposed pilot approval, provisioning, secure delivery, activation, smoke-test, and support workflow.
- [TENANT_PROVISIONING_IMPLEMENTATION_PLAN.md](TENANT_PROVISIONING_IMPLEMENTATION_PLAN.md): proposed five-PR delivery sequence, risks, tests, gates, and approval decisions.
- [TECHNICAL_DEBT_REGISTER.md](TECHNICAL_DEBT_REGISTER.md): durable technical debt register for platform and repository risks.

## Engineering Rule

Read documentation before implementation. If a change creates a new architectural decision, document it before or with the code.
