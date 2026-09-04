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

create table if not exists public.family_members (
  family_id uuid not null references public.families (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  joined_at timestamptz not null default now(),
  primary key (family_id, user_id)
);

create table if not exists public.family_invites (
  code text primary key,
  family_id uuid not null references public.families (id) on delete cascade,
  created_by uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  redeemed_at timestamptz,
  redeemed_by uuid references auth.users (id) on delete set null
);

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

alter table public.families enable row level security;
alter table public.family_members enable row level security;
alter table public.family_invites enable row level security;
alter table public.entries enable row level security;

drop policy if exists families_read on public.families;
create policy families_read on public.families
  for select using (public.is_family_member(id));

drop policy if exists families_update on public.families;
create policy families_update on public.families
  for update using (public.is_family_member(id));

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

drop policy if exists entries_all on public.entries;
create policy entries_all on public.entries
  for all
  using (public.is_family_member(family_id))
  with check (public.is_family_member(family_id));

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
create or replace function public.create_invite(target uuid)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  new_code text;
begin
  if not public.is_family_member(target) then
    raise exception 'Kein Mitglied dieser Familie';
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

  insert into public.family_invites (code, family_id, created_by, expires_at)
  values (new_code, target, auth.uid(), now() + interval '7 days');

  return new_code;
end;
$$;

-- Löst einen Code ein und nimmt die aufrufende Person in die Familie auf.
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

  insert into public.family_members (family_id, user_id)
  values (invite.family_id, auth.uid())
  on conflict do nothing;

  update public.family_invites
  set redeemed_at = now(), redeemed_by = auth.uid()
  where code = invite.code;

  return invite.family_id;
end;
$$;

grant execute on function public.create_family(text) to authenticated;
grant execute on function public.create_invite(uuid) to authenticated;
grant execute on function public.redeem_invite(text) to authenticated;
grant execute on function public.is_family_member(uuid) to authenticated;
