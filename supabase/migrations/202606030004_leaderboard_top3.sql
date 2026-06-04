create table if not exists public.leaderboard (
  id uuid primary key default gen_random_uuid(),
  game_id uuid not null references public.games(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  score_id uuid not null unique references public.scores(id) on delete cascade,
  score int not null check (score >= 0),
  rank smallint not null check (rank between 1 and 3),
  achieved_at timestamptz not null default now()
);

create unique index if not exists idx_leaderboard_game_rank on public.leaderboard(game_id, rank);
create index if not exists idx_leaderboard_game_score on public.leaderboard(game_id, score desc, achieved_at asc);
create index if not exists idx_leaderboard_user_id on public.leaderboard(user_id);

alter table public.leaderboard enable row level security;

drop policy if exists "leaderboard_select_authenticated" on public.leaderboard;
create policy "leaderboard_select_authenticated"
on public.leaderboard
for select
to authenticated
using (true);

create or replace function public.refresh_game_leaderboard(p_game_id uuid)
returns table (
  score_id uuid,
  user_id uuid,
  score int,
  rank smallint,
  achieved_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
begin
  delete from public.leaderboard
  where game_id = p_game_id;

  insert into public.leaderboard (game_id, user_id, score_id, score, rank, achieved_at)
  select
    p_game_id,
    ranked.user_id,
    ranked.score_id,
    ranked.score,
    ranked.rank,
    ranked.achieved_at
  from (
    select
      s.user_id,
      s.id as score_id,
      s.score,
      row_number() over (order by s.score desc, s.created_at asc)::smallint as rank,
      s.created_at as achieved_at
    from public.scores as s
    where s.game_id = p_game_id
      and s.validation_status = 'valid'
    order by s.score desc, s.created_at asc
    limit 3
  ) as ranked
  order by ranked.rank;

  return query
  select
    l.score_id,
    l.user_id,
    l.score,
    l.rank,
    l.achieved_at
  from public.leaderboard as l
  where l.game_id = p_game_id
  order by l.rank asc;
end;
$$;