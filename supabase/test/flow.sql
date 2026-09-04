-- Der komplette Ablauf des geteilten Bereichs, mit zwei Nutzern und aktivem
-- Row Level Security. Voraussetzung: stub.sql und schema.sql sind gelaufen.
\set ON_ERROR_STOP on

begin;

insert into auth.users (id, email) values
  ('11111111-1111-1111-1111-111111111111', 'a@example.com'),
  ('22222222-2222-2222-2222-222222222222', 'b@example.com'),
  ('33333333-3333-3333-3333-333333333333', 'fremd@example.com')
on conflict do nothing;

grant usage on schema public to authenticated;
grant select, insert, update, delete on all tables in schema public to authenticated;

-- Ab hier als normale angemeldete Person arbeiten: als Eigentümer der Tabellen
-- würde RLS umgangen und der Test wäre wertlos.
set role authenticated;

set test.uid = '11111111-1111-1111-1111-111111111111';
select public.create_family('Familie Test') as family_id \gset
select public.create_invite(:'family_id') as code \gset

insert into public.entries (id, family_id, kind, data, updated_at)
values ('aaaaaaaa-0000-0000-0000-000000000001', :'family_id', 'feed',
        '{"babyId":"b1","kind":"bottle","amountMl":90}'::jsonb, now());

do $$ begin
  assert (select count(*) from public.entries) = 1, 'A sieht den eigenen Eintrag nicht';
end $$;

set test.uid = '22222222-2222-2222-2222-222222222222';
do $$ begin
  assert (select count(*) from public.entries) = 0, 'B sieht Eintraege vor dem Beitritt';
end $$;

select public.redeem_invite(:'code') as joined \gset
do $$ begin
  assert (select count(*) from public.entries) = 1, 'B sieht nach dem Beitritt nichts';
end $$;

insert into public.entries (id, family_id, kind, data, updated_at)
values ('bbbbbbbb-0000-0000-0000-000000000002', :'family_id', 'feed',
        '{"babyId":"b1","kind":"bottle","amountMl":60}'::jsonb, now());

set test.uid = '11111111-1111-1111-1111-111111111111';
do $$ begin
  assert (select count(*) from public.entries) = 2, 'A sieht den Eintrag von B nicht';
end $$;

set test.uid = '33333333-3333-3333-3333-333333333333';
do $$ begin
  assert (select count(*) from public.entries) = 0, 'Ein Unbeteiligter sieht Eintraege';
end $$;

-- Ein Code laesst sich nur einmal einloesen.
set test.uid = '33333333-3333-3333-3333-333333333333';
do $$
declare ok boolean := false;
begin
  begin
    perform public.redeem_invite((select code from public.family_invites limit 1));
  exception when others then ok := true;
  end;
  assert ok, 'Ein bereits eingeloester Code wurde erneut akzeptiert';
end $$;

reset role;
rollback;

\echo 'bestanden'
