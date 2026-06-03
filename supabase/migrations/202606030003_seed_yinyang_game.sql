-- Ensure YinYang Samurai exists in active games catalog.
insert into public.games (
  slug,
  title,
  description,
  status,
  version,
  config
) values (
  'yinyang-samurai',
  'YinYang Samurai',
  'Slice the flying orb into a perfect half with a single swipe.',
  'active',
  1,
  '{
    "maxScore": 1000,
    "rewardCoin": 8,
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
