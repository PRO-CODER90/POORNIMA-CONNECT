# University Portal – PHP backend

Handles enrollment/passcode login, Google sign-in verification, and the session cookie.
The Next.js app proxies every `/api/*` request here (`next.config.ts` rewrite), so the
cookie is set on the site's own domain.

| Method | Route | Purpose |
|---|---|---|
| POST | `/api/auth/login` | `{ role, enrollmentNo, passcode }` → checks role + enrollment + bcrypt passcode, sets `session` cookie |
| POST | `/api/auth/google` | `{ idToken }` → verifies the Google token; a registered `@poornima.edu.in` email is logged in directly |
| POST | `/api/auth/logout` | Clear the cookie |
| GET | `/api/me` | `{ name, role, enrollmentNo }` for the current session |

## Setup

```bash
cd backend
composer install --no-dev
php bin/seed.php            # random passcodes, printed ONCE; writes PASSCODE_HASHES + JWT_SECRET to .env
php bin/seed.php --demo     # fixed public test passcodes (Hj@20070, Rk@1234 ...). Never use on a real deployment
# add GOOGLE_CLIENT_ID to .env
COOKIE_SECURE=0 php -S 127.0.0.1:8111 -t public   # local dev (plain http)
```

Production: serve `backend/public` as the web root (Apache/Nginx + PHP-FPM, or any PHP host)
over HTTPS and set the variables from `.env.example` as real environment variables.
**Vercel cannot run this PHP code**; host it elsewhere and set `BACKEND_URL` on the Vercel
project to its URL. `JWT_SECRET` must be identical on both sides.

Rate limiting is file-based (5 failures / 10 min per IP+enrollment and per enrollment) and assumes a single host.
