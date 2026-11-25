-- Rozbicie oceny na 5 kryteriów (0–2 pkt każde): konkrety, fakty_opinie, kontekst, struktura, perspektywy.
alter table public.analyses
  add column if not exists criteria jsonb;
