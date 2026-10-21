# University Portal

Next.js (App Router) + Postgres. Login with Enrollment No. + password or Google; first-time password
setup and forgot-password via one-time email links.

## Setup

```bash
npm install
cp .env.example .env.local      # fill in the values (see comments in the file)
npm run db:setup                # creates tables and seeds the 5 sample users (safe to re-run)
npm run dev
```

- All sample users start **without a password** (`password_hash IS NULL`): they set one on first sign-in.
- Without `RESEND_API_KEY`, emailed links are printed to the server console in development only.
- Production needs `DATABASE_URL`, `APP_URL`, `RESEND_API_KEY`, `MAIL_FROM`, `JWT_SECRET`,
  `GOOGLE_CLIENT_ID`, `NEXT_PUBLIC_GOOGLE_CLIENT_ID` (and ideally Upstash Redis for shared rate limits).
  Redeploy after changing any variable.

## Auth API (`src/app/api/`)

| Route | Purpose |
|---|---|
| `POST /api/auth/login` | `{ enrollmentNo, password }`; new users get a setup email (`SETUP_REQUIRED_EMAIL`); a temporary password returns `PASSWORD_CHANGE_REQUIRED` + a change token |
| `POST /api/auth/google` | `{ idToken }`; new users get `SETUP_REQUIRED` + a 15-min setup token |
| `POST /api/auth/forgot` | `{ identifier }` (email or enrollment no.); emails the login ID + a one-time 30-min temporary password to the address on record (accounts with a password only); always the same neutral reply |
| `POST /api/auth/validate-token` | `{ token }` → `{ valid, purpose, name }` |
| `POST /api/auth/reset` | `{ token, password, confirmPassword }`; used for reset and first-time setup |
| `POST /api/auth/logout`, `GET /api/me` | session |
