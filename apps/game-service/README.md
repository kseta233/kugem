# Game Service (Railway)

Runtime authoritative multiplayer backend for Kugem.

This service keeps active rooms and sessions in memory. Permanent history is written to Supabase through a result submission function.

## Repository Layout Assumption

This service is deployed from the same monorepo as the Kugem frontend.

Expected structure:

```txt
apps/web
apps/game-service
packages/game-contracts
supabase/functions/submit-game-result
```

Railway deploys only the game-service, but the build may require shared packages from the repository root.

## Runtime Model

- In-memory only: active rooms, active sessions, temporary action logs
- Persistent in Supabase: final session result and participants

Important behavior:

- If service restarts, active room/session data is lost.

## Non-Goals for MVP

The MVP does not include:

- WebSocket realtime
- Redis
- Railway PostgreSQL
- Durable active session recovery
- Coin staking
- Paid/ranked match guarantee
- Replay storage
- Permanent action log
- Matchmaking queue
- Bot player

## Runtime State Contract

The service stores these runtime objects in memory:

- RuntimeRoom
- RuntimeSession
- RuntimeActionLog

RuntimeRoom contains:

- roomId
- roomCode
- gameType
- gameVersion
- status
- hostUserId
- players
- createdAt
- expiresAt
- sessionId

RuntimeSession contains:

- sessionId
- roomId
- gameType
- gameVersion
- status
- players
- currentState
- stateVersion
- actionLog
- startedAt
- endedAt
- submittedAt

## Runtime Expiry Policy

- Waiting room expires after 15 minutes if not started.
- Active session expires after 30 minutes if not finished.
- Finished session may remain in memory for 5 minutes after result submission, then deleted.
- Cleanup job runs every 60 seconds.

## MVP API

Room lifecycle:

- POST /v1/rooms
- POST /v1/rooms/:roomCode/join
- GET /v1/rooms/:roomId
- POST /v1/rooms/:roomId/ready
- POST /v1/rooms/:roomId/start

Session lifecycle:

- GET /v1/sessions/:sessionId/state
- POST /v1/sessions/:sessionId/actions

System:

- GET /health

## Frontend Sync Model

The MVP uses REST polling.

Waiting room:

- Poll GET /v1/rooms/:roomId every 1-2 seconds.

Game screen:

- Poll GET /v1/sessions/:sessionId/state every 1-2 seconds.

WebSocket is intentionally excluded from MVP.

## Prerequisites

Required for backend-only local development:

- Node.js 22+
- npm 10+
- Supabase project with Auth configured

Required for full end-to-end result submission:

- Railway account and project
- submit-game-result Edge Function (or equivalent) deployed
- result tables/migrations applied
- GAME_SERVICE_HMAC_SECRET configured in both game-service and Edge Function

## Expected Service Environment Variables

Required:

- PORT
- NODE_ENV
- WEB_ORIGIN
- APP_HANDSHAKE_SECRET
- SUPABASE_URL
- SUPABASE_SERVICE_ROLE_KEY
- SUPABASE_JWT_SECRET or SUPABASE_JWKS_URL
- SUPABASE_RESULT_FUNCTION_URL
- GAME_SERVICE_HMAC_SECRET

Notes:

- PORT is provided automatically by Railway, but define it for local development.
- Use only one JWT verification method:
  - SUPABASE_JWT_SECRET, or
  - SUPABASE_JWKS_URL

## Local Setup (when service scaffold is present)

From repository root:

```bash
npm install
npm run dev --workspace game-service
```

Health check:

```bash
curl http://localhost:3001/health
```

Run tests:

```bash
npm run test --workspace game-service
```

Type check:

```bash
npm run typecheck --workspace game-service
```

Build:

```bash
npm run build --workspace game-service
```

## Railway Deployment Setup

### 1. Create Service

1. Open Railway project.
2. Add a new service from GitHub repo.
3. Set Root Directory to repository root /.

Root Directory stays at repo root because the backend may import shared workspace packages such as packages/game-contracts.

### 2. Configure Build and Start

Use these commands in Railway service settings:

- Install Command: npm ci
- Build Command: npm run build --workspace game-contracts && npm run build --workspace game-service
- Start Command: npm run start --workspace game-service

If workspace package names are scoped, use scoped names.

Example:

- Build Command: npm run build --workspace @kugem/game-contracts && npm run build --workspace @kugem/game-service
- Start Command: npm run start --workspace @kugem/game-service

### 3. Configure Variables

In Railway service Variables tab, set:

- NODE_ENV=production
- WEB_ORIGIN=<your web app URL>
- SUPABASE_URL=<your Supabase URL>
- SUPABASE_JWT_SECRET or SUPABASE_JWKS_URL
- SUPABASE_RESULT_FUNCTION_URL=<edge function invoke URL>
- GAME_SERVICE_HMAC_SECRET=<strong random secret>

Do not expose service secrets in client bundles.

### 4. Networking and Health

- Ensure service binds to 0.0.0.0 and process.env.PORT.
- Configure health check path to /health.

### 5. Deploy

1. Trigger deployment from Railway.
2. Wait for build and startup completion.
3. Verify logs show service listening on assigned port.
4. Verify /health endpoint returns 200.

## Railway Deployment Verification Checklist

After deploying to Railway, verify the following:

### 1. Health Check

```bash
curl https://<your-railway-domain>/health
```

Expected: `{ "status": "ok", "service": "game-service" }`

### 2. Environment Variables Set

- [ ] `PORT` — optional (Railway provides automatically)
- [ ] `NODE_ENV=production`
- [ ] `WEB_ORIGIN` — frontend origin for CORS
- [ ] `APP_HANDSHAKE_SECRET` — shared secret with frontend
- [ ] `SUPABASE_URL`
- [ ] `SUPABASE_SERVICE_ROLE_KEY`
- [ ] `SUPABASE_JWT_SECRET` or `SUPABASE_JWKS_URL`
- [ ] `SUPABASE_RESULT_FUNCTION_URL` — Edge Function URL
- [ ] `GAME_SERVICE_HMAC_SECRET` — must match Edge Function secret

### 3. Supabase Integration

- [ ] `supabase/migrations/202606100001_match_results.sql` applied
- [ ] `submit_game_result` Edge Function deployed
- [ ] `GAME_SERVICE_HMAC_SECRET` set in Edge Function secrets (same value)

### 4. Smoke Test

1. Create room: `POST /v1/rooms` with `x-app-secret` and `x-user-id` headers
2. Join room with second user
3. Both ready, start session
4. Play until one player wins 2 rounds
5. Confirm `match_results` row exists in Supabase

### 5. Known Failure Modes

| Scenario | Behavior |
|---|---|
| Service restart during active match | Room/session lost. Returns ROOM_NOT_FOUND / SESSION_NOT_FOUND. |
| Supabase unreachable on submit | Returns RESULT_SUBMISSION_FAILED (502). Match result is lost. |
| Session expires (30 min) | Returns SESSION_EXPIRED (410). |
| Room expires (15 min) | Returns ROOM_EXPIRED (410), then ROOM_NOT_FOUND. |

## Supabase Integration Checklist

- submit-game-result function validates:
  - schemaVersion
  - source
  - signature
  - resultHash
  - idempotent external_session_id
- function writes to:
  - game_result_sessions
  - game_result_participants

## Smoke Test (Post Deploy)

1. Create room via POST /v1/rooms.
2. Join room with second user.
3. Ready both users and start session.
4. Play until finish.
5. Confirm result persisted in Supabase tables.

## Restart Limitation (Current MVP)

Current behavior is intentional:

- Restart during active match drops in-memory state.
- API should return ROOM_NOT_FOUND or SESSION_NOT_FOUND.
- Frontend should redirect users to restart match flow.

## Failure Behavior

If Railway restarts:

- active rooms are lost
- active sessions are lost
- unfinished matches are not persisted
- final result may be lost if the service crashes before successful result submission

Expected API errors:

- ROOM_NOT_FOUND
- SESSION_NOT_FOUND
- ROOM_EXPIRED
- SESSION_EXPIRED
- RESULT_SUBMISSION_FAILED

For POC, this is acceptable.

For paid/ranked matches, this is not acceptable.

## Recommended Next Hardening Steps

1. Add durable runtime store (Redis/Postgres).
2. Add result publish retry queue/outbox.
3. Add session recovery strategy for paid/ranked modes.
