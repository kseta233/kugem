import assert from "node:assert/strict";
import test from "node:test";
import type { FastifyInstance } from "fastify";
import type { AppEnv } from "../../env.js";
import { InMemoryRoomStore, InMemorySessionStore } from "../../runtime-store/index.js";
import type { RuntimeRoom, RuntimeSession } from "../../runtime-store/types.js";
import { createServer } from "../../server.js";
import type {
  GameCatalogRecord,
  GameRoomRuleProvider,
  GameRoomRules,
} from "../rooms/game-room-rule.service.js";
import type { UserIdentityProvider } from "../rooms/user-identity.service.js";
import type { ResultPublisher, PublishResultOutcome } from "../result-publisher/index.js";

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

type TestSetup = {
  app: FastifyInstance;
  roomStore: InMemoryRoomStore;
  sessionStore: InMemorySessionStore;
};

function buildRoomRuleProvider(configByGameType: Record<string, GameRoomRules>): GameRoomRuleProvider {
  return {
    async getActiveGameByType(gameType: string): Promise<GameCatalogRecord | null> {
      const config = configByGameType[gameType];
      if (!config) {
        return null;
      }

      return {
        slug: gameType,
        version: 1,
        config: {
          roomRules: {
            maxPlayers: config.maxPlayers,
            privateRoomEnabled: config.privateRoomEnabled,
          },
        },
      };
    },
    extractRoomRules(config: Record<string, unknown>): GameRoomRules {
      const roomRules = (config.roomRules ?? {}) as Record<string, unknown>;
      const maxPlayersRaw = roomRules.maxPlayers;
      return {
        maxPlayers: Array.isArray(maxPlayersRaw)
          ? maxPlayersRaw.filter((n): n is number => Number.isInteger(n) && n > 1)
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

async function createTestSetup(options?: {
  roomRules?: Record<string, GameRoomRules>;
  validUsers?: string[];
  resultPublisher?: ResultPublisher;
}): Promise<TestSetup> {
  const roomStore = new InMemoryRoomStore();
  const sessionStore = new InMemorySessionStore();

  const defaultPublisher: ResultPublisher = {
    async publishMatchResult() {
      return { ok: true };
    },
  };

  const app = await createServer(testEnv, {
    roomStore,
    sessionStore,
    gameRoomRuleService: buildRoomRuleProvider(
      options?.roomRules ?? {
        "rock-paper-scissors": {
          maxPlayers: [2],
          privateRoomEnabled: true,
        },
      },
    ),
    userIdentityService: buildUserIdentityProvider(
      new Set(options?.validUsers ?? ["user-a", "user-b", "user-c"]),
    ),
    resultPublisher: options?.resultPublisher ?? defaultPublisher,
  });

  return { app, roomStore, sessionStore };
}

async function createAndStartRoom(
  app: FastifyInstance,
  roomStore: InMemoryRoomStore,
  user1: string,
  user2: string,
): Promise<{ roomId: string; sessionId: string }> {
  // Create room
  const createRes = await app.inject({
    method: "POST",
    url: "/v1/rooms",
    headers: { "x-user-id": user1 },
    payload: { displayName: "Player 1" },
  });
  const room1 = createRes.json().room;
  const roomId = room1.roomId;

  // Join room
  await app.inject({
    method: "POST",
    url: `/v1/rooms/${room1.roomCode}/join`,
    headers: { "x-user-id": user2 },
    payload: { displayName: "Player 2" },
  });

  // Both ready
  for (const userId of [user1, user2]) {
    await app.inject({
      method: "POST",
      url: `/v1/rooms/${roomId}/ready`,
      headers: { "x-user-id": userId },
      payload: { isReady: true },
    });
  }

  // Start room
  const startRes = await app.inject({
    method: "POST",
    url: `/v1/rooms/${roomId}/start`,
    headers: { "x-user-id": user1 },
  });
  const sessionId = startRes.json().session.sessionId;

  return { roomId, sessionId };
}

test("M5: GET /v1/sessions/:sessionId/state returns session state", async () => {
  const { app, roomStore } = await createTestSetup();
  try {
    const { sessionId } = await createAndStartRoom(app, roomStore, "user-a", "user-b");

    const response = await app.inject({
      method: "GET",
      url: `/v1/sessions/${sessionId}/state`,
      headers: { "x-user-id": "user-a" },
    });

    assert.equal(response.statusCode, 200);
    const body = response.json();
    assert.equal(body.session.sessionId, sessionId);
    assert.equal(body.session.gameType, "rock-paper-scissors");
    assert.equal(body.session.status, "started");
    assert.equal(body.session.stateVersion, 0);
    assert.ok(body.session.state);
    assert.equal(body.session.state.gameStatus, "active");
  } finally {
    await app.close();
  }
});

test("M5: GET /v1/sessions/:sessionId/state rejects missing x-user-id", async () => {
  const { app, roomStore } = await createTestSetup();
  try {
    const { sessionId } = await createAndStartRoom(app, roomStore, "user-a", "user-b");

    const response = await app.inject({
      method: "GET",
      url: `/v1/sessions/${sessionId}/state`,
    });

    assert.equal(response.statusCode, 401);
    assert.equal(response.json().error.code, "UNAUTHORIZED");
  } finally {
    await app.close();
  }
});

test("M5: GET /v1/sessions/:sessionId/state rejects non-players", async () => {
  const { app, roomStore } = await createTestSetup();
  try {
    const { sessionId } = await createAndStartRoom(app, roomStore, "user-a", "user-b");

    const response = await app.inject({
      method: "GET",
      url: `/v1/sessions/${sessionId}/state`,
      headers: { "x-user-id": "user-c" },
    });

    assert.equal(response.statusCode, 403);
    assert.equal(response.json().error.code, "UNAUTHORIZED");
  } finally {
    await app.close();
  }
});

test("M5: GET /v1/sessions/:sessionId/state returns 404 for nonexistent session", async () => {
  const { app } = await createTestSetup();
  try {
    const response = await app.inject({
      method: "GET",
      url: "/v1/sessions/nonexistent/state",
      headers: { "x-user-id": "user-a" },
    });

    assert.equal(response.statusCode, 404);
    assert.equal(response.json().error.code, "SESSION_NOT_FOUND");
  } finally {
    await app.close();
  }
});

test("M5: GET /v1/sessions/:sessionId/state hides opponent's unrevealed choices", async () => {
  const { app, roomStore } = await createTestSetup();
  try {
    const { sessionId } = await createAndStartRoom(app, roomStore, "user-a", "user-b");

    // User A submits choice
    const actionRes = await app.inject({
      method: "POST",
      url: `/v1/sessions/${sessionId}/actions`,
      headers: { "x-user-id": "user-a" },
      payload: {
        actionType: "submit_choice",
        payload: { choice: "rock" },
      },
    });

    assert.equal(actionRes.statusCode, 200);

    // User B gets state - should not see user A's choice
    const stateRes = await app.inject({
      method: "GET",
      url: `/v1/sessions/${sessionId}/state`,
      headers: { "x-user-id": "user-b" },
    });

    assert.equal(stateRes.statusCode, 200);
    const body = stateRes.json();
    assert.equal(body.session.state.currentRound.player1.choice, null);
    assert.equal(body.session.state.currentRound.player2.choice, null);

    // User A gets state - should see their own choice
    const ownStateRes = await app.inject({
      method: "GET",
      url: `/v1/sessions/${sessionId}/state`,
      headers: { "x-user-id": "user-a" },
    });

    assert.equal(ownStateRes.statusCode, 200);
    const ownBody = ownStateRes.json();
    assert.equal(ownBody.session.state.currentRound.player1.choice, "rock");
    assert.equal(ownBody.session.state.currentRound.player2.choice, null);
  } finally {
    await app.close();
  }
});

test("M5: POST /v1/sessions/:sessionId/actions submits a choice", async () => {
  const { app, roomStore } = await createTestSetup();
  try {
    const { sessionId } = await createAndStartRoom(app, roomStore, "user-a", "user-b");

    const response = await app.inject({
      method: "POST",
      url: `/v1/sessions/${sessionId}/actions`,
      headers: { "x-user-id": "user-a" },
      payload: {
        actionType: "submit_choice",
        payload: { choice: "rock" },
      },
    });

    assert.equal(response.statusCode, 200);
    const body = response.json();
    assert.equal(body.session.stateVersion, 1);
    assert.equal(body.session.status, "started");
  } finally {
    await app.close();
  }
});

test("M5: POST /v1/sessions/:sessionId/actions rejects invalid choice", async () => {
  const { app, roomStore } = await createTestSetup();
  try {
    const { sessionId } = await createAndStartRoom(app, roomStore, "user-a", "user-b");

    const response = await app.inject({
      method: "POST",
      url: `/v1/sessions/${sessionId}/actions`,
      headers: { "x-user-id": "user-a" },
      payload: {
        actionType: "submit_choice",
        payload: { choice: "invalid" },
      },
    });

    assert.equal(response.statusCode, 400);
    assert.equal(response.json().error.code, "INVALID_PAYLOAD");
  } finally {
    await app.close();
  }
});

test("M5: POST /v1/sessions/:sessionId/actions rejects duplicate choices in same round", async () => {
  const { app, roomStore } = await createTestSetup();
  try {
    const { sessionId } = await createAndStartRoom(app, roomStore, "user-a", "user-b");

    // First submission
    const first = await app.inject({
      method: "POST",
      url: `/v1/sessions/${sessionId}/actions`,
      headers: { "x-user-id": "user-a" },
      payload: {
        actionType: "submit_choice",
        payload: { choice: "rock" },
      },
    });
    assert.equal(first.statusCode, 200);

    // Duplicate submission from same user
    const duplicate = await app.inject({
      method: "POST",
      url: `/v1/sessions/${sessionId}/actions`,
      headers: { "x-user-id": "user-a" },
      payload: {
        actionType: "submit_choice",
        payload: { choice: "paper" },
      },
    });

    assert.equal(duplicate.statusCode, 400);
    assert.equal(duplicate.json().error.code, "DUPLICATE_CHOICE");
  } finally {
    await app.close();
  }
});

test("M5: POST /v1/sessions/:sessionId/actions resolves round when both submit", async () => {
  const { app, roomStore } = await createTestSetup();
  try {
    const { sessionId } = await createAndStartRoom(app, roomStore, "user-a", "user-b");

    // User A submits rock
    await app.inject({
      method: "POST",
      url: `/v1/sessions/${sessionId}/actions`,
      headers: { "x-user-id": "user-a" },
      payload: {
        actionType: "submit_choice",
        payload: { choice: "rock" },
      },
    });

    // User B submits scissors - should lose round
    const userBResponse = await app.inject({
      method: "POST",
      url: `/v1/sessions/${sessionId}/actions`,
      headers: { "x-user-id": "user-b" },
      payload: {
        actionType: "submit_choice",
        payload: { choice: "scissors" },
      },
    });

    assert.equal(userBResponse.statusCode, 200);
    const body = userBResponse.json();
    assert.equal(body.session.stateVersion, 2);
    // After round 1 resolves, game moves to round 2, so check rounds array for resolved round
    assert.equal(body.session.state.rounds.length >= 1, true);
    assert.equal(body.session.state.rounds[0].resolvedAt !== undefined, true);
    assert.equal(body.session.state.player1Score, 1);
    assert.equal(body.session.state.player2Score, 0);
  } finally {
    await app.close();
  }
});

test("M5: POST /v1/sessions/:sessionId/actions marks session finished on game win", async () => {
  const { app, roomStore } = await createTestSetup();
  try {
    const { sessionId } = await createAndStartRoom(app, roomStore, "user-a", "user-b");

    // Play first round - user-a wins
    await app.inject({
      method: "POST",
      url: `/v1/sessions/${sessionId}/actions`,
      headers: { "x-user-id": "user-a" },
      payload: {
        actionType: "submit_choice",
        payload: { choice: "rock" },
      },
    });

    await app.inject({
      method: "POST",
      url: `/v1/sessions/${sessionId}/actions`,
      headers: { "x-user-id": "user-b" },
      payload: {
        actionType: "submit_choice",
        payload: { choice: "scissors" },
      },
    });

    // Play second round - user-a wins again (first to 2 wins)
    await app.inject({
      method: "POST",
      url: `/v1/sessions/${sessionId}/actions`,
      headers: { "x-user-id": "user-a" },
      payload: {
        actionType: "submit_choice",
        payload: { choice: "scissors" },
      },
    });

    const finalResponse = await app.inject({
      method: "POST",
      url: `/v1/sessions/${sessionId}/actions`,
      headers: { "x-user-id": "user-b" },
      payload: {
        actionType: "submit_choice",
        payload: { choice: "paper" },
      },
    });

    assert.equal(finalResponse.statusCode, 200);
    const body = finalResponse.json();
    
    // Check game state to ensure scores reached 2-0
    assert.equal(body.session.state.player1Score, 2);
    assert.equal(body.session.state.player2Score, 0);
    assert.equal(body.session.state.gameStatus, "finished");
    
    // Check session status
    assert.equal(body.session.status, "finished");
    assert.equal(body.session.endedAt !== undefined, true);
    assert.equal(body.session.state.winnerId, "user-a");
  } finally {
    await app.close();
  }
});

test("M5: POST /v1/sessions/:sessionId/actions rejects non-players", async () => {
  const { app, roomStore } = await createTestSetup();
  try {
    const { sessionId } = await createAndStartRoom(app, roomStore, "user-a", "user-b");

    const response = await app.inject({
      method: "POST",
      url: `/v1/sessions/${sessionId}/actions`,
      headers: { "x-user-id": "user-c" },
      payload: {
        actionType: "submit_choice",
        payload: { choice: "rock" },
      },
    });

    assert.equal(response.statusCode, 403);
    assert.equal(response.json().error.code, "UNAUTHORIZED");
  } finally {
    await app.close();
  }
});

test("M5: POST /v1/sessions/:sessionId/actions increments stateVersion correctly", async () => {
  const { app, roomStore } = await createTestSetup();
  try {
    const { sessionId } = await createAndStartRoom(app, roomStore, "user-a", "user-b");

    // Initial state
    const initialState = await app.inject({
      method: "GET",
      url: `/v1/sessions/${sessionId}/state`,
      headers: { "x-user-id": "user-a" },
    });
    assert.equal(initialState.json().session.stateVersion, 0);

    // First action
    const action1 = await app.inject({
      method: "POST",
      url: `/v1/sessions/${sessionId}/actions`,
      headers: { "x-user-id": "user-a" },
      payload: {
        actionType: "submit_choice",
        payload: { choice: "rock" },
      },
    });
    assert.equal(action1.json().session.stateVersion, 1);

    // Second action
    const action2 = await app.inject({
      method: "POST",
      url: `/v1/sessions/${sessionId}/actions`,
      headers: { "x-user-id": "user-b" },
      payload: {
        actionType: "submit_choice",
        payload: { choice: "paper" },
      },
    });
    assert.equal(action2.json().session.stateVersion, 2);

    // Verify state
    const finalState = await app.inject({
      method: "GET",
      url: `/v1/sessions/${sessionId}/state`,
      headers: { "x-user-id": "user-a" },
    });
    assert.equal(finalState.json().session.stateVersion, 2);
  } finally {
    await app.close();
  }
});

test("M6: POST /v1/sessions/:sessionId/actions returns RESULT_SUBMISSION_FAILED when publisher fails", async () => {
  const failingPublisher: ResultPublisher = {
    async publishMatchResult() {
      return { ok: false, error: "Network error: ECONNREFUSED" };
    },
  };

  const { app, roomStore } = await createTestSetup({ resultPublisher: failingPublisher });
  try {
    const { sessionId } = await createAndStartRoom(app, roomStore, "user-a", "user-b");

    // Round 1: user-a wins (rock beats scissors)
    await app.inject({
      method: "POST",
      url: `/v1/sessions/${sessionId}/actions`,
      headers: { "x-user-id": "user-a" },
      payload: { actionType: "submit_choice", payload: { choice: "rock" } },
    });
    await app.inject({
      method: "POST",
      url: `/v1/sessions/${sessionId}/actions`,
      headers: { "x-user-id": "user-b" },
      payload: { actionType: "submit_choice", payload: { choice: "scissors" } },
    });

    // Round 2: user-a wins again (scissors beats paper) — triggers game finish and publish
    await app.inject({
      method: "POST",
      url: `/v1/sessions/${sessionId}/actions`,
      headers: { "x-user-id": "user-a" },
      payload: { actionType: "submit_choice", payload: { choice: "scissors" } },
    });
    const finalResponse = await app.inject({
      method: "POST",
      url: `/v1/sessions/${sessionId}/actions`,
      headers: { "x-user-id": "user-b" },
      payload: { actionType: "submit_choice", payload: { choice: "paper" } },
    });

    assert.equal(finalResponse.statusCode, 502);
    assert.equal(finalResponse.json().error.code, "RESULT_SUBMISSION_FAILED");
  } finally {
    await app.close();
  }
});

test("M6: POST /v1/sessions/:sessionId/actions sets submittedAt when publisher succeeds", async () => {
  const { app, roomStore, sessionStore } = await createTestSetup();
  try {
    const { sessionId } = await createAndStartRoom(app, roomStore, "user-a", "user-b");

    // Play two winning rounds for user-a
    await app.inject({
      method: "POST",
      url: `/v1/sessions/${sessionId}/actions`,
      headers: { "x-user-id": "user-a" },
      payload: { actionType: "submit_choice", payload: { choice: "rock" } },
    });
    await app.inject({
      method: "POST",
      url: `/v1/sessions/${sessionId}/actions`,
      headers: { "x-user-id": "user-b" },
      payload: { actionType: "submit_choice", payload: { choice: "scissors" } },
    });
    await app.inject({
      method: "POST",
      url: `/v1/sessions/${sessionId}/actions`,
      headers: { "x-user-id": "user-a" },
      payload: { actionType: "submit_choice", payload: { choice: "scissors" } },
    });
    await app.inject({
      method: "POST",
      url: `/v1/sessions/${sessionId}/actions`,
      headers: { "x-user-id": "user-b" },
      payload: { actionType: "submit_choice", payload: { choice: "paper" } },
    });

    const session = await sessionStore.getSession(sessionId);
    assert.ok(session !== null);
    assert.ok(session.submittedAt !== undefined, "submittedAt should be set after successful publish");
    assert.equal(session.status, "finished");
  } finally {
    await app.close();
  }
});

