# AI Engineering Rules

| Field | Value |
| --- | --- |
| Document ID | ENG-AI-001 |
| Status | Active |
| Owner | Clada Systems Engineering |
| Review cycle | Monthly during Foundation Release 1.0, then quarterly |
| Last reviewed | 2026-07-09 |

These rules apply to AI coding agents and humans using AI assistance.

## Required Reading

Before changing code, AI agents must read:

1. `docs/README.md`
2. `docs/CONSTITUTION.md`
3. `docs/THE_CLADA_WAY.md`
4. `docs/01-platform/README.md` for platform or module-boundary changes
5. `docs/06-sprints/ACTIVE_SPRINT.md`
6. relevant feature specs
7. relevant ADRs
8. nearby source code

## Change Rules

- Do not build product features without a feature specification or explicit human instruction.
- Do not redesign unrelated functionality.
- Do not introduce new platform terminology that conflicts with Clada OS.
- Do not treat SolarGRANT Pro as the company or platform.
- Do not change security, privacy, data retention, or automation posture without documentation.
- Keep edits scoped and reviewable.
- Update documentation whenever implementation changes the documented system.

## Verification Rules

AI-assisted changes must be verified like any other change. Run the relevant test, lint, build, or manual verification step when feasible. If verification cannot be run, state that clearly.

## Escalation

Stop and ask for human direction when a change would alter constitutional intent, compliance posture, customer commitments, or the meaning of Clada OS.
