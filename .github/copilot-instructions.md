# Copilot Custom Instructions

## Project Context

This project is an MVP casual mini-game platform using TypeScript and Supabase.

Core MVP features:
- Anonymous authentication (MVP default)
- User profile
- Game list
- Coin balance
- Coin ledger
- Game session start and finish
- Basic score and reward flow
- Basic leaderboard
- Basic share result metadata

## Tech Stack

- TypeScript
- Supabase JS SDK (`@supabase/supabase-js`) — Auth, Postgres, RLS
- React + Vite
- Phaser
- Supabase Edge Functions
- Supabase Storage
- Capacitor (mobile wrapper after web MVP)

## Code Style

Use small service functions instead of large Supabase queries inside components.

Preferred folder structure:

```text
apps/web/src/lib/supabase.ts
apps/web/src/features/auth/
apps/web/src/features/profile/
apps/web/src/features/games/
apps/web/src/features/sessions/
supabase/migrations/
supabase/functions/
```

Always handle: loading state, empty state, error state.

Frontend must be mobile-friendly by default because the app will be wrapped later.

For the first game module, use portrait-only layout constraints.

## MVP Priority

Keep implementation simple.

Prioritize:
1. Working auth
2. Clean database schema
3. Safe RLS policies
4. Basic game session flow
5. Coin reward flow
6. Simple UI
7. Leaderboard and share metadata after core score/coin flow

Avoid over-engineering. Do not add complex backend services unless explicitly requested.

Execution lock: complete implementation up to score and coin flow first (Phase 4) before implementing leaderboard/share (Phase 5).
