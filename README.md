# SEAI Solar Grant Checker V2

A homeowner-facing solar grant funnel and installer dashboard for Irish solar companies.

## What changed in V2
- Stronger homeowner landing-page copy
- Better lead-capture fields for sales qualification
- Preferred callback time, bill band, timeline, roof type, battery interest
- Lead temperature scoring (hot / warm / cold)
- Improved installer dashboard and lead detail view
- Cleaner result / thank-you flow after form submission

## Local quick start
```bash
npm install
npx prisma migrate deploy
npm run seed
npm run dev
```

Open `http://localhost:3000`

## Environment
Use `.env.example` as your template. Do not commit your real `.env` file.

Use a Postgres database URL locally and on Vercel. The easiest setup is to create the database through the Vercel Marketplace and then pull the same values locally with `vercel env pull`.

```env
DATABASE_URL="postgres://USER:PASSWORD@HOST:5432/seai_solar_grants?sslmode=require"
```

Optional email notifications use:

```env
EMAIL_USER=""
EMAIL_PASS=""
```


## Admin login

Open `/admin` in the browser.

Set these in `.env`:

```env
ADMIN_PASSWORD=admin123
ADMIN_SESSION_SECRET=replace-this-session-secret
```

If you do not set `ADMIN_PASSWORD`, the local development fallback password is `admin123`.

## Vercel deploy notes

- Prisma Client is generated automatically during `npm install` via the `postinstall` script.
- Run `npx prisma migrate deploy` against the production database before or during your first live rollout.
- Set `ADMIN_PASSWORD` and `ADMIN_SESSION_SECRET` in Vercel before using `/admin`.
