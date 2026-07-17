# Contributing To Clada OS

Clada OS is documentation-first. Before changing product behaviour, architecture, workflow, data handling, or release process, read the Clada Operating Manual.

## Required Reading

1. [docs/README.md](docs/README.md)
2. [docs/CONSTITUTION.md](docs/CONSTITUTION.md)
3. [docs/THE_CLADA_WAY.md](docs/THE_CLADA_WAY.md)
4. [docs/01-platform/README.md](docs/01-platform/README.md) for platform or module-boundary work
5. [docs/06-sprints/ACTIVE_SPRINT.md](docs/06-sprints/ACTIVE_SPRINT.md)
6. Relevant feature specs and ADRs

## Developer Setup

Supported runtime:

- Node.js `22.x`, pinned by `.nvmrc`.
- Package manager: `pnpm@10.11.0`, as declared in `package.json`.

Setup:

```bash
nvm use
corepack enable
corepack prepare pnpm@10.11.0 --activate
pnpm install
cp .env.example .env
pnpm prisma:migrate:deploy
pnpm seed
pnpm dev
```

Open `http://localhost:3000`.

Environment:

- Use `.env.example` as the template.
- Do not commit `.env`, secrets, database credentials, API keys, or production data.
- Set the guarded database variables and `AUTH_SESSION_PEPPER`, then provision a local pilot owner as described in `docs/03-engineering/PILOT_AUTHENTICATION.md`.
- Optional email, Twilio, and OpenAI values may remain empty unless the workflow being tested needs them.

Common commands:

```bash
pnpm dev
pnpm lint
pnpm build
pnpm prisma:generate
pnpm prisma:migrate:deploy
pnpm seed
```

There is no dedicated test script yet. Until one exists, verify changes with the most relevant lint, build, manual workflow, or documentation check.

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
