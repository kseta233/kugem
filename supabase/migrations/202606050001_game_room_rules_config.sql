-- Add room-rule config directly in public.games.config for game-service validation.

insert into public.games (
  slug,
  title,
  description,
  status,
  version,
  config
) values (
  'rock-paper-scissors',
  'Rock Paper Scissors',
  'Classic first-to-win rounds game for 2 players.',
  'active',
  1,
  jsonb_build_object(
    'roomRules', jsonb_build_object(
      'maxPlayers', jsonb_build_array(2),
      'privateRoomEnabled', true
    )
  )
)
on conflict (slug)
do update
set
  title = excluded.title,
  description = excluded.description,
  status = excluded.status,
  version = excluded.version,
  config = coalesce(public.games.config, '{}'::jsonb) || jsonb_build_object(
    'roomRules', jsonb_build_object(
      'maxPlayers', jsonb_build_array(2),
      'privateRoomEnabled', true
    )
  ),
  updated_at = now();

update public.games
set
  config = coalesce(config, '{}'::jsonb) || jsonb_build_object(
    'roomRules', jsonb_build_object(
      'maxPlayers', jsonb_build_array(1),
      'privateRoomEnabled', false
    )
  ),
  updated_at = now()
where slug = 'yinyang-samurai';
