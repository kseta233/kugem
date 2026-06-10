-- M6: match_results table for multiplayer game results published by game-service.
-- This table stores the outcome of multiplayer matches submitted by the game-service
-- via the submit_game_result Edge Function with HMAC signature verification.

create table if not exists public.match_results (
  id uuid primary key default gen_random_uuid(),
  -- Unique game-service session identifier (prevents duplicate submissions)
  session_id text not null unique,
  room_id text not null,
  game_type text not null,
  game_version text not null,
  -- Player references (UUIDs must exist in auth.users)
  player1_user_id uuid not null references auth.users(id),
  player2_user_id uuid not null references auth.users(id),
  -- Nullable: draw results have no winner
  winner_user_id uuid references auth.users(id),
  player1_score int not null check (player1_score >= 0),
  player2_score int not null check (player2_score >= 0),
  -- Full round history from the game engine
  rounds jsonb not null default '[]'::jsonb,
  -- SHA-256 of the signed envelope body for audit/deduplication
  result_hash text not null,
  started_at timestamptz not null,
  ended_at timestamptz not null,
  submitted_at timestamptz not null,
  created_at timestamptz not null default now()
);

-- Index for looking up matches by player
create index if not exists match_results_player1_idx on public.match_results (player1_user_id);
create index if not exists match_results_player2_idx on public.match_results (player2_user_id);
create index if not exists match_results_winner_idx on public.match_results (winner_user_id) where winner_user_id is not null;
create index if not exists match_results_game_type_idx on public.match_results (game_type);

-- RLS: match results are readable by participants, not publicly browsable
alter table public.match_results enable row level security;

-- Players can read their own match results
create policy "Players can read own match results"
  on public.match_results
  for select
  using (
    auth.uid() = player1_user_id or auth.uid() = player2_user_id
  );

-- Only service role can insert (via Edge Function with admin client)
-- No insert policy needed for anon/authenticated since Edge Function uses admin client
