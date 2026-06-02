-- Phase 0 foundation: schema, RLS, and initial policies for MVP.

create extension if not exists pgcrypto;

create type public.game_status as enum ('draft', 'active', 'inactive', 'archived');
create type public.session_status as enum ('started', 'submitted', 'expired', 'rejected');
create type public.score_validation_status as enum ('valid', 'suspicious', 'rejected');
create type public.coin_transaction_type as enum ('reward', 'adjustment', 'spend', 'refund');
create type public.user_app_status as enum ('anonymous', 'registered', 'blocked');

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text unique,
  display_name text,
  avatar_url text,
  app_status public.user_app_status not null default 'anonymous',
  total_coin int not null default 0 check (total_coin >= 0),
  total_play_count int not null default 0 check (total_play_count >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.games (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  title text not null,
  description text,
  thumbnail_url text,
  status public.game_status not null default 'draft',
  version int not null default 1,
  config jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.game_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  game_id uuid not null references public.games(id),
  game_version int not null,
  nonce text not null,
  status public.session_status not null default 'started',
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  submitted_score int,
  duration_ms int,
  client_meta jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.scores (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  game_id uuid not null references public.games(id),
  session_id uuid not null unique references public.game_sessions(id),
  score int not null check (score >= 0),
  duration_ms int not null check (duration_ms >= 0),
  validation_status public.score_validation_status not null default 'valid',
  validation_reason text,
  created_at timestamptz not null default now()
);

create table if not exists public.coin_ledger (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  score_id uuid references public.scores(id),
  transaction_type public.coin_transaction_type not null,
  amount int not null,
  balance_after int not null check (balance_after >= 0),
  reason text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.posts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  game_id uuid not null references public.games(id),
  score_id uuid references public.scores(id),
  caption text,
  media_url text,
  share_slug text unique not null,
  is_public boolean not null default true,
  created_at timestamptz not null default now()
);

create index if not exists idx_game_sessions_user_id on public.game_sessions(user_id);
create index if not exists idx_game_sessions_game_id on public.game_sessions(game_id);
create index if not exists idx_game_sessions_status on public.game_sessions(status);

create index if not exists idx_scores_game_score on public.scores(game_id, score desc);
create index if not exists idx_scores_user_id on public.scores(user_id);
create index if not exists idx_scores_created_at on public.scores(created_at desc);

create index if not exists idx_coin_ledger_user_id on public.coin_ledger(user_id);
create index if not exists idx_coin_ledger_created_at on public.coin_ledger(created_at desc);

create index if not exists idx_posts_user_id on public.posts(user_id);
create index if not exists idx_posts_game_id on public.posts(game_id);
create index if not exists idx_posts_share_slug on public.posts(share_slug);

alter table public.profiles enable row level security;
alter table public.games enable row level security;
alter table public.game_sessions enable row level security;
alter table public.scores enable row level security;
alter table public.coin_ledger enable row level security;
alter table public.posts enable row level security;

drop policy if exists "profiles_select_public" on public.profiles;
create policy "profiles_select_public"
on public.profiles
for select
to authenticated
using (true);

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own"
on public.profiles
for update
to authenticated
using (auth.uid() = id)
with check (auth.uid() = id);

drop policy if exists "profiles_insert_own" on public.profiles;
create policy "profiles_insert_own"
on public.profiles
for insert
to authenticated
with check (auth.uid() = id);

drop policy if exists "games_select_active" on public.games;
create policy "games_select_active"
on public.games
for select
to authenticated
using (status = 'active');

drop policy if exists "game_sessions_select_own" on public.game_sessions;
create policy "game_sessions_select_own"
on public.game_sessions
for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists "scores_select_valid" on public.scores;
create policy "scores_select_valid"
on public.scores
for select
to authenticated
using (validation_status in ('valid', 'suspicious'));

drop policy if exists "coin_ledger_select_own" on public.coin_ledger;
create policy "coin_ledger_select_own"
on public.coin_ledger
for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists "posts_select_public" on public.posts;
create policy "posts_select_public"
on public.posts
for select
to authenticated
using (is_public = true or auth.uid() = user_id);

drop policy if exists "posts_select_own" on public.posts;
create policy "posts_select_own"
on public.posts
for select
to authenticated
using (auth.uid() = user_id);
