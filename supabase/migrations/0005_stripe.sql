-- Płatności Stripe: dodatkowe pola w profiles (zapisy tylko przez service role / webhook).
alter table public.profiles
  add column if not exists stripe_subscription_id text,
  add column if not exists cancel_at_period_end boolean not null default false,
  add column if not exists withdrawal_consent_at timestamptz;
