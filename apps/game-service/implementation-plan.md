# Game Service Implementation Plan

This document is the execution plan for coding after alignment.

## Objective

Implement an MVP runtime-authoritative game service that:

- keeps active room/session state in memory,
- validates authenticated player actions,
- resolves RockPaperScissor matches deterministically,
- submits final results to Supabase for permanent storage.

## Working Mode

- Contract-first implementation.
- Small vertical slices that are runnable after each step.
- Keep architecture simple for MVP; avoid infra overbuild.

## Milestone Checklist

- [x] M1 - Bootstrap and Guardrails
- [x] M2 - Runtime Models and Store
- [ ] M3 - Room Lifecycle API (in progress)
- [ ] M4 - RockPaperScissor Engine
- [ ] M5 - Session Gameplay API
- [ ] M6 - Result Publisher Contract
- [ ] M7 - Hardening and Docs

## Tech Debt Notes (Do Not Address Now)

- Runtime expiry settings use source constants, not environment variables. Any TTL or cleanup interval change requires service restart/redeploy.

## Milestones

## M1 - Bootstrap and Guardrails

Deliverables:

- Fastify service bootstrap
- environment loading and validation
- CORS and base error response shape
- GET /health endpoint

Acceptance:

- local run works with `npm run dev --workspace game-service`
- health endpoint returns 200

## M2 - Runtime Models and Store

Deliverables:

- RuntimeRoom, RuntimeSession, RuntimeActionLog types
- RuntimeRoomStore and RuntimeSessionStore interfaces
- InMemory store implementation with lookup by roomId and roomCode
- cleanup job for room/session expiry

Acceptance:

- waiting room TTL = 15 minutes
- active session TTL = 30 minutes
- cleanup interval = 60 seconds

## M3 - Room Lifecycle API

Deliverables:

- POST /v1/rooms
- POST /v1/rooms/:roomCode/join
- GET /v1/rooms/:roomId
- POST /v1/rooms/:roomId/ready
- POST /v1/rooms/:roomId/start

Rules:

- max 2 players for RockPaperScissor MVP
- host-only start
- non-member actions rejected

Acceptance:

- two users can create/join/ready/start
- third user join rejected with stable error code
- same player cant join same room
- there are validation of player id into supabase first
- api documentation for FE
- api testing for endpoints

## M4 - RockPaperScissor Engine

Deliverables:

- pure engine module (state + action + reducer-like apply)
- deterministic round resolution
- first-to-2 wins
- hidden opponent choice until both players submit

Acceptance:

- engine unit tests pass
- duplicate choice in same round rejected

## M5 - Session Gameplay API

Deliverables:

- GET /v1/sessions/:sessionId/state
- POST /v1/sessions/:sessionId/actions
- stateVersion incrementing and action ordering
- api documentation for FE
- api testing for endpoints

Acceptance:

- polling client sees state transitions correctly
- session finishes and emits final result payload

## M6 - Result Publisher Contract

Deliverables:

- SubmitSessionEnvelope builder
- resultHash + HMAC signature
- POST to Supabase submit-game-result function
- submittedAt marking on successful publish

Acceptance:

- success path persists result
- failed publish returns RESULT_SUBMISSION_FAILED

## M7 - Hardening and Docs

Deliverables:

- request/response schema validation
- integration tests for room/session happy paths
- restart behavior doc and known limitations
- Railway deployment verification checklist

Acceptance:

- documented failure behavior for restart/expiry
- README commands reflect actual package scripts

## API Error Contract (MVP)

Target error codes:

- UNAUTHORIZED
- ROOM_NOT_FOUND
- ROOM_EXPIRED
- SESSION_NOT_FOUND
- SESSION_EXPIRED
- ROOM_FULL
- NOT_HOST
- INVALID_ACTION
- RESULT_SUBMISSION_FAILED
- NOT_IMPLEMENTED

## Definition Of Done

1. Two authenticated users can complete a full match through API only.
2. Final result is written to Supabase and retrievable from DB.
3. Restart and expiry failures return clear actionable errors.
4. Railway deployment commands work from repository root.
