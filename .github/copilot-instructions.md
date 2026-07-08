# Clada OS AI Engineering Instructions

This repository is governed by the Clada Operating Manual.

Before changing code, read:

1. `docs/README.md`
2. `docs/CONSTITUTION.md`
3. `docs/THE_CLADA_WAY.md`
4. `docs/06-sprints/ACTIVE_SPRINT.md`
5. relevant feature specs under `docs/04-features/`
6. relevant ADRs under `docs/05-decisions/`
7. relevant engineering standards under `docs/03-engineering/`

Rules:

- Clada Systems is the company.
- Clada OS is the platform.
- SolarGRANT Pro is the first product module.
- Do not treat SolarGRANT Pro as the overall platform.
- Do not perform unsafe global replacements.
- Do not build product features without a feature spec or explicit human instruction.
- Do not redesign unrelated functionality.
- Keep changes small and focused.
- Update documentation when implementation changes behaviour, architecture, operations, security, privacy, or release process.
- Use ADRs for material architecture decisions.
- Preserve human review around AI, automation, customer data, and submission workflows.

When implementation and documentation conflict, update documentation first or create an ADR explaining the decision.
