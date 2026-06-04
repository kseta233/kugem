# Game Service Plan

## Goal

Build a Railway-hosted runtime game session service that is authoritative during active play, while Supabase remains the only permanent persistence layer.

## Repository Layout Assumption

This service is developed and deployed from the same monorepo as the frontend and shared contracts.

Expected structure:

```txt
apps/web
apps/game-service
packages/game-contracts
supabase/functions/submit-game-result
```

Railway deploys only game-service, but build can depend on shared workspace packages from repository root.

Architecture boundary:

- Railway game-service: runtime only (rooms, active sessions, action logs in memory)
- Supabase Edge Function + DB: final result persistence only
- Web client: connects to game-service for live gameplay and to Supabase for profile/history

## Non-Goals (Current MVP)

- No Railway Postgres
- No Redis
- No WebSocket realtime
- No persistent room/session/action storage in game-service
- No crash recovery for active matches after process restart
- No paid/ranked match guarantee
- No matchmaking queue or bot player

## Runtime Rule

Everything that must survive process restart must be written to Supabase.

## High-Level Flow

1. Client sends authenticated requests to game-service with Supabase JWT.
2. Game-service validates auth and handles room/session state in memory.
3. When a session ends, game-service publishes a signed final result envelope to Supabase Edge Function.
4. Edge Function validates integrity/idempotency and writes to Supabase tables.

## API Surface (MVP)

Room API:

- POST /v1/rooms
- POST /v1/rooms/:roomCode/join
- GET /v1/rooms/:roomId
- POST /v1/rooms/:roomId/ready
- POST /v1/rooms/:roomId/start

Session API:

- GET /v1/sessions/:sessionId/state
- POST /v1/sessions/:sessionId/actions

Service API:

- GET /health

## Frontend Sync Model (MVP)

- Waiting room: poll GET /v1/rooms/:roomId every 1-2 seconds
- Game screen: poll GET /v1/sessions/:sessionId/state every 1-2 seconds
- WebSocket is intentionally out of scope for MVP

## Runtime Store Contracts

Use interfaces to isolate store implementation:

- RuntimeRoomStore
- RuntimeSessionStore

Initial implementation:

- InMemoryRoomStore
- InMemorySessionStore

This keeps game logic independent from storage technology and allows migration to Redis/Postgres later.

## Data Contracts (Core)

Shared contracts should include:

- RuntimeRoom
- RuntimeRoomPlayer
- RuntimeSession
- RuntimeGameAction
- SavePolicy
- SubmitSessionEnvelope
- RockPaperScissor state/action/public-state/result models

## Persistence Contract

Supabase receives only a final SubmitSessionEnvelope containing:

- Session metadata
- Player statuses
- Final result payload
- Optional replay payload (policy-driven)
- Integrity payload (resultHash + signature)

RockPaperScissor default save policy:

- saveSteps: false
- saveSnapshots: false
- saveFinalState: true
- saveResult: true
- replayable: false
- compression: none

## Supabase Tables (Result Only)

Required tables:

- game_result_sessions
- game_result_participants

Not required:

- room table
- active session table
- action log table

## Restart Behavior (Expected)

If game-service restarts:

- Active rooms/sessions are lost.
- Client must handle ROOM_NOT_FOUND / SESSION_NOT_FOUND and return user to create/start flow.

Expected API errors in failure paths:

- ROOM_NOT_FOUND
- SESSION_NOT_FOUND
- ROOM_EXPIRED
- SESSION_EXPIRED
- RESULT_SUBMISSION_FAILED

## Phased Delivery Plan

### Phase 1: Monorepo Foundation

Tasks:

- Ensure apps/game-service has independent package metadata and scripts.
- Add shared package for game contracts (packages/game-contracts).
- Define import paths used by web, game-service, and result function.

Acceptance:

- web and game-service can import shared contracts without path hacks.
- root-level workspace commands can build shared contracts and game-service in order.

### Phase 2: Contract-First Models

Tasks:

- Implement TypeScript contracts for room/session/action/result envelopes.
- Add schema/runtime validation for request and action payloads.

Acceptance:

- Invalid payloads are rejected with typed error responses.

### Phase 3: Service Bootstrap (Fastify)

Tasks:

- Create server bootstrap, env validation, CORS, logging, global error handler.
- Add auth middleware for Supabase JWT.
- Add GET /health.

Env:

- PORT
- NODE_ENV
- WEB_ORIGIN
- SUPABASE_URL
- SUPABASE_JWT_SECRET or SUPABASE_JWKS_URL
- SUPABASE_RESULT_FUNCTION_URL
- GAME_SERVICE_HMAC_SECRET

Acceptance:

- Service runs locally and health endpoint responds 200.

### Phase 4: In-Memory Runtime Store

Tasks:

- Implement room/session in-memory stores + indexes (id, roomCode).
- Add cleanup job:
  - waiting room TTL: 15 minutes
  - abandoned session TTL: 30 minutes

Acceptance:

- Expired rooms/sessions are cleaned automatically.
- Not-found paths return stable error contract.

### Phase 5: Waiting Room API

Tasks:

- Implement create/join/get/ready/start room endpoints.
- Enforce host-only start and max-player rules.

Acceptance:

- Two-player lifecycle works end-to-end.
- Third player join is rejected.

### Phase 6: RockPaperScissor Engine

Tasks:

- Implement pure deterministic engine.
- Enforce first-to-2 wins.
- Hide opponent choice until round resolution.

Acceptance:

- Engine unit tests pass and are deterministic.

### Phase 7: Session Gameplay API

Tasks:

- Implement session state fetch and action submit endpoints.
- Apply stateVersion and ordered action log behavior.

Acceptance:

- Round resolves only after both players choose.
- Session finishes correctly at win condition.

### Phase 8: Supabase Result Function

Tasks:

- Build submit-game-result function.
- Validate schemaVersion, source, signature, resultHash, idempotency.
- Insert rows into game_result_sessions and game_result_participants.

Acceptance:

- Valid result persists.
- Duplicate submission handled safely.

### Phase 9: Result Publisher in Game-Service

Tasks:

- On session finish, build and sign envelope.
- Call Supabase function.
- Mark runtime session submittedAt on success.

Acceptance:

- Final result available in Supabase history.

## Test Plan

Minimum tests:

- Unit:
  - RockPaperScissor engine
  - runtime store expiration behavior
  - result hash/signature utilities
- Integration:
  - room lifecycle
  - session lifecycle
  - result publish success/failure
- Contract:
  - submit envelope schema validation

## Operational Risks and Mitigations

Risks:

- Active session loss after restart
- Lost final result if service crashes before publish
- No replay/recovery for unfinished match

Mitigations (MVP-friendly):

- Keep sessions short
- Publish result immediately on finish
- Clear user-facing restart errors with restart flow

Future hardening:

- Add persistent runtime store (Redis/Postgres)
- Add durable outbox/retry queue for result publishing
- Add session snapshot persistence

## Definition of Done (MVP)

MVP is done when:

1. Two users can create/join/ready/start and complete RockPaperScissor match.
2. Final result is returned to clients and stored in Supabase through signed envelope flow.
3. Restart/loss scenarios fail gracefully with actionable errors.
4. Railway deployment is documented and reproducible.

## Railway Deployment Commands (Monorepo)

Use repository root / as Railway Root Directory.

Commands:

- Install: npm ci
- Build: npm run build --workspace game-contracts && npm run build --workspace game-service
- Start: npm run start --workspace game-service

If package names are scoped, use scoped workspace names.

## Current Executability Status

Current workspace status:

- apps/game-service currently contains docs only (plan.md and README.md)
- game-service package scripts (dev/build/start) do not exist yet
- game-contracts workspace package does not exist yet

Conclusion:

- The plan is executable as implementation guidance.
- The service is not executable yet as runtime software until Phase 1 scaffolding is added.

Minimum scaffolding required to become executable:

1. Create package.json for apps/game-service with dev/build/start scripts.
2. Create src/main.ts with Fastify bootstrap and GET /health.
3. Create packages/game-contracts with package.json and build output.
4. Add workspace scripts (if needed) so Railway commands resolve correctly.
