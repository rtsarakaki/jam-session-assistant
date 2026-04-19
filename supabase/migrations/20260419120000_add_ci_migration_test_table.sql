-- Tabela de teste para validar `supabase db push` na GitHub Action.
-- Podes apagar depois com uma migração `drop table public.ci_migration_test;`.

create table public.ci_migration_test (
  id bigint generated always as identity primary key,
  label text not null default 'github-actions-migration-test',
  created_at timestamptz not null default now()
);

comment on table public.ci_migration_test is 'Temporary CI verification; remove when no longer needed.';
