# ServiceFlow AI

A field-service management web app for companies that dispatch and track
multiple technicians. Admins create customers and jobs, assign technicians,
and monitor status; technicians see only their own assigned jobs and update
status as they work.

## Stack

- [Next.js 15](https://nextjs.org/) (App Router) + TypeScript
- [Prisma](https://www.prisma.io/) with SQLite (single-file DB, no external services required)
- Tailwind CSS
- Custom session auth: `bcryptjs` password hashing + a signed JWT (`jose`) in an
  httpOnly cookie, enforced by `src/middleware.ts`

## Features

- **Multi-tenant**: every row is scoped to a `Company`; users only ever see
  their own company's data.
- **Roles**: `ADMIN` manages technicians, customers, and all jobs.
  `TECHNICIAN` sees and updates only jobs assigned to them.
- **Jobs**: create, assign/reassign a technician, schedule a date/time, and
  move through `UNASSIGNED → SCHEDULED → ON_THE_WAY → IN_PROGRESS →
  COMPLETED` (or `CANCELED`). Technicians can only start/complete their own
  jobs; only admins can reassign or reschedule.
- **"On my way" (traffic-aware routing + customer SMS)**: when a technician
  taps **On my way**, the app takes their current GPS position, computes a
  live-traffic-aware route to the job (via the Google Routes API, which is
  also asked for a fuel-efficient alternative — the app picks whichever is
  the better tradeoff of time vs. fuel, favoring the greener route unless it
  costs more than 5 extra minutes), stores the ETA/distance on the job, and
  texts the customer an ETA via Twilio SMS. Everyone on the job can tap
  through to turn-by-turn navigation in Google Maps. See
  [Optional integrations](#optional-integrations-on-my-way-routing--sms)
  below to turn this on — without it configured, the feature still marks the
  job "on the way," just without a route or text.
- **Dashboard**: job counts by status and today's schedule, scoped to the
  signed-in user's role.
- **Technicians & Customers**: admin-only management pages.

## Getting started

```bash
npm install
cp .env.example .env        # then edit JWT_SECRET to a long random string
npm run db:push             # create the SQLite schema
npm run db:seed             # seed a demo company, users, customers, jobs
npm run dev
```

Visit http://localhost:3000 and sign in with one of the seeded accounts:

| Role       | Email             | Password    |
|------------|-------------------|-------------|
| Admin      | admin@acme.test   | password123 |
| Technician | alex@acme.test    | password123 |
| Technician | sam@acme.test     | password123 |

To reset the database at any point: `npm run db:reset`.

## Optional integrations: "On my way" routing & SMS

Add these to `.env` to turn on live routing + customer texts (see
`.env.example` for the full list):

```
GOOGLE_MAPS_API_KEY=""     # Cloud project with Routes API + Geocoding API enabled
TWILIO_ACCOUNT_SID=""
TWILIO_AUTH_TOKEN=""
TWILIO_FROM_NUMBER=""      # your Twilio number, E.164 format e.g. +15551234567
```

- **Google Maps**: create a Google Cloud project, enable the **Routes API**
  and **Geocoding API**, and create an API key.
- **Twilio**: create a Twilio account, buy/verify a phone number, and copy
  the Account SID, Auth Token, and that number into `.env`.
- Customer phone numbers must be in **E.164 format** (`+1XXXXXXXXXX` for US
  numbers) for the SMS to send.

Without these set, tapping "On my way" still updates the job's status and
tells the technician what wasn't sent and why (e.g. "SMS not sent: Twilio is
not configured") rather than failing outright.

## Project layout

```
prisma/schema.prisma          Company / User / Customer / Job models
prisma/seed.ts                Demo data
src/lib/db.ts                 Prisma client singleton
src/lib/auth.ts               Session (JWT) creation/verification
src/lib/maps.ts               Geocoding + traffic-aware/fuel-efficient routing (Google Routes API)
src/lib/sms.ts                Twilio SMS
src/middleware.ts             Route protection (redirects unauthenticated users)
src/app/login/                Login page
src/app/(app)/                Authenticated shell: dashboard, jobs, technicians, customers
src/app/api/                  REST-ish route handlers backing each feature
src/app/api/jobs/[id]/on-the-way/  "On my way" — routing + SMS side effects
```

## Known limitations

- Next.js itself vendors an older internal copy of `postcss` that `npm audit`
  flags (high severity); there is currently no patch release that resolves
  it short of the Next 16 major version. Not a concern for this app's own
  CSS build (which uses a separately-resolved, patched `postcss`), but worth
  tracking before a production deploy.
- Password reset / email invites for new technicians aren't implemented —
  admins set a temporary password directly when adding a technician.
- SQLite is fine for local development and small deployments; move
  `DATABASE_URL` to a Postgres connection string (and update the Prisma
  datasource provider) before scaling to concurrent writers.
