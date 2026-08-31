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
  move through `UNASSIGNED → SCHEDULED → IN_PROGRESS → COMPLETED` (or
  `CANCELED`). Technicians can only start/complete their own jobs; only
  admins can reassign or reschedule.
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

## Project layout

```
prisma/schema.prisma          Company / User / Customer / Job models
prisma/seed.ts                Demo data
src/lib/db.ts                 Prisma client singleton
src/lib/auth.ts               Session (JWT) creation/verification
src/middleware.ts             Route protection (redirects unauthenticated users)
src/app/login/                Login page
src/app/(app)/                Authenticated shell: dashboard, jobs, technicians, customers
src/app/api/                  REST-ish route handlers backing each feature
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
