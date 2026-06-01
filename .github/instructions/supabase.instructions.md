---
applyTo: "apps/web/src/features/**,apps/web/src/lib/**"
---

# Supabase Rules

Always use the shared Supabase client:

```ts
import { supabase } from '@/lib/supabase'
```

Do not create Supabase clients inside UI components.

Never expose or use the `service_role` key in frontend code.

Use environment variables for client config:

```env
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
```

## Security

Assume Row Level Security is enabled on all tables.

Users can only access their own:
- `profiles`
- `coin_ledger`
- `game_sessions`
- `scores` (read allowed by policy for valid/suspicious where applicable)
- `posts` (own or public)

Public read is allowed only for:
- `games` (active)
- leaderboard views/queries from `scores` with valid status

Never trust reward amount, coin delta, or final score from the client.

For sensitive writes, use Supabase RPC/database functions:
- `start_game_session` Edge Function
- `submit_score` Edge Function
- `create_share_post` Edge Function

## Database Conventions

Main tables:
- `profiles`
- `games`
- `game_sessions`
- `scores`
- `coin_ledger`
- `posts`

Use snake_case for all column names.

Include `created_at` timestamps by default.

Use anonymous auth as MVP default. Account linking can be added later.

Score and coin trust boundary:
- Never insert scores directly from frontend.
- Never mutate coin data directly from frontend.
- Score submission and reward logic must run through Edge Functions.

## Service Function Names

Preferred names for service functions:
- `signInAnonymously`, `signOut`, `getCurrentUser`
- `getProfile`, `updateProfile`
- `getGames`, `getGameById`
- `startGameSession`, `submitScore`
- `getCoinLedger`
