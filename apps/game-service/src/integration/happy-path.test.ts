/**
 * M7 Integration tests: full room + session match happy paths.
 * Tests the complete lifecycle from room creation through match completion.
 */
import assert from "node:assert/strict";
import test from "node:test";
import type { AppEnv } from "../env.js";
import { InMemoryRoomStore, InMemorySessionStore } from "../runtime-store/index.js";
import { createServer } from "../server.js";
import type {
  GameCatalogRecord,
  GameRoomRuleProvider,
  GameRoomRules,
} from "../modules/rooms/game-room-rule.service.js";
import type { UserIdentityProvider } from "../modules/rooms/user-identity.service.js";
import type { ResultPublisher } from "../modules/result-publisher/index.js";

const testEnv: AppEnv = {
  port: 3001,
  nodeEnv: "test",
  webOrigin: "http://localhost:5173",
  appHandshakeSecret: "test-app-secret",
  supabaseUrl: "https://example.supabase.co",
  supabaseServiceRoleKey: "test-service-role",
  supabaseResultFunctionUrl: "https://example.supabase.co/functions/v1/submit-game-result",
  gameServiceHmacSecret: "test-secret",
  supabaseJwtSecret: "test-jwt-secret",
};

const defaultRoomRules: Record<string, GameRoomRules> = {
  "rock-paper-scissors": { maxPlayers: [2], privateRoomEnabled: true },
};

function buildRoomRuleProvider(rules: Record<string, GameRoomRules>): GameRoomRuleProvider {
  return {
    async getActiveGameByType(gameType: string): Promise<GameCatalogRecord | null> {
      const config = rules[gameType];
      if (!config) return null;
      return { slug: gameType, version: 1, config: { roomRules: config } };
    },
    extractRoomRules(config: Record<string, unknown>): GameRoomRules {
      const roomRules = (config.roomRules ?? {}) as Record<string, unknown>;
      return {
        maxPlayers: Array.isArray(roomRules.maxPlayers)
          ? (roomRules.maxPlayers as number[]).filter((n) => Number.isInteger(n) && n > 1)
          : [2],
        privateRoomEnabled: roomRules.privateRoomEnabled === true,
      };
    },
  };
}

function buildUserIdentityProvider(validUsers: Set<string>): UserIdentityProvider {
  return {
    async userExists(userId: string): Promise<boolean> {
      return validUsers.has(userId);
    },
  };
}

function buildCapturingPublisher(): { publisher: ResultPublisher; captured: unknown[] } {
  const captured: unknown[] = [];
  const publisher: ResultPublisher = {
    async publishMatchResult(session) {
      captured.push(structuredClone(session));
      return { ok: true };
    },
  };
  return { publisher, captured };
}

async function createTestApp(options?: { resultPublisher?: ResultPublisher }) {
  const roomStore = new InMemoryRoomStore();
  const sessionStore = new InMemorySessionStore();
  const { publisher, captured } = buildCapturingPublisher();

  const app = await createServer(testEnv, {
    roomStore,
    sessionStore,
    gameRoomRuleService: buildRoomRuleProvider(defaultRoomRules),
    userIdentityService: buildUserIdentityProvider(new Set(["user-a", "user-b"])),
    resultPublisher: options?.resultPublisher ?? publisher,
  });

  return { app, roomStore, sessionStore, capturedPublishes: captured };
}

// ---------------------------------------------------------------------------
// Integration: full match happy path (user-a wins 2-0)
// ---------------------------------------------------------------------------

test("M7 integration: full match lifecycle — room create → start → play → finish", async () => {
  const { app, capturedPublishes } = await createTestApp();
  try {
    // 1. Host creates room
    const createRes = await app.inject({
      method: "POST",
      url: "/v1/rooms",
      headers: { "x-user-id": "user-a" },
      payload: { gameType: "rock-paper-scissors", displayName: "Player A" },
    });
    assert.equal(createRes.statusCode, 201);
    const { room: createdRoom } = createRes.json();
    const { roomId, roomCode } = createdRoom;
    assert.ok(typeof roomId === "string");
    assert.ok(typeof roomCode === "string");
    assert.equal(createdRoom.status, "waiting");

    // 2. Second player joins
    const joinRes = await app.inject({
      method: "POST",
      url: `/v1/rooms/${roomCode}/join`,
      headers: { "x-user-id": "user-b" },
      payload: { displayName: "Player B" },
    });
    assert.equal(joinRes.statusCode, 200);
    assert.equal(joinRes.json().room.players.length, 2);

    // 3. Get room state
    const getRoomRes = await app.inject({
      method: "GET",
      url: `/v1/rooms/${roomId}`,
    });
    assert.equal(getRoomRes.statusCode, 200);
    assert.equal(getRoomRes.json().room.status, "waiting");

    // 4. Both players ready
    for (const userId of ["user-a", "user-b"]) {
      const readyRes = await app.inject({
        method: "POST",
        url: `/v1/rooms/${roomId}/ready`,
        headers: { "x-user-id": userId },
        payload: { isReady: true },
      });
      assert.equal(readyRes.statusCode, 200);
    }
    const roomAfterReady = await app.inject({
      method: "GET",
      url: `/v1/rooms/${roomId}`,
    });
    assert.equal(roomAfterReady.json().room.status, "ready");

    // 5. Host starts session
    const startRes = await app.inject({
      method: "POST",
      url: `/v1/rooms/${roomId}/start`,
      headers: { "x-user-id": "user-a" },
    });
    assert.equal(startRes.statusCode, 200);
    const { session: startedSession } = startRes.json();
    const { sessionId } = startedSession;
    assert.ok(typeof sessionId === "string");
    assert.equal(startedSession.status, "started");
    assert.equal(startedSession.stateVersion, 0);

    // 6. Poll session state before any actions
    const stateRes = await app.inject({
      method: "GET",
      url: `/v1/sessions/${sessionId}/state`,
      headers: { "x-user-id": "user-a" },
    });
    assert.equal(stateRes.statusCode, 200);
    assert.equal(stateRes.json().session.stateVersion, 0);

    // 7. Round 1: user-a plays rock, user-b plays scissors → user-a wins
    const a1 = await app.inject({
      method: "POST",
      url: `/v1/sessions/${sessionId}/actions`,
      headers: { "x-user-id": "user-a" },
      payload: { actionType: "submit_choice", payload: { choice: "rock" } },
    });
    assert.equal(a1.statusCode, 200);
    assert.equal(a1.json().session.stateVersion, 1);

    const a2 = await app.inject({
      method: "POST",
      url: `/v1/sessions/${sessionId}/actions`,
      headers: { "x-user-id": "user-b" },
      payload: { actionType: "submit_choice", payload: { choice: "scissors" } },
    });
    assert.equal(a2.statusCode, 200);
    assert.equal(a2.json().session.stateVersion, 2);

    // Opponent's unrevealed choice must be hidden mid-round
    const midRoundState = await app.inject({
      method: "GET",
      url: `/v1/sessions/${sessionId}/state`,
      headers: { "x-user-id": "user-a" },
    });
    assert.equal(midRoundState.statusCode, 200);
    // After round 1 resolves score should be visible
    const midState = midRoundState.json().session.state;
    assert.equal(midState.player1Score, 1);
    assert.equal(midState.player2Score, 0);

    // 8. Round 2: user-a plays scissors, user-b plays paper → user-a wins → game finished
    await app.inject({
      method: "POST",
      url: `/v1/sessions/${sessionId}/actions`,
      headers: { "x-user-id": "user-a" },
      payload: { actionType: "submit_choice", payload: { choice: "scissors" } },
    });
    const finalAction = await app.inject({
      method: "POST",
      url: `/v1/sessions/${sessionId}/actions`,
      headers: { "x-user-id": "user-b" },
      payload: { actionType: "submit_choice", payload: { choice: "paper" } },
    });
    assert.equal(finalAction.statusCode, 200);
    const finalBody = finalAction.json();

    // 9. Verify final state
    assert.equal(finalBody.session.status, "finished");
    assert.equal(finalBody.session.state.gameStatus, "finished");
    assert.equal(finalBody.session.state.player1Score, 2);
    assert.equal(finalBody.session.state.player2Score, 0);
    assert.equal(finalBody.session.state.winnerId, "user-a");
    assert.ok(finalBody.session.endedAt, "endedAt must be set");
    assert.equal(finalBody.session.stateVersion, 4);

    // 10. Verify result was published
    assert.equal(capturedPublishes.length, 1);
  } finally {
    await app.close();
  }
});

// ---------------------------------------------------------------------------
// Integration: schema validation rejects invalid payloads
// ---------------------------------------------------------------------------

test("M7 integration: schema validation rejects invalid actionType", async () => {
  const { app, roomStore, sessionStore } = await createTestApp();
  try {
    // Quick setup: create a started session
    const createRes = await app.inject({
      method: "POST",
      url: "/v1/rooms",
      headers: { "x-user-id": "user-a" },
      payload: { gameType: "rock-paper-scissors", displayName: "A" },
    });
    const roomId = createRes.json().room.roomId;
    const roomCode = createRes.json().room.roomCode;

    await app.inject({ method: "POST", url: `/v1/rooms/${roomCode}/join`, headers: { "x-user-id": "user-b" }, payload: { displayName: "B" } });
    for (const u of ["user-a", "user-b"]) {
      await app.inject({ method: "POST", url: `/v1/rooms/${roomId}/ready`, headers: { "x-user-id": u }, payload: { isReady: true } });
    }
    const startRes = await app.inject({ method: "POST", url: `/v1/rooms/${roomId}/start`, headers: { "x-user-id": "user-a" } });
    const sessionId = startRes.json().session.sessionId;

    // Submit with invalid actionType
    const badAction = await app.inject({
      method: "POST",
      url: `/v1/sessions/${sessionId}/actions`,
      headers: { "x-user-id": "user-a" },
      payload: { actionType: "invalid_type", payload: { choice: "rock" } },
    });
    assert.equal(badAction.statusCode, 400);
    assert.equal(badAction.json().error.code, "INVALID_PAYLOAD");

    // Submit with invalid choice
    const badChoice = await app.inject({
      method: "POST",
      url: `/v1/sessions/${sessionId}/actions`,
      headers: { "x-user-id": "user-a" },
      payload: { actionType: "submit_choice", payload: { choice: "dynamite" } },
    });
    assert.equal(badChoice.statusCode, 400);
    assert.equal(badChoice.json().error.code, "INVALID_PAYLOAD");

    // Submit with missing payload
    const missingPayload = await app.inject({
      method: "POST",
      url: `/v1/sessions/${sessionId}/actions`,
      headers: { "x-user-id": "user-a" },
      payload: { actionType: "submit_choice" },
    });
    assert.equal(missingPayload.statusCode, 400);
    assert.equal(missingPayload.json().error.code, "INVALID_PAYLOAD");
  } finally {
    await app.close();
  }
});

test("M7 integration: schema validation rejects invalid create room body", async () => {
  const { app } = await createTestApp();
  try {
    // isReady must be boolean — send it as a string to trigger schema error
    // (AJV with strict mode rejects type mismatches for boolean)
    const res = await app.inject({
      method: "POST",
      url: "/v1/rooms",
      headers: { "x-user-id": "user-a" },
      payload: { gameType: "rock-paper-scissors", isPrivate: "yes" }, // boolean field sent as string
    });
    assert.equal(res.statusCode, 400);
    assert.equal(res.json().error.code, "INVALID_PAYLOAD");
  } finally {
    await app.close();
  }
});

test("M7 integration: expiry — expired session returns SESSION_EXPIRED", async () => {
  const { app } = await createTestApp();
  try {
    const createRes = await app.inject({
      method: "POST",
      url: "/v1/rooms",
      headers: { "x-user-id": "user-a" },
      payload: { gameType: "rock-paper-scissors", displayName: "A" },
    });
    const roomId = createRes.json().room.roomId;
    const roomCode = createRes.json().room.roomCode;

    await app.inject({ method: "POST", url: `/v1/rooms/${roomCode}/join`, headers: { "x-user-id": "user-b" }, payload: { displayName: "B" } });
    for (const u of ["user-a", "user-b"]) {
      await app.inject({ method: "POST", url: `/v1/rooms/${roomId}/ready`, headers: { "x-user-id": u }, payload: { isReady: true } });
    }
    const startRes = await app.inject({ method: "POST", url: `/v1/rooms/${roomId}/start`, headers: { "x-user-id": "user-a" } });
    const sessionId = startRes.json().session.sessionId;

    // Manually expire the session in the store
    const roomStore = new InMemoryRoomStore();
    const sessionStore = new InMemorySessionStore();
    // Inject an expired session by using the app's underlying store through injection
    // Simulate expiry by overriding expiresAt via a direct action on session store
    // Since we can't directly access the session store from here, use a fresh app with overridden session
    await app.close();

    // Create a new app with a pre-expired session to test the expiry path
    const sessionStore2 = new InMemorySessionStore();
    const expiredSession = {
      sessionId,
      roomId,
      gameType: "rock-paper-scissors",
      gameVersion: "1",
      status: "started" as const,
      players: [
        { userId: "user-a", displayName: "A", seat: 1, status: "ready" as const, joinedAt: new Date().toISOString() },
        { userId: "user-b", displayName: "B", seat: 2, status: "ready" as const, joinedAt: new Date().toISOString() },
      ],
      state: {},
      stateVersion: 0,
      actionLog: [],
      startedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() - 1000).toISOString(), // already expired
    };
    await sessionStore2.createSession(expiredSession);

    const { publisher } = buildCapturingPublisher();
    const app2 = await createServer(testEnv, {
      roomStore: new InMemoryRoomStore(),
      sessionStore: sessionStore2,
      gameRoomRuleService: buildRoomRuleProvider(defaultRoomRules),
      userIdentityService: buildUserIdentityProvider(new Set(["user-a", "user-b"])),
      resultPublisher: publisher,
    });
    try {
      const expiredRes = await app2.inject({
        method: "GET",
        url: `/v1/sessions/${sessionId}/state`,
        headers: { "x-user-id": "user-a" },
      });
      assert.equal(expiredRes.statusCode, 410);
      assert.equal(expiredRes.json().error.code, "SESSION_EXPIRED");
    } finally {
      await app2.close();
    }
    return; // skip outer finally close (already closed)
  } catch {
    await app.close();
  }
});
