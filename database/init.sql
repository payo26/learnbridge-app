CREATE TABLE IF NOT EXISTS content_cache (
  cache_key TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS content_cache_updated_idx ON content_cache(updated_at DESC);

-- Commercial accounts are also created by the API's idempotent startup
-- migration. Keeping them here makes a fresh installation self-documenting.
CREATE TABLE IF NOT EXISTS schools (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  account_type TEXT NOT NULL DEFAULT 'school'
    CHECK (account_type IN ('school','individual','family')),
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','pilot','licensed','expired','suspended')),
  seat_limit INTEGER NOT NULL DEFAULT 0 CHECK (seat_limit >= 0),
  licence_tier TEXT CHECK (licence_tier IN ('starter','growth','professional','enterprise')),
  campus_count INTEGER NOT NULL DEFAULT 1 CHECK (campus_count BETWEEN 1 AND 10),
  unlimited_teachers BOOLEAN NOT NULL DEFAULT TRUE,
  unlimited_administrators BOOLEAN NOT NULL DEFAULT TRUE,
  onboarding_mode TEXT NOT NULL DEFAULT 'remote'
    CHECK (onboarding_mode IN ('remote','onsite','none')),
  licence_start_at TIMESTAMPTZ,
  licence_end_at TIMESTAMPTZ,
  billing_period TEXT CHECK (billing_period IN ('monthly','termly','annual','session')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  school_id TEXT REFERENCES schools(id) ON DELETE CASCADE,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  display_name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('super_admin','school_admin','account_owner','teacher','student')),
  active BOOLEAN NOT NULL DEFAULT TRUE,
  terms_accepted_at TIMESTAMPTZ,
  terms_version TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK ((role = 'super_admin' AND school_id IS NULL) OR (role <> 'super_admin' AND school_id IS NOT NULL))
);
CREATE INDEX IF NOT EXISTS users_school_idx ON users(school_id, role, active);

CREATE TABLE IF NOT EXISTS sessions (
  token_hash TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS sessions_expires_idx ON sessions(expires_at);

CREATE TABLE IF NOT EXISTS password_reset_tokens (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS password_reset_tokens_user_idx
  ON password_reset_tokens(user_id, expires_at DESC);

CREATE TABLE IF NOT EXISTS pilot_requests (
  id TEXT PRIMARY KEY,
  school_name TEXT NOT NULL,
  admin_name TEXT NOT NULL,
  admin_email TEXT NOT NULL,
  phone TEXT NOT NULL,
  estimated_learners INTEGER NOT NULL CHECK (estimated_learners > 0),
  message TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
  school_id TEXT REFERENCES schools(id),
  reviewed_by TEXT REFERENCES users(id),
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS pilot_requests_status_idx ON pilot_requests(status, created_at DESC);

CREATE TABLE IF NOT EXISTS invitations (
  id TEXT PRIMARY KEY,
  school_id TEXT NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('school_admin','teacher','student')),
  email TEXT,
  code_hash TEXT NOT NULL UNIQUE,
  max_uses INTEGER NOT NULL DEFAULT 1 CHECK (max_uses > 0),
  use_count INTEGER NOT NULL DEFAULT 0 CHECK (use_count >= 0),
  expires_at TIMESTAMPTZ NOT NULL,
  created_by TEXT REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS invitations_school_idx ON invitations(school_id, expires_at);

CREATE TABLE IF NOT EXISTS licence_quotes (
  id TEXT PRIMARY KEY,
  school_id TEXT NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  amount_kobo INTEGER NOT NULL CHECK (amount_kobo > 0),
  currency TEXT NOT NULL DEFAULT 'NGN' CHECK (currency = 'NGN'),
  billing_period TEXT NOT NULL CHECK (billing_period IN ('termly','annual','session')),
  duration_days INTEGER NOT NULL CHECK (duration_days BETWEEN 1 AND 730),
  seat_limit INTEGER NOT NULL CHECK (seat_limit > 0),
  tier_code TEXT CHECK (tier_code IN ('starter','growth','professional','enterprise')),
  campus_count INTEGER NOT NULL DEFAULT 1 CHECK (campus_count BETWEEN 1 AND 10),
  onboarding_mode TEXT NOT NULL DEFAULT 'remote'
    CHECK (onboarding_mode IN ('remote','onsite','none')),
  onboarding_fee_kobo BIGINT NOT NULL DEFAULT 0 CHECK (onboarding_fee_kobo >= 0),
  unlimited_teachers BOOLEAN NOT NULL DEFAULT TRUE,
  unlimited_administrators BOOLEAN NOT NULL DEFAULT TRUE,
  notes TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'sent' CHECK (status IN ('draft','sent','paid','expired','cancelled')),
  expires_at TIMESTAMPTZ NOT NULL,
  created_by TEXT NOT NULL REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS licence_quotes_school_idx ON licence_quotes(school_id, created_at DESC);

CREATE TABLE IF NOT EXISTS payments (
  id TEXT PRIMARY KEY,
  quote_id TEXT NOT NULL REFERENCES licence_quotes(id),
  school_id TEXT NOT NULL REFERENCES schools(id),
  payer_user_id TEXT REFERENCES users(id),
  reference TEXT NOT NULL UNIQUE,
  amount_kobo INTEGER NOT NULL CHECK (amount_kobo > 0),
  currency TEXT NOT NULL DEFAULT 'NGN',
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','success','failed')),
  provider_transaction_id TEXT,
  paid_at TIMESTAMPTZ,
  provider_data JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS payments_school_idx ON payments(school_id, created_at DESC);

CREATE TABLE IF NOT EXISTS subscriptions (
  id TEXT PRIMARY KEY,
  school_id TEXT NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  owner_user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  package TEXT NOT NULL CHECK (package IN ('individual','family')),
  billing_cycle TEXT NOT NULL CHECK (billing_cycle IN ('monthly','annual')),
  plan_code TEXT NOT NULL,
  amount_kobo INTEGER NOT NULL CHECK (amount_kobo > 0),
  currency TEXT NOT NULL DEFAULT 'NGN' CHECK (currency = 'NGN'),
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','active','non-renewing','attention','completed','cancelled','failed')),
  provider_subscription_code TEXT UNIQUE,
  provider_customer_code TEXT,
  next_payment_at TIMESTAMPTZ,
  last_payment_at TIMESTAMPTZ,
  provider_data JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS subscriptions_account_idx ON subscriptions(school_id, created_at DESC);
CREATE INDEX IF NOT EXISTS subscriptions_provider_idx ON subscriptions(provider_customer_code, plan_code);

CREATE TABLE IF NOT EXISTS subscription_payments (
  id TEXT PRIMARY KEY,
  subscription_id TEXT NOT NULL REFERENCES subscriptions(id) ON DELETE CASCADE,
  school_id TEXT NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  payer_user_id TEXT REFERENCES users(id),
  reference TEXT NOT NULL UNIQUE,
  amount_kobo INTEGER NOT NULL CHECK (amount_kobo > 0),
  currency TEXT NOT NULL DEFAULT 'NGN' CHECK (currency = 'NGN'),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','success','failed')),
  provider_transaction_id TEXT,
  paid_at TIMESTAMPTZ,
  provider_data JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS subscription_payments_account_idx ON subscription_payments(school_id, created_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS subscription_payments_provider_transaction_idx
  ON subscription_payments(provider_transaction_id) WHERE provider_transaction_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS webhook_events (
  event_hash TEXT PRIMARY KEY,
  event_type TEXT NOT NULL,
  received_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  processed_at TIMESTAMPTZ
);
