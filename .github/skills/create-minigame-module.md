# Skill: Create Minigame Module

Use this skill to add a new playable mini-game to the platform.

## Workflow

Follow these steps in order for each new game.

### Step 1 — Game Metadata

Insert a row into the `games` table (via migration or seed):

```sql
INSERT INTO games (slug, title, description, status, version, config)
VALUES (
  'tap-score',
  'Tap to Score',
  'Tap as fast as you can!',
  'active',
  1,
  '{"rewardCoin":10,"timeLimitMs":30000,"maxScore":1000,"maxScorePerSecond":50}'::jsonb
);
```

Fields to define:
- `slug` — unique identifier used in routing
- `title` — display name
- `description` — short description shown on game list
- `status` — use `active` for published game in MVP
- `config.rewardCoin` — coin reward source

### Step 2 — Game Screen Component

Create `apps/web/src/features/games/<slug>/GameScreen.tsx`.

The screen must:
- Accept `gameId` as a prop or read from route params
- Call `startGameSession(gameId)` on mount
- Render the game UI
- Call `submitScore(sessionId, score)` when the game ends

Keep game logic inside a separate hook: `use<GameName>Game.ts`.

For the first game, keep layout portrait-only.

### Step 3 — Game Session

Use the shared session service in `apps/web/src/features/sessions/sessions.service.ts`:
- `startGameSession(gameSlug)` invokes `start_game_session` and returns `sessionId`
- `submitScore(sessionId, score, durationMs)` invokes `submit_score`

Do not create separate session tables per game. All games share `game_sessions`.

### Step 4 — Score Submission

Call `submitScore` with the final score when the player finishes.

The server-side Edge Function handles:
- Saving score to `scores`
- Calculating coin reward
- Inserting row into `coin_ledger`
- Updating profile coin aggregate when needed

Do not calculate or apply rewards on the client.

### Step 5 — Result Screen

After session finishes, show:
- Final score
- Coins earned
- Button to play again or go back to game list

### Step 6 — Leaderboard (optional)

If leaderboard is needed, add a query to `scores`:

```ts
const getLeaderboard = async (gameId: string) => {
  return supabase
    .from('scores')
    .select('profiles(username), score, created_at')
    .eq('game_id', gameId)
    .eq('validation_status', 'valid')
    .order('score', { ascending: false })
    .limit(10)
}
```

### Step 7 — Verification Checklist

- [ ] Game metadata inserted into `games` table
- [ ] `GameScreen` calls `startGameSession` on mount
- [ ] Score submitted via `submitScore` Edge Function flow — not manually
- [ ] Coin reward handled server-side only
- [ ] Result screen shows score and coins earned
- [ ] Game accessible from game list via slug/route
