# Leaderboard Implementation Plan

## Goal

Implement all-time leaderboard per game with these rules:

- results are saved to cloud only when the user taps Share in YinYang Samurai
- leaderboard stores only the top 3 valid scores per game
- suspicious scores are stored in `scores` but never enter leaderboard
- coin rewards are granted only when a shared result enters the leaderboard
- backend keeps `submit_score` and `create_share_post` as separate edge functions
- frontend merges the share flow into a single action for YinYang Samurai

## Delivery Order

1. Apply migration `202606030004_leaderboard_top3.sql`
2. Deploy edge functions:
   - `submit_score`
   - `create_share_post`
   - `get_leaderboard`
3. Deploy web app changes
4. Smoke test share flow and leaderboard refresh in YinYang Samurai

## Database Changes

- add `public.leaderboard`
- add `public.refresh_game_leaderboard(p_game_id uuid)`
- materialize only the best 3 valid scores per game ordered by:
  - `score desc`
  - `created_at asc`

## Backend Changes

### `submit_score`

- keeps score validation and score insert flow
- refreshes leaderboard using `refresh_game_leaderboard`
- returns:
  - `enteredLeaderboard`
  - `leaderboardRank`
  - `coinReward`
  - `totalCoin`
- grants coins only when:
  - score is `valid`
  - score enters leaderboard top 3

### `create_share_post`

- unchanged responsibility
- only creates share post from an existing score record

### `get_leaderboard`

- reads top 3 rows from `public.leaderboard`
- joins profile display data
- is the only FE read path for leaderboard

## Frontend Changes

### YinYang Samurai

- finishing the game stores result locally only
- tapping Share runs:
  1. `submit_score`
  2. `create_share_post`
- leaderboard panel reads from `get_leaderboard`

### Other Games

- existing score submission flow remains unchanged

## Verification Checklist

- migration applies without SQL error
- valid shared score enters leaderboard when it is top 3
- valid shared score outside top 3 gets `coinReward = 0`
- suspicious score never enters leaderboard and gets `coinReward = 0`
- direct back from YinYang result screen does not create a score row
- leaderboard fetch returns max 3 rows per game
- repeated share action reuses existing share link in the same client session

## Notes

- because save happens on Share for YinYang Samurai, leaderboard reflects best shared scores, not every local play result
- current implementation allows the same user to occupy multiple leaderboard slots if they own multiple top scores