# Clada OS

Clada OS is the operating system for contractor-led service businesses, starting with Irish solar installers through SolarGRANT Pro.

The product began as a homeowner-facing SEAI solar grant funnel and installer dashboard. It is now being evolved into a broader business platform covering lead capture, CRM, quoting, grant workflows, customer communication, installation tracking, reporting, and future AI-assisted operations.

## Product structure

Clada Systems is the company.

Clada OS is the core platform.

SolarGRANT Pro is the first industry-specific product/module built on top of Clada OS for Irish solar companies.

## Current product scope

- Homeowner-facing solar grant and lead capture funnel
- Lead qualification fields for installer sales teams
- Lead temperature scoring: hot, warm, cold
- Installer admin dashboard
- Lead detail view
- Result / thank-you flow after submission
- Basic email notification support
- Prisma/Postgres data layer
- Vercel deployment target

## Documentation system

This repository uses `/docs` as the source of truth for product, design, engineering, and sprint decisions.

Before any Codex implementation sprint, read the relevant foundation documents:

```txt
/docs/company/vision.md
/docs/company/positioning.md
/docs/product/clada-os-vision.md
/docs/product/solargrant-pro-current-state.md
/docs/product/roadmap.md
/docs/product/feature-decision-framework.md
/docs/design/design-system.md
/docs/design/ui-ux-principles.md
/docs/engineering/architecture.md
/docs/engineering/security-and-gdpr.md
/docs/sprints/sprint-0-foundation.md
```

Codex must not make broad product changes without checking these documents first.

## Local quick start

```bash
npm install
npx prisma migrate deploy
npm run seed
npm run dev
```

Open the local development server in your browser after `npm run dev` starts.

## Environment

Use `.env.example` as your template. Do not commit your real `.env` file.

The app expects a Postgres database connection for local and production environments. Optional email notification variables may also be configured if the email notification feature is enabled.

## Admin login

Open `/admin` in the browser.

Set the admin password and session secret in your local `.env` and in Vercel before using production admin routes. Do not commit real credentials or secrets.

## Vercel deploy notes

- Prisma Client is generated automatically during `npm install` via the `postinstall` script.
- Run `npx prisma migrate deploy` against the production database before or during the first live rollout.
- Configure production environment variables in Vercel before using `/admin`.
