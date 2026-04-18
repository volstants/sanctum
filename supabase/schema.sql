-- ═══════════════════════════════════════════════════
--  Sanctum VTT — Database Schema
--  Run this in Supabase SQL Editor (Dashboard > SQL)
-- ═══════════════════════════════════════════════════

-- Extensions
create extension if not exists "pgcrypto";

-- ── Profiles (mirrors auth.users) ──────────────────
create table public.profiles (
  id            uuid primary key references auth.users(id) on delete cascade,
  display_name  text not null,
  avatar_url    text,
  email         text not null,
  created_at    timestamptz default now()
);

-- ── Realms (campaigns / "servers") ─────────────────
create table public.realms (
  id            uuid primary key default gen_random_uuid(),
  name          text not null,
  description   text,
  owner_id      uuid not null references public.profiles(id) on delete cascade,
  invite_code   text unique not null default encode(gen_random_bytes(6), 'hex'),
  icon_url      text,
  created_at    timestamptz default now()
);

-- ── Realm Members ───────────────────────────────────
create table public.realm_members (
  realm_id      uuid not null references public.realms(id) on delete cascade,
  user_id       uuid not null references public.profiles(id) on delete cascade,
  role          text not null check (role in ('narrator', 'player')) default 'player',
  display_name  text not null,
  avatar_url    text,
  joined_at     timestamptz default now(),
  primary key (realm_id, user_id)
);

-- ── Channels ────────────────────────────────────────
create table public.channels (
  id            uuid primary key default gen_random_uuid(),
  realm_id      uuid not null references public.realms(id) on delete cascade,
  name          text not null,
  type          text not null check (type in ('chat', 'vtt', 'voice', 'ai')),
  position      int not null default 0,
  created_at    timestamptz default now()
);

-- ── Messages ────────────────────────────────────────
create table public.messages (
  id            uuid primary key default gen_random_uuid(),
  channel_id    uuid not null references public.channels(id) on delete cascade,
  user_id       uuid not null references public.profiles(id),
  content       text not null,
  is_narrator   boolean not null default false,
  metadata      jsonb,
  created_at    timestamptz default now()
);

create index messages_channel_created on public.messages(channel_id, created_at desc);

-- ── Characters (player sheets) ──────────────────────
create table public.characters (
  id            uuid primary key default gen_random_uuid(),
  realm_id      uuid not null references public.realms(id) on delete cascade,
  user_id       uuid not null references public.profiles(id),
  name          text not null,
  class         text not null default '',
  level         int not null default 1,
  hp            int not null default 10,
  max_hp        int not null default 10,
  stats         jsonb not null default '{"str":10,"dex":10,"con":10,"int":10,"wis":10,"cha":10}'::jsonb,
  avatar_url    text,
  notes         text,
  inventory     text,
  created_at    timestamptz default now()
);

-- ── NPCs ────────────────────────────────────────────
create table public.npcs (
  id            uuid primary key default gen_random_uuid(),
  realm_id      uuid not null references public.realms(id) on delete cascade,
  name          text not null,
  description   text not null default '',
  is_secret     boolean not null default false,
  hp            int not null default 10,
  max_hp        int not null default 10,
  stats         jsonb not null default '{}'::jsonb,
  attack        text not null default '',
  defense       text not null default '',
  damage        text not null default '',
  voice         text,
  created_at    timestamptz default now()
);

-- ── Maps ────────────────────────────────────────────
create table public.maps (
  id            uuid primary key default gen_random_uuid(),
  realm_id      uuid not null references public.realms(id) on delete cascade,
  name          text not null,
  image_url     text not null,
  width         int not null default 1920,
  height        int not null default 1080,
  grid_size     int not null default 50,
  grid_visible  boolean not null default true,
  created_at    timestamptz default now()
);

-- ── Tokens (on maps) ───────────────────────────────
create table public.tokens (
  id            uuid primary key default gen_random_uuid(),
  map_id        uuid not null references public.maps(id) on delete cascade,
  character_id  uuid references public.characters(id) on delete set null,
  npc_id        uuid references public.npcs(id) on delete set null,
  label         text not null default '',
  x             float not null default 0,
  y             float not null default 0,
  rotation      float not null default 0,
  size          float not null default 1,
  visible       boolean not null default true,
  image_url     text
);

-- ── Sessions (recorded play sessions) ──────────────
create table public.sessions (
  id            uuid primary key default gen_random_uuid(),
  realm_id      uuid not null references public.realms(id) on delete cascade,
  started_at    timestamptz not null default now(),
  ended_at      timestamptz,
  summary       text
);

-- ── Session Highlights ──────────────────────────────
create table public.highlights (
  id            uuid primary key default gen_random_uuid(),
  session_id    uuid not null references public.sessions(id) on delete cascade,
  message_id    uuid references public.messages(id) on delete set null,
  type          text not null check (type in ('combat', 'plot', 'death_risk', 'loot')),
  description   text not null,
  created_at    timestamptz default now()
);

-- ── Campaign Context (uploaded lore) ───────────────
create table public.campaign_context (
  id            uuid primary key default gen_random_uuid(),
  realm_id      uuid not null unique references public.realms(id) on delete cascade,
  content       text not null default '',
  summary       text,
  updated_at    timestamptz default now()
);

-- ══════════════════════════════════════════════════
--  Row Level Security
-- ══════════════════════════════════════════════════

alter table public.profiles        enable row level security;
alter table public.realms          enable row level security;
alter table public.realm_members   enable row level security;
alter table public.channels        enable row level security;
alter table public.messages        enable row level security;
alter table public.characters      enable row level security;
alter table public.npcs            enable row level security;
alter table public.maps            enable row level security;
alter table public.tokens          enable row level security;
alter table public.sessions        enable row level security;
alter table public.highlights      enable row level security;
alter table public.campaign_context enable row level security;

-- Helper: is user a member of realm?
create or replace function public.is_realm_member(p_realm_id uuid)
returns boolean language sql security definer as $$
  select exists (
    select 1 from public.realm_members
    where realm_id = p_realm_id and user_id = auth.uid()
  );
$$;

-- Helper: is user narrator of realm?
create or replace function public.is_narrator(p_realm_id uuid)
returns boolean language sql security definer as $$
  select exists (
    select 1 from public.realm_members
    where realm_id = p_realm_id and user_id = auth.uid() and role = 'narrator'
  );
$$;

-- Profiles
create policy "profiles_select" on public.profiles for select using (true);
create policy "profiles_insert" on public.profiles for insert with check (id = auth.uid());
create policy "profiles_update" on public.profiles for update using (id = auth.uid());

-- Realms
create policy "realms_select" on public.realms for select using (public.is_realm_member(id));
create policy "realms_insert" on public.realms for insert with check (owner_id = auth.uid());
create policy "realms_update" on public.realms for update using (owner_id = auth.uid());
create policy "realms_delete" on public.realms for delete using (owner_id = auth.uid());

-- Realm Members
create policy "members_select" on public.realm_members for select using (public.is_realm_member(realm_id));
create policy "members_insert" on public.realm_members for insert with check (user_id = auth.uid());
create policy "members_delete" on public.realm_members for delete using (user_id = auth.uid() or public.is_narrator(realm_id));

-- Channels
create policy "channels_select" on public.channels for select using (public.is_realm_member(realm_id));
create policy "channels_mutate" on public.channels for all using (public.is_narrator(realm_id));

-- Messages
create policy "messages_select" on public.messages for select
  using (public.is_realm_member((select realm_id from public.channels where id = channel_id)));
create policy "messages_insert" on public.messages for insert
  with check (
    user_id = auth.uid()
    and public.is_realm_member((select realm_id from public.channels where id = channel_id))
  );

-- Characters
create policy "characters_select" on public.characters for select using (public.is_realm_member(realm_id));
create policy "characters_insert" on public.characters for insert with check (user_id = auth.uid());
create policy "characters_update" on public.characters for update using (user_id = auth.uid() or public.is_narrator(realm_id));

-- NPCs
create policy "npcs_select_public" on public.npcs for select
  using (public.is_realm_member(realm_id) and (not is_secret or public.is_narrator(realm_id)));
create policy "npcs_mutate" on public.npcs for all using (public.is_narrator(realm_id));

-- Maps & Tokens
create policy "maps_select" on public.maps for select using (public.is_realm_member(realm_id));
create policy "maps_mutate" on public.maps for all using (public.is_narrator(realm_id));
create policy "tokens_select" on public.tokens for select
  using (public.is_realm_member((select realm_id from public.maps where id = map_id)));
create policy "tokens_mutate" on public.tokens for all
  using (public.is_narrator((select realm_id from public.maps where id = map_id)));

-- Sessions & Highlights
create policy "sessions_select" on public.sessions for select using (public.is_realm_member(realm_id));
create policy "sessions_mutate" on public.sessions for all using (public.is_narrator(realm_id));
create policy "highlights_select" on public.highlights for select
  using (public.is_realm_member((select realm_id from public.sessions where id = session_id)));
create policy "highlights_mutate" on public.highlights for all
  using (public.is_narrator((select realm_id from public.sessions where id = session_id)));

-- Campaign Context
create policy "context_select" on public.campaign_context for select using (public.is_realm_member(realm_id));
create policy "context_mutate" on public.campaign_context for all using (public.is_narrator(realm_id));

-- ══════════════════════════════════════════════════
--  Triggers
-- ══════════════════════════════════════════════════

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into public.profiles (id, display_name, avatar_url, email)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    new.raw_user_meta_data->>'avatar_url',
    new.email
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Auto-create default channels when realm is created
create or replace function public.handle_new_realm()
returns trigger language plpgsql security definer as $$
begin
  insert into public.channels (realm_id, name, type, position) values
    (new.id, 'narration',   'chat',  0),
    (new.id, 'battlefield', 'vtt',   1),
    (new.id, 'co-master',   'ai',    2),
    (new.id, 'voice',       'voice', 3);

  -- Owner is narrator
  insert into public.realm_members (realm_id, user_id, role, display_name)
  select new.id, new.owner_id, 'narrator', p.display_name
  from public.profiles p where p.id = new.owner_id;

  return new;
end;
$$;

create trigger on_realm_created
  after insert on public.realms
  for each row execute procedure public.handle_new_realm();

-- ══════════════════════════════════════════════════
--  Realtime Publications
-- ══════════════════════════════════════════════════

begin;
  drop publication if exists sanctum_realtime;
  create publication sanctum_realtime for table
    public.messages,
    public.tokens,
    public.realm_members,
    public.npcs,
    public.sessions,
    public.highlights;
commit;
