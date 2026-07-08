# Clada OS

Clada OS is the long-term operating platform for contractor-led service businesses built by Clada Systems. It starts with Irish solar installers through SolarGRANT Pro, the first product module focused on SEAI grant workflows, lead intake, installer operations, document preparation, and human-reviewed submission support.

The product began as a homeowner-facing SEAI solar grant funnel and installer dashboard. It is now evolving into a broader business platform for lead capture, CRM, quoting, grant workflows, customer communication, installation tracking, reporting, and future AI-assisted operations.

## Product Structure

- Company: Clada Systems
- Platform: Clada OS
- First product module: SolarGRANT Pro
- Entry market: Irish solar industry
- Future markets: electrical, HVAC, plumbing, roofing, construction, landscaping, renewable energy, and other contractor-led services

SolarGRANT Pro remains valid where the repository refers specifically to the Irish solar grant module. New platform-level language should use Clada OS terminology.

## Documentation First

Start with [docs/README.md](docs/README.md). The Clada Operating Manual (COM) is the source of truth for company direction, product strategy, engineering standards, architecture decisions, feature specifications, sprint planning, and research.

Every significant implementation change should be grounded in the documentation hierarchy:

1. [Constitution](docs/CONSTITUTION.md)
2. [The Clada Way](docs/THE_CLADA_WAY.md)
3. [Operating Manual](docs/README.md)
4. [Platform architecture](docs/01-platform/README.md)
5. [Feature specifications](docs/04-features/README.md)
6. [Sprint documents](docs/06-sprints/README.md)
7. Implementation

Code does not override documented architectural decisions. If implementation needs to diverge, update the relevant documentation first or record the decision in an ADR.

## Current Product Scope

- Homeowner-facing solar grant and lead capture funnel
- Lead qualification fields for installer sales teams
- Lead temperature scoring: hot, warm, cold
- Installer admin dashboard
- Lead detail view
- Result and thank-you flow after submission
- Basic email notification support
- Prisma/Postgres data layer
- Vercel deployment target

## Local Quick Start

```bash
nvm use
corepack enable
pnpm install
pnpm prisma:migrate:deploy
pnpm seed
pnpm dev
```

Open `http://localhost:3000`.

## Environment

Use `.env.example` as your template. Do not commit real `.env` files.

Use a Postgres database URL locally and on Vercel. The easiest setup is to create the database through the Vercel Marketplace and then pull matching values locally with `vercel env pull`.

```env
DATABASE_URL="postgres://USER:PASSWORD@HOST:5432/seai_solar_grants?sslmode=require"
```

Optional email notifications use:

```env
EMAIL_USER=""
EMAIL_PASS=""
```

## Admin Login

Open `/admin` in the browser.

Set these in `.env`:

```env
ADMIN_PASSWORD=admin123
ADMIN_SESSION_SECRET=replace-this-session-secret
```

If `ADMIN_PASSWORD` is not set, the local development fallback password is `admin123`.

## Vercel Deploy Notes

- Prisma Client is generated automatically during dependency installation through the `postinstall` script.
- Run `pnpm prisma:migrate:deploy` against the production database before or during the first live rollout.
- Set `ADMIN_PASSWORD` and `ADMIN_SESSION_SECRET` in Vercel before using `/admin`.

## Contributor Workflow

Read [CONTRIBUTING.md](CONTRIBUTING.md) before changing the repository. Documentation updates are expected whenever behaviour, architecture, feature scope, or operational practice changes.
