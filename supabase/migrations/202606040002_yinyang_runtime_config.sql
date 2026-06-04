-- Align YinYang Samurai runtime config with app behavior and rewards.
update public.games
set
  config = coalesce(config, '{}'::jsonb) || jsonb_build_object(
    'rewardCoin', 1,
    'baseRewardCoin', 1,
    'leaderboardBonusCoin', 10,
    'dailyBaseRewardCap', 5,
    'category', 'casual'
  ),
  updated_at = now()
where slug = 'yinyang-samurai';
