-- =============================================================================
-- DRINKQuick - Datenbankschema für den geteilten Familien-Bereich
--
-- Einmalig im Supabase-Projekt ausführen: SQL Editor -> New query -> einfügen
-- -> Run. Das Skript ist wiederholbar (drop/create), es macht also nichts
-- kaputt, wenn es ein zweites Mal läuft.
--
-- Zwei Entscheidungen, die das Schema klein halten:
--
-- 1. Alle Einträge liegen in EINER Tabelle mit einer jsonb-Spalte. Die App
--    wertet ohnehin ausschließlich auf dem Gerät aus - der Server ist nur
--    Briefkasten zwischen den Geräten. Dadurch braucht keine neue Angabe im
--    Datenmodell später eine Datenbank-Migration.
-- 2. Der Abgleich arbeitet mit "die neuere Fassung gewinnt" (updated_at aus
--    der App) und mit Löschmarkierungen statt echtem Löschen.
-- =============================================================================

-- --- Familien ---------------------------------------------------------------

create table if not exists public.families (
  id uuid primary key default gen_random_uuid(),
  name text not null default 'Familie',
  created_by uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);

-- Rolle: 'editor' darf eintragen, 'viewer' darf ausschließlich lesen.
-- Der Standard ist 'editor', damit bestehende Mitgliedschaften unverändert
-- weiterlaufen, wenn dieses Skript ein zweites Mal über eine ältere
-- Datenbank läuft.
create table if not exists public.family_members (
  family_id uuid not null references public.families (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  role text not null default 'editor' check (role in ('editor', 'viewer')),
  joined_at timestamptz not null default now(),
  primary key (family_id, user_id)
);

-- Für Datenbanken, die vor der Rolle angelegt wurden:
alter table public.family_members
  add column if not exists role text not null default 'editor';
do $$
begin
  alter table public.family_members
    add constraint family_members_role_check check (role in ('editor', 'viewer'));
exception
  when duplicate_object then null;
end;
$$;

create table if not exists public.family_invites (
  code text primary key,
  family_id uuid not null references public.families (id) on delete cascade,
  created_by uuid not null references auth.users (id) on delete cascade,
  -- Welche Rolle der Code vergibt. Ein Beobachter-Link trägt hier 'viewer'.
  role text not null default 'editor' check (role in ('editor', 'viewer')),
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  redeemed_at timestamptz,
  redeemed_by uuid references auth.users (id) on delete set null
);

alter table public.family_invites
  add column if not exists role text not null default 'editor';
do $$
begin
  alter table public.family_invites
    add constraint family_invites_role_check check (role in ('editor', 'viewer'));
exception
  when duplicate_object then null;
end;
$$;

-- --- Einträge ---------------------------------------------------------------

create table if not exists public.entries (
  id uuid primary key,
  family_id uuid not null references public.families (id) on delete cascade,
  -- 'baby' | 'feed' | 'measurement' | 'diaper' | 'health' | 'checkup'
  kind text not null,
  data jsonb not null,
  -- Uhr des Geräts: entscheidet, welche Fassung gewinnt.
  updated_at timestamptz not null,
  deleted_at timestamptz,
  -- Uhr des Servers: Lesezeiger für den nächsten Abgleich. Nur so bleibt der
  -- Abgleich korrekt, wenn die Geräteuhren auseinanderlaufen.
  server_updated_at timestamptz not null default now()
);

create index if not exists entries_family_cursor_idx
  on public.entries (family_id, server_updated_at);

-- server_updated_at wird immer vom Server gesetzt, nie vom Client.
create or replace function public.touch_server_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.server_updated_at := now();
  return new;
end;
$$;

drop trigger if exists entries_touch_server_updated_at on public.entries;
create trigger entries_touch_server_updated_at
  before insert or update on public.entries
  for each row execute function public.touch_server_updated_at();

-- --- Zugriffsschutz ---------------------------------------------------------

-- Als security definer, damit die Richtlinie auf family_members sich nicht
-- selbst aufruft (sonst Endlosschleife).
create or replace function public.is_family_member(target uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.family_members
    where family_id = target and user_id = auth.uid()
  );
$$;

-- Dasselbe für die Schreibrolle. Getrennt von is_family_member, weil Lesen
-- und Schreiben ab jetzt verschiedene Fragen sind.
create or replace function public.is_family_editor(target uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.family_members
    where family_id = target and user_id = auth.uid() and role = 'editor'
  );
$$;

-- Die eigene Rolle in einem Bereich - die App fragt danach, um die
-- Eingabemöglichkeiten auszublenden. Der Schutz steckt in den Richtlinien
-- unten, nicht in dieser Auskunft.
create or replace function public.my_family_role(target uuid)
returns text
language sql
security definer
set search_path = public
stable
as $$
  select role from public.family_members
  where family_id = target and user_id = auth.uid();
$$;

alter table public.families enable row level security;
alter table public.family_members enable row level security;
alter table public.family_invites enable row level security;
alter table public.entries enable row level security;

drop policy if exists families_read on public.families;
create policy families_read on public.families
  for select using (public.is_family_member(id));

drop policy if exists families_update on public.families;
create policy families_update on public.families
  for update using (public.is_family_editor(id));

drop policy if exists members_read on public.family_members;
create policy members_read on public.family_members
  for select using (public.is_family_member(family_id));

drop policy if exists members_leave on public.family_members;
create policy members_leave on public.family_members
  for delete using (user_id = auth.uid());

-- Einladungen werden ausschließlich über die Funktionen unten angelegt und
-- eingelöst; direkt lesen darf sie nur, wer schon zur Familie gehört.
drop policy if exists invites_read on public.family_invites;
create policy invites_read on public.family_invites
  for select using (public.is_family_member(family_id));

-- Lesen darf jedes Mitglied, schreiben nur, wer die Rolle 'editor' hat. Ein
-- Beobachter kann damit auch mit selbstgebauten Anfragen nichts eintragen -
-- der Schutz sitzt in der Datenbank, nicht in der Oberfläche.
drop policy if exists entries_all on public.entries;

drop policy if exists entries_read on public.entries;
create policy entries_read on public.entries
  for select using (public.is_family_member(family_id));

drop policy if exists entries_insert on public.entries;
create policy entries_insert on public.entries
  for insert with check (public.is_family_editor(family_id));

drop policy if exists entries_update on public.entries;
create policy entries_update on public.entries
  for update
  using (public.is_family_editor(family_id))
  with check (public.is_family_editor(family_id));

drop policy if exists entries_delete on public.entries;
create policy entries_delete on public.entries
  for delete using (public.is_family_editor(family_id));

-- --- Funktionen -------------------------------------------------------------

-- Legt eine Familie an und macht die aufrufende Person zum Mitglied.
create or replace function public.create_family(family_name text default 'Familie')
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  new_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Nicht angemeldet';
  end if;

  insert into public.families (name, created_by)
  values (coalesce(nullif(trim(family_name), ''), 'Familie'), auth.uid())
  returning id into new_id;

  insert into public.family_members (family_id, user_id)
  values (new_id, auth.uid());

  return new_id;
end;
$$;

-- Erzeugt einen Einladungscode, der sieben Tage gilt.
--
-- `invite_role` entscheidet, was der Eingeladene darf: 'editor' trägt selbst
-- ein, 'viewer' sieht nur zu. Einladen darf ausschließlich, wer selbst
-- schreiben darf - sonst könnte ein Beobachter sich Mitschreibende holen und
-- die Beschränkung damit umgehen.
--
-- Die alte einarmige Fassung muss weg, sonst gäbe es zwei Funktionen gleichen
-- Namens und der Aufruf wäre mehrdeutig.
drop function if exists public.create_invite(uuid);

create or replace function public.create_invite(
  target uuid,
  invite_role text default 'editor'
)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  new_code text;
  wanted text := lower(coalesce(nullif(trim(invite_role), ''), 'editor'));
begin
  if not public.is_family_editor(target) then
    -- Bewusst getrennt von "kein Mitglied": Ein Beobachter IST Mitglied, er
    -- darf nur nicht einladen. Eine falsche Meldung schickt sonst jemanden
    -- auf die Suche nach einem Beitrittsproblem, das es nicht gibt.
    raise exception 'Nur wer mitschreiben darf, kann einladen';
  end if;
  if wanted not in ('editor', 'viewer') then
    raise exception 'Unbekannte Rolle';
  end if;

  -- Ohne 0/O/1/I, damit ein abgetippter Code nicht an Verwechslung scheitert.
  loop
    new_code := string_agg(
      substr('ABCDEFGHJKLMNPQRSTUVWXYZ23456789', floor(random() * 32 + 1)::int, 1),
      ''
    )
    from generate_series(1, 8);
    exit when not exists (select 1 from public.family_invites where code = new_code);
  end loop;

  insert into public.family_invites (code, family_id, created_by, role, expires_at)
  values (new_code, target, auth.uid(), wanted, now() + interval '7 days');

  return new_code;
end;
$$;

-- Löst einen Code ein und nimmt die aufrufende Person in die Familie auf -
-- mit der Rolle, die im Code steht.
create or replace function public.redeem_invite(invite_code text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  invite public.family_invites;
begin
  if auth.uid() is null then
    raise exception 'Nicht angemeldet';
  end if;

  select * into invite
  from public.family_invites
  where code = upper(trim(invite_code));

  if invite is null then
    raise exception 'Code unbekannt';
  end if;
  if invite.redeemed_at is not null then
    raise exception 'Code wurde bereits eingelöst';
  end if;
  if invite.expires_at < now() then
    raise exception 'Code ist abgelaufen';
  end if;

  -- Wer schon Mitglied ist, behält seine Rolle: ein Beobachter-Link darf
  -- niemandem das Schreibrecht wegnehmen, ein Mitschreib-Link es aber
  -- nachträglich geben.
  insert into public.family_members (family_id, user_id, role)
  values (invite.family_id, auth.uid(), invite.role)
  on conflict (family_id, user_id) do update
    set role = 'editor'
    where family_members.role = 'viewer' and excluded.role = 'editor';

  update public.family_invites
  set redeemed_at = now(), redeemed_by = auth.uid()
  where code = invite.code;

  return invite.family_id;
end;
$$;

grant execute on function public.create_family(text) to authenticated;
grant execute on function public.create_invite(uuid, text) to authenticated;
grant execute on function public.my_family_role(uuid) to authenticated;
grant execute on function public.is_family_editor(uuid) to authenticated;
grant execute on function public.redeem_invite(text) to authenticated;
grant execute on function public.is_family_member(uuid) to authenticated;
