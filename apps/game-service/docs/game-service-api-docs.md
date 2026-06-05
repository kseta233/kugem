# Game Service API Docs

## Scope

This document covers current M3 APIs in game-service:

- health endpoint
- room lifecycle endpoints
- Supabase-backed user validation
- Supabase-backed room rule validation by gameType
- private room join with password check

Base URL examples:

- local: http://127.0.0.1:3001
- railway: https://kugem-production.up.railway.app

## Common Rules

1. All room endpoints require header `x-user-id`.
2. All `/v1/*` endpoints require header `x-app-secret`.
3. `x-user-id` must exist in Supabase Auth.
4. Room create validates:
	 - game type exists and active in `public.games`
	 - max players is allowed by `games.config.roomRules.maxPlayers`
	 - private room allowed by `games.config.roomRules.privateRoomEnabled`
5. If room is private, join requires matching password.
6. Room response never returns room password.

## Supabase Config Contract

Room rules are read from `public.games.config.roomRules`:

```json
{
	"roomRules": {
		"maxPlayers": [2],
		"privateRoomEnabled": true
	}
}
```

## Error Envelope

All errors use:

```json
{
	"error": {
		"code": "ERROR_CODE",
		"message": "Human readable message"
	}
}
```

Common error codes:

- UNAUTHORIZED
- INVALID_APP_SECRET
- ROOM_NOT_FOUND
- ROOM_EXPIRED
- ROOM_FULL
- NOT_HOST
- INVALID_ACTION
- NOT_FOUND
- INTERNAL_SERVER_ERROR

## Endpoints

### GET /health

Response 200:

```json
{
	"status": "ok",
	"service": "game-service",
	"uptimeSeconds": 12,
	"timestamp": "2026-06-05T03:00:00.000Z"
}
```

### POST /v1/rooms

Headers:

- x-app-secret: `<shared-app-secret>`
- x-user-id: `<supabase-user-id>`

Request body:

```json
{
	"gameType": "rock-paper-scissors",
	"displayName": "Player A",
	"maxPlayers": 2,
	"isPrivate": true,
	"password": "1234"
}
```

Notes:

- `gameType` default: `rock-paper-scissors`
- `maxPlayers` default: first value in `roomRules.maxPlayers`
- if `isPrivate` is true, `password` is required

Response 201:

```json
{
	"room": {
		"roomId": "0d7ecf5d-d8aa-4d77-9044-ec008fc6724e",
		"roomCode": "123456",
		"gameType": "rock-paper-scissors",
		"gameVersion": "1",
		"isPrivate": true,
		"status": "waiting",
		"hostUserId": "user-a",
		"maxPlayers": 2,
		"players": [
			{
				"userId": "user-a",
				"displayName": "Player A",
				"seat": 1,
				"status": "joined",
				"joinedAt": "2026-06-05T03:00:00.000Z"
			}
		],
		"createdAt": "2026-06-05T03:00:00.000Z",
		"updatedAt": "2026-06-05T03:00:00.000Z",
		"expiresAt": "2026-06-05T03:15:00.000Z"
	}
}
```

Error cases:

- 401 UNAUTHORIZED (missing header or user not found)
- 400 INVALID_ACTION (unknown gameType, invalid maxPlayers, private room not allowed, missing private password)

### POST /v1/rooms/:roomCode/join

Headers:

- x-app-secret: `<shared-app-secret>`
- x-user-id: `<supabase-user-id>`

Request body:

```json
{
	"displayName": "Player B",
	"password": "1234"
}
```

Response 200:

```json
{
	"room": {
		"roomId": "0d7ecf5d-d8aa-4d77-9044-ec008fc6724e",
		"roomCode": "123456",
		"gameType": "rock-paper-scissors",
		"gameVersion": "1",
		"isPrivate": true,
		"status": "waiting",
		"hostUserId": "user-a",
		"maxPlayers": 2,
		"players": [
			{
				"userId": "user-a",
				"displayName": "Player A",
				"seat": 1,
				"status": "joined",
				"joinedAt": "2026-06-05T03:00:00.000Z"
			},
			{
				"userId": "user-b",
				"displayName": "Player B",
				"seat": 2,
				"status": "joined",
				"joinedAt": "2026-06-05T03:01:00.000Z"
			}
		],
		"createdAt": "2026-06-05T03:00:00.000Z",
		"updatedAt": "2026-06-05T03:01:00.000Z",
		"expiresAt": "2026-06-05T03:15:00.000Z"
	}
}
```

Error cases:

- 401 UNAUTHORIZED
- 404 ROOM_NOT_FOUND
- 410 ROOM_EXPIRED
- 409 INVALID_ACTION (already started or duplicate join)
- 409 ROOM_FULL
- 403 INVALID_ACTION (private password mismatch)

### GET /v1/rooms/:roomId

Response 200:

```json
{
	"room": {
		"roomId": "0d7ecf5d-d8aa-4d77-9044-ec008fc6724e",
		"roomCode": "123456",
		"gameType": "rock-paper-scissors",
		"gameVersion": "1",
		"isPrivate": false,
		"status": "waiting",
		"hostUserId": "user-a",
		"maxPlayers": 2,
		"players": [],
		"createdAt": "2026-06-05T03:00:00.000Z",
		"updatedAt": "2026-06-05T03:00:00.000Z",
		"expiresAt": "2026-06-05T03:15:00.000Z"
	}
}
```

Error cases:

- 404 ROOM_NOT_FOUND
- 410 ROOM_EXPIRED

### POST /v1/rooms/:roomId/ready

Headers:

- x-app-secret: `<shared-app-secret>`
- x-user-id: `<supabase-user-id>`

Request body:

```json
{
	"isReady": true
}
```

Behavior:

- only room members can update ready state
- room status becomes `ready` only when all players are ready

Error cases:

- 401 UNAUTHORIZED
- 404 ROOM_NOT_FOUND
- 410 ROOM_EXPIRED
- 403 INVALID_ACTION (non-member)

### POST /v1/rooms/:roomId/start

Headers:

- x-app-secret: `<shared-app-secret>`
- x-user-id: `<supabase-user-id>`

Behavior:

- only host can start
- room must be full
- all players must be ready
- creates runtime session

Response 200:

```json
{
	"room": {
		"roomId": "0d7ecf5d-d8aa-4d77-9044-ec008fc6724e",
		"roomCode": "123456",
		"gameType": "rock-paper-scissors",
		"gameVersion": "1",
		"isPrivate": false,
		"status": "started",
		"hostUserId": "user-a",
		"maxPlayers": 2,
		"players": [],
		"sessionId": "13fb9447-d31b-4347-90ca-5f5d4e2ac876",
		"createdAt": "2026-06-05T03:00:00.000Z",
		"updatedAt": "2026-06-05T03:02:00.000Z",
		"expiresAt": "2026-06-05T03:15:00.000Z"
	},
	"session": {
		"sessionId": "13fb9447-d31b-4347-90ca-5f5d4e2ac876",
		"roomId": "0d7ecf5d-d8aa-4d77-9044-ec008fc6724e",
		"gameType": "rock-paper-scissors",
		"gameVersion": "1",
		"status": "started",
		"players": [],
		"state": {},
		"stateVersion": 0,
		"actionLog": [],
		"startedAt": "2026-06-05T03:02:00.000Z",
		"updatedAt": "2026-06-05T03:02:00.000Z",
		"expiresAt": "2026-06-05T03:32:00.000Z"
	}
}
```

Error cases:

- 401 UNAUTHORIZED
- 404 ROOM_NOT_FOUND
- 410 ROOM_EXPIRED
- 403 INVALID_ACTION (non-member)
- 403 NOT_HOST
- 409 INVALID_ACTION (room not full or players not all ready)

## Postman

Collection file:

- apps/game-service/docs/postman/game-service-m3.postman_collection.json

Import this collection, set variables, then run requests in this order:

1. Create Room (Private or Public)
2. Join Room
3. Get Room
4. Ready User A
5. Ready User B
6. Start Room

## Notes

1. Current private room password is plain text by design for MVP.
2. Room password is intentionally not returned in API responses.
3. Cleanup TTL values are constant-based in source and require restart/redeploy to change.
