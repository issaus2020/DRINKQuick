-- Supabase-Umgebung nachbauen: auth.users, auth.uid() und die Rolle "authenticated".
create schema if not exists auth;
create table if not exists auth.users (id uuid primary key, email text);
do $$ begin
  create role authenticated;
exception when duplicate_object then null; end $$;
do $$ begin
  create role anon;
exception when duplicate_object then null; end $$;

-- auth.uid() liest bei Supabase aus dem JWT; hier aus einer Sitzungsvariablen.
create or replace function auth.uid() returns uuid language sql stable as $$
  select nullif(current_setting('test.uid', true), '')::uuid;
$$;
grant usage on schema auth to authenticated, anon;
grant select on auth.users to authenticated;
