# University Portal

Next.js (App Router) + Postgres. Login with Enrollment No. + password or Google; first-time password
setup via a one-time email link, and forgot-password via an emailed login ID + temporary password. All steps happen inside the login card (no pop-ups).

## Setup

```bash
npm install
cp .env.example .env.local      # fill in the values (see comments in the file)
npm run db:setup                # creates tables and seeds the 5 sample users (safe to re-run)
npm run dev
```

- All sample users start **without a password** (`password_hash IS NULL`): they set one on first sign-in.
- Production needs `DATABASE_URL`, `APP_URL`, `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`,
  `SMTP_SECURE`, `MAIL_FROM`, `ADMIN_EMAIL` (optional), `JWT_SECRET`, `GOOGLE_CLIENT_ID`,
  `NEXT_PUBLIC_GOOGLE_CLIENT_ID` (and ideally Upstash Redis for shared rate limits).
  Redeploy after changing any variable.

## Auth API (`src/app/api/`)

| Route | Purpose |
|---|---|
| `POST /api/auth/login` | `{ enrollmentNo, password }`; new users get a setup email (`SETUP_REQUIRED_EMAIL`); a temporary password returns `PASSWORD_CHANGE_REQUIRED` + a change token |
| `POST /api/auth/google` | `{ idToken }`; new users get `SETUP_REQUIRED` + a 15-min setup token |
| `POST /api/auth/forgot` | `{ identifier }` (email or enrollment no.); emails a secure one-time 30-min password reset link to the address on record (accounts with a password only); always the same neutral reply |
| `POST /api/auth/validate-token` | `{ token }` → `{ valid, purpose, name }` |
| `POST /api/auth/reset` | `{ token, password, confirmPassword }`; used for reset and first-time setup |
| `POST /api/auth/logout`, `GET /api/me` | session |

## CafeConnect (campus cafe ordering)

Merged from the PU CafeConnect project; its separate login was removed. Everyone signs in on the portal
login page and is sent to their area by portal role:

| Portal role | Login ID | Lands on | Can do |
|---|---|---|---|
| `student`, `faculty` | Enrollment No. | `/student/dashboard` | Browse the 3 cafes, order (cash), track orders, spending |
| `staff` | Staff ID, e.g. `STF001` | `/staff/dashboard` | Run their cafe's order queue, confirm cash |
| `admin` | any ID you choose | `/admin/dashboard` | Cafes, menus, staff, students, payments, reports, audit log |

- The cafe-side account and student/admin profile are created automatically on first visit.
- Staff are added in **Admin → Cafe Staff**: that creates their portal login (staff ID + password) and cafe assignment.
- Code: pages in `src/app/{student,staff,admin,cafe}`, APIs in `src/app/api/{admin,cafes,orders,staff,student,notifications,health}`,
  everything else in `src/cafe/`. The bridge from the portal session is `src/cafe/lib/auth.ts`.
- Data: Prisma (`prisma/schema.prisma`) on the same Postgres. `npm run db:setup` creates the cafe tables
  (`scripts/cafe-schema.sql`) and the cafes + menus (`scripts/cafe-seed.sql`).

Create the first admin (they set their password from the setup email on first sign-in):

```sql
INSERT INTO users (role, enrollment_no, name, email) VALUES ('admin', 'ADMIN1', 'Canteen Admin', 'you@example.com');
```


## Sign-in protection

- **3 wrong passwords** for one login ID from one IP lock that ID+IP for 5 minutes, then 15, 30 and 60
  minutes on repeat lockouts (escalation resets after 24 h without failures). One login ID across all
  IPs is capped at 10 failures / 30 min, one IP across all IDs at 60 / 15 min. Unknown IDs are counted
  exactly like real ones. Google sign-in and "Forgot password" stay available during a lockout.
- Counters live in Postgres (`login_attempts`, created by `npm run db:setup`), so every server
  instance shares them. If the database can't be reached, sign-in is refused (fails closed).
- Every outcome is written to `login_events` and the last 50 show in Admin → Audit Logs.
- To clear a lock by hand: `DELETE FROM login_attempts WHERE key LIKE '%:20070' OR key = 'id:20070';`

### "Continue with Google" checklist

1. Google Cloud Console → Credentials: client type **Web application**.
2. **Authorised JavaScript origins** list every origin exactly (e.g. `http://localhost:3000`,
   `https://poornima-connect.vercel.app`), no path, no trailing slash.
3. OAuth consent screen: **Internal** (Workspace) or **Published**; in *Testing* only listed test users can sign in.
4. Set **both** `NEXT_PUBLIC_GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_ID` to the same value (the server
   falls back to the public one and logs a warning if they differ). `NEXT_PUBLIC_*` is inlined at
   build time: **redeploy** after changing it.
5. `APP_URL` equals the production origin.
6. Google sign-in only works for emails already in the `users` table; staff/admin rows must carry the
   exact `@poornima.edu.in` address they sign in with.
7. Server logs show the real reason for a rejected token (`ERR_JWT_EXPIRED`,
   `ERR_JWT_CLAIM_VALIDATION_FAILED` = wrong client ID, `ERR_JWKS_TIMEOUT`, …).

## Resetting student/faculty order data

`npm run db:reset:students` prints how many orders, items, payments and student notifications would be
deleted, and deletes nothing. Add `--confirm` to delete (one transaction), `--student <code>`
(repeatable) to limit it to some students, `--include-audit` to also drop Order/Payment audit rows.
Accounts, profiles, cafes and menus are never touched. With `NODE_ENV=production` it also needs
`--i-know-this-is-production`. Back up first: `pg_dump "$DATABASE_URL" > backup-$(date +%F).sql`.
