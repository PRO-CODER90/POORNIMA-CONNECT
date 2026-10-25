CREATE TABLE IF NOT EXISTS users (
  id              SERIAL PRIMARY KEY,
  role            TEXT NOT NULL CHECK (role IN ('student','faculty','staff','admin')),
  enrollment_no   TEXT NOT NULL UNIQUE,            -- unique across roles: the role is derived from the record
  name            TEXT NOT NULL,
  email           TEXT NOT NULL UNIQUE,            -- stored lowercase
  password_hash   TEXT,                            -- NULL = new user, password not set yet
  token_version   INTEGER NOT NULL DEFAULT 0,      -- bump to invalidate all old sessions
  password_set_at TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (email = lower(email))
);

-- Existing databases: allow the CafeConnect staff/admin roles (no-op if already allowed).
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;
ALTER TABLE users ADD CONSTRAINT users_role_check CHECK (role IN ('student','faculty','staff','admin'));

CREATE TABLE IF NOT EXISTS auth_tokens (
  id          SERIAL PRIMARY KEY,
  user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  purpose     TEXT NOT NULL CHECK (purpose IN ('setup','reset')),
  token_hash  TEXT NOT NULL UNIQUE,                -- SHA-256 of the token; the raw token is never stored
  expires_at  TIMESTAMPTZ NOT NULL,
  used_at     TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS auth_tokens_user_purpose ON auth_tokens (user_id, purpose);

-- Sample users. password_hash stays NULL, which marks them as new users.
INSERT INTO users (role, enrollment_no, name, email) VALUES
  ('student', '20070', 'HJ',     '2024bcaaidshj20070@poornima.edu.in'),
  ('student', '18915', 'VS',     '2024bcaaidsvs18915@poornima.edu.in'),
  ('student', '18221', 'Aryan',  '2024bcaaidshj18221@poornima.edu.in'),
  ('faculty', '1234',  'Rockey', 'rockey.kumar@poornima.edu.in'),
  ('faculty', '1532',  'Kavita', 'kavita.jain@poornima.edu.in')
ON CONFLICT DO NOTHING;

-- Login attempt limiter (src/lib/loginGuard.ts). Shared by every server instance; updated atomically.
CREATE TABLE IF NOT EXISTS login_attempts (
  key          TEXT PRIMARY KEY,                   -- 'ie:<ip>:<ID>' | 'id:<ID>' | 'ip:<ip>'
  fails        INTEGER     NOT NULL DEFAULT 0,
  strikes      INTEGER     NOT NULL DEFAULT 0,     -- completed lockouts, drives escalation
  window_start TIMESTAMPTZ NOT NULL DEFAULT now(),
  locked_until TIMESTAMPTZ,
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS login_attempts_updated ON login_attempts (updated_at);

-- Sign-in audit trail. Never stores passwords.
CREATE TABLE IF NOT EXISTS login_events (
  id         BIGSERIAL PRIMARY KEY,
  at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  login_id   TEXT,
  ip         TEXT,
  outcome    TEXT NOT NULL,                        -- SUCCESS | BAD_CREDENTIALS | LOCKED | LOCK_STARTED | GOOGLE_FAIL
  user_agent TEXT
);
CREATE INDEX IF NOT EXISTS login_events_at ON login_events (at DESC);

-- Housekeeping (runs with db:setup, never per login).
DELETE FROM login_attempts WHERE updated_at < now() - interval '7 days';
DELETE FROM login_events WHERE at < now() - interval '90 days';

-- Contact form messages. Stored before the email is sent, so nothing is lost if SMTP is down.
CREATE TABLE IF NOT EXISTS contact_messages (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  name       TEXT NOT NULL,
  email      TEXT NOT NULL,
  subject    TEXT NOT NULL,
  message    TEXT NOT NULL,
  ip_hash    TEXT,                                 -- SHA-256(ip + server secret), never the raw IP
  user_agent TEXT,
  status     TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new','read','replied','spam')),
  email_sent BOOLEAN NOT NULL DEFAULT false
);
CREATE INDEX IF NOT EXISTS contact_messages_created ON contact_messages (created_at DESC);
DELETE FROM contact_messages WHERE created_at < now() - interval '12 months';

-- Optional personal email: password-reset links go to it as well as the university email.
ALTER TABLE users ADD COLUMN IF NOT EXISTS personal_email TEXT;
DO $$ BEGIN ALTER TABLE users ADD CONSTRAINT users_personal_email_lower CHECK (personal_email = lower(personal_email)); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
