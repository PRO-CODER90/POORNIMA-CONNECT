# University Portal – PHP backend

Handles Google sign-in verification, enrollment/passcode check, and the session cookie.
The Next.js app proxies every `/api/*` request here (`next.config.ts` rewrite), so the
cookie is set on the site's own domain.

| Method | Route | Purpose |
|---|---|---|
| POST | `/api/auth/google` | Verify Google ID token, check domain + registered email, return `tempToken` |
| POST | `/api/auth/verify` | Check enrollment no. + passcode, set `session` cookie |
| POST | `/api/auth/logout` | Clear the cookie |
| GET | `/api/me` | `{ name, role, enrollmentNo }` for the current session |

## Setup

```bash
cd backend
composer install --no-dev
php bin/seed.php            # prints dev passcodes ONCE, writes PASSCODE_HASHES + JWT_SECRET to .env
# add GOOGLE_CLIENT_ID to .env
COOKIE_SECURE=0 php -S 127.0.0.1:8111 -t public   # local dev (plain http)
```

Production: serve `backend/public` as the web root (Apache/Nginx + PHP-FPM, or any PHP host)
over HTTPS and set the variables from `.env.example` as real environment variables.
**Vercel cannot run this PHP code**; host it elsewhere and set `BACKEND_URL` on the Vercel
project to its URL. `JWT_SECRET` must be identical on both sides.

Rate limiting is file-based (5 failures / 10 min per IP and per email) and assumes a single host.
