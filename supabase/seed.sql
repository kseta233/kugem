-- Phase 0 initial seed.
insert into public.games (
  slug,
  title,
  description,
  status,
  version,
  config
) values (
  'reaction-time',
  'Reaction Time',
  'Tap as fast as possible when the signal appears.',
  'active',
  1,
  '{
    "timeLimitMs": 30000,
    "maxScore": 1000,
    "maxScorePerSecond": 50,
    "rewardCoin": 5,
    "leaderboardEnabled": true,
    "shareEnabled": true
  }'::jsonb
)
on conflict (slug)
do update
set
  title = excluded.title,
  description = excluded.description,
  status = excluded.status,
  version = excluded.version,
  config = excluded.config,
  updated_at = now();
