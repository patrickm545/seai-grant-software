# Engineering

| Field | Value |
| --- | --- |
| Document ID | ENG-INDEX-001 |
| Status | Active |
| Owner | Clada Systems Engineering |
| Review cycle | Monthly during Foundation Release 1.0, then quarterly |
| Last reviewed | 2026-07-26 |

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
- [INCIDENT_2026_07_25_PRODUCTION_MIGRATION_HISTORY_DRIFT.md](INCIDENT_2026_07_25_PRODUCTION_MIGRATION_HISTORY_DRIFT.md): contained Production migration-lineage incident, read-only evidence, unknown root cause, and release block.
- [MIGRATION_HISTORY_RECONCILIATION_RUNBOOK.md](MIGRATION_HISTORY_RECONCILIATION_RUNBOOK.md): proposed non-executed controlled reconciliation, approvals, evidence, execution boundaries, verification, and rollback decisions.
- [ADR_0024_MIGRATION_LINEAGE_VERIFIER.md](ADR_0024_MIGRATION_LINEAGE_VERIFIER.md): implemented fail-closed inventory, ledger, schema and attestation verifier; Production activation remains separately controlled.
- [PR_44_ADR_0024_EVIDENCE_CAPTURE_PREPARATION.md](PR_44_ADR_0024_EVIDENCE_CAPTURE_PREPARATION.md): Draft PR #44 tooling-only preparation, evidence-retention boundary, deterministic disposable fingerprints and separately pending Production operation.
- [PR_45_ADR_0024_PREVIEW_EXIT_70_INVESTIGATION_2026_08_10.md](PR_45_ADR_0024_PREVIEW_EXIT_70_INVESTIGATION_2026_08_10.md): Preview-only strict-preflight exit-70 diagnosis, safe stage repair, canonical-only routing audit and disposable validation before R13.
- [PR_45_ADR_0024_PRODUCTION_EVIDENCE_R13.md](PR_45_ADR_0024_PRODUCTION_EVIDENCE_R13.md): permanently closed R13 read-only operation and typed pilot-auth checksum/zero-step stop.
- [PR_45_ADR_0024_R13_CHECKSUM_DIVERGENCE_INVESTIGATION.md](PR_45_ADR_0024_R13_CHECKSUM_DIVERGENCE_INVESTIGATION.md): exact reversible CRLF checksum classification A.
- [PR_45_ADR_0024_R13_PILOT_AUTH_LINEAGE_INVESTIGATION.md](PR_45_ADR_0024_R13_PILOT_AUTH_LINEAGE_INVESTIGATION.md): authoritative zero-step lifecycle explanation, required future catalog proof and pending governance decision.
- [PILOT_AUTHENTICATION.md](PILOT_AUTHENTICATION.md): pilot login, tenant context, provisioning, revocation, and deployment operations.
- [PRODUCTION_LEGACY_CREDENTIAL_REISSUE_RUNBOOK.md](PRODUCTION_LEGACY_CREDENTIAL_REISSUE_RUNBOOK.md): proposed CTO-gated, dry-run-first recovery procedure for an eligible active legacy Production pilot owner.
- [SELF_SERVICE_PASSWORD_RESET_THREAT_MODEL.md](SELF_SERVICE_PASSWORD_RESET_THREAT_MODEL.md): pre-pilot password-reset assets, threats, mitigations, residual risk, and required evidence.
- [SELF_SERVICE_PASSWORD_RESET_TEST_PLAN.md](SELF_SERVICE_PASSWORD_RESET_TEST_PLAN.md): unit, integration, browser, security, regression, Preview, and Production acceptance matrix.
- [SELF_SERVICE_PASSWORD_RESET_IMPLEMENTATION_PLAN.md](SELF_SERVICE_PASSWORD_RESET_IMPLEMENTATION_PLAN.md): repository findings, resolved decisions, approval gates, small-PR delivery sequence, rollout, and rollback.
- [SOLARGRANT_PRO_PILOT_ONBOARDING_RUNBOOK.md](SOLARGRANT_PRO_PILOT_ONBOARDING_RUNBOOK.md): proposed pilot approval, provisioning, secure delivery, activation, smoke-test, and support workflow.
- [TENANT_PROVISIONING_IMPLEMENTATION_PLAN.md](TENANT_PROVISIONING_IMPLEMENTATION_PLAN.md): proposed five-PR delivery sequence, risks, tests, gates, and approval decisions.
- [TECHNICAL_DEBT_REGISTER.md](TECHNICAL_DEBT_REGISTER.md): durable technical debt register for platform and repository risks.

## Engineering Rule

Read documentation before implementation. If a change creates a new architectural decision, document it before or with the code.
