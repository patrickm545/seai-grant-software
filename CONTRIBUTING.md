# Contributing To Clada OS

Clada OS is documentation-first. Before changing product behaviour, architecture, workflow, data handling, or release process, read the Clada Operating Manual.

## Required Reading

1. [docs/README.md](docs/README.md)
2. [docs/CONSTITUTION.md](docs/CONSTITUTION.md)
3. [docs/THE_CLADA_WAY.md](docs/THE_CLADA_WAY.md)
4. [docs/06-sprints/ACTIVE_SPRINT.md](docs/06-sprints/ACTIVE_SPRINT.md)
5. Relevant feature specs and ADRs

## Contribution Rules

- Keep changes small and focused.
- Do not redesign unrelated functionality.
- Do not change application behaviour without documenting the reason.
- Use Clada Systems for the company, Clada OS for the platform, and SolarGRANT Pro for the first product module.
- Preserve security, privacy, and auditability expectations.
- Update docs whenever implementation changes the documented system.

## Implementation Flow

1. Identify the problem.
2. Read existing documentation and related code.
3. Add or update research, feature specs, and ADRs when required.
4. Implement the smallest coherent change.
5. Verify with tests, lint, build, or clear manual checks.
6. Update documentation.
7. Open a pull request using the template.

## Commit Style

Use focused commit messages that describe the change. Examples:

- `docs(atlas): add feature specification template`
- `feat(portal): add document upload status`
- `fix(intake): validate callback preference`

## Verification

Run the most relevant checks for the change. If a check cannot be run, explain why in the pull request.
