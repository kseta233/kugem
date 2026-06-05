-- Fix score validation for YinYang Samurai.
-- The game throws a ball over 2800ms and scores up to 1000 points (100% cut accuracy).
-- Max score per second = 1000 / 2.8 ≈ 357.
-- The default maxScorePerSecond in submit_score is 50, which marks all good scores as suspicious.
-- Set it to 400 to allow the full scoring range with a small headroom.

update public.games
set config = coalesce(config, '{}'::jsonb) || jsonb_build_object(
  'maxScore', 1000,
  'maxScorePerSecond', 400,
  'timeLimitMs', 5000
)
where slug = 'yinyang-samurai';
