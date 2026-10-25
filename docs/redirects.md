# Redirect map

Permanent (301) redirects live in `next.config.ts` → `redirects()`. Add a row here whenever a public URL changes, so old links keep working. No chains: always point straight at the final page.

| Old URL | New URL | Since |
|---|---|---|
| `www.<APP_HOST>/*` | `https://<APP_HOST>/*` (only when `APP_HOST` is set) | 2026-10-25 |
| `/login`, `/signin`, `/home` | `/` | 2026-10-25 |
| `/cafes` | `/dining` | 2026-10-25 |
| `/contact-us` | `/contact` | 2026-10-25 |
| `/privacy-policy` | `/privacy` | 2026-10-25 |

Sign-in redirects inside the app (`/student` → `/student/dashboard`, `/admin` → `/admin/dashboard`) are temporary (307) and are not listed here.
