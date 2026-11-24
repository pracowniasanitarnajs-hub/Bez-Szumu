-- Format materiału (Wywiad / Live / Q&A / Inny) i udział treści niemerytorycznej.
alter table public.analyses
  add column if not exists format text
    check (format in ('Wywiad','Live','Q&A','Inny')),
  add column if not exists noise_percent smallint
    check (noise_percent between 0 and 100);
