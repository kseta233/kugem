import assert from "node:assert/strict";
import test from "node:test";
import type { FastifyInstance } from "fastify";
import type { AppEnv } from "../../env.js";
import { InMemoryRoomStore, InMemorySessionStore } from "../../runtime-store/index.js";
import type { RuntimeRoom } from "../../runtime-store/types.js";
import { createServer } from "../../server.js";
import type {
  GameCatalogRecord,
  GameRoomRuleProvider,
  GameRoomRules,
} from "./game-room-rule.service.js";
import type { UserIdentityProvider } from "./user-identity.service.js";

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
}): Promise<TestSetup> {
  const roomStore = new InMemoryRoomStore();
  const sessionStore = new InMemorySessionStore();

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
      new Set(options?.validUsers ?? ["user-a", "user-b", "user-c", "host", "guest"]),
    ),
  });

  return { app, roomStore };
}

async function createRoom(
  app: FastifyInstance,
  userId: string,
  payload?: Record<string, unknown>,
): Promise<{ roomId: string; roomCode: string; body: any }> {
  const response = await app.inject({
    method: "POST",
    url: "/v1/rooms",
    headers: { "x-user-id": userId },
    payload,
  });

  assert.equal(response.statusCode, 201);
  const body = response.json();
  return {
    roomId: body.room.roomId,
    roomCode: body.room.roomCode,
    body,
  };
}

test("M3: create room success with defaults", async () => {
  const { app } = await createTestSetup();
  try {
    const response = await app.inject({
      method: "POST",
      url: "/v1/rooms",
      headers: { "x-user-id": "user-a" },
      payload: { displayName: "A" },
    });

    assert.equal(response.statusCode, 201);
    const body = response.json();
    assert.equal(body.room.gameType, "rock-paper-scissors");
    assert.equal(body.room.maxPlayers, 2);
    assert.equal(body.room.players.length, 1);
    assert.equal(body.room.players[0].seat, 1);
    assert.equal(body.room.players[0].status, "joined");
    assert.equal(body.room.password, undefined);
  } finally {
    await app.close();
  }
});

test("M3: create room rejects missing x-user-id", async () => {
  const { app } = await createTestSetup();
  try {
    const response = await app.inject({ method: "POST", url: "/v1/rooms", payload: {} });
    assert.equal(response.statusCode, 401);
    assert.equal(response.json().error.code, "UNAUTHORIZED");
  } finally {
    await app.close();
  }
});

test("M3: create room rejects unknown Supabase user", async () => {
  const { app } = await createTestSetup({ validUsers: ["user-a"] });
  try {
    const response = await app.inject({
      method: "POST",
      url: "/v1/rooms",
      headers: { "x-user-id": "ghost-user" },
      payload: {},
    });
    assert.equal(response.statusCode, 401);
    assert.equal(response.json().error.code, "UNAUTHORIZED");
  } finally {
    await app.close();
  }
});

test("M3: create room rejects unknown gameType", async () => {
  const { app } = await createTestSetup();
  try {
    const response = await app.inject({
      method: "POST",
      url: "/v1/rooms",
      headers: { "x-user-id": "user-a" },
      payload: { gameType: "unknown-game" },
    });
    assert.equal(response.statusCode, 400);
    assert.equal(response.json().error.code, "INVALID_ACTION");
  } finally {
    await app.close();
  }
});

test("M3: create room rejects disallowed maxPlayers from game rules", async () => {
  const { app } = await createTestSetup({
    roomRules: {
      "rock-paper-scissors": { maxPlayers: [2], privateRoomEnabled: true },
    },
  });

  try {
    const response = await app.inject({
      method: "POST",
      url: "/v1/rooms",
      headers: { "x-user-id": "user-a" },
      payload: { maxPlayers: 4 },
    });
    assert.equal(response.statusCode, 400);
    assert.equal(response.json().error.code, "INVALID_ACTION");
  } finally {
    await app.close();
  }
});

test("M3: private room requires password and can be created when enabled", async () => {
  const { app } = await createTestSetup();

  try {
    const bad = await app.inject({
      method: "POST",
      url: "/v1/rooms",
      headers: { "x-user-id": "user-a" },
      payload: { isPrivate: true },
    });
    assert.equal(bad.statusCode, 400);
    assert.equal(bad.json().error.code, "INVALID_ACTION");

    const ok = await app.inject({
      method: "POST",
      url: "/v1/rooms",
      headers: { "x-user-id": "user-a" },
      payload: { isPrivate: true, password: "1234" },
    });
    assert.equal(ok.statusCode, 201);
    const body = ok.json();
    assert.equal(body.room.isPrivate, true);
    assert.equal(body.room.password, undefined);
  } finally {
    await app.close();
  }
});

test("M3: private room create fails if game does not allow private rooms", async () => {
  const { app } = await createTestSetup({
    roomRules: {
      "rock-paper-scissors": { maxPlayers: [2], privateRoomEnabled: false },
    },
  });

  try {
    const response = await app.inject({
      method: "POST",
      url: "/v1/rooms",
      headers: { "x-user-id": "user-a" },
      payload: { isPrivate: true, password: "pw" },
    });
    assert.equal(response.statusCode, 400);
    assert.equal(response.json().error.code, "INVALID_ACTION");
  } finally {
    await app.close();
  }
});

test("M3: join private room succeeds with correct password and fails with wrong password", async () => {
  const { app } = await createTestSetup();

  try {
    const created = await createRoom(app, "user-a", { isPrivate: true, password: "pw" });

    const wrong = await app.inject({
      method: "POST",
      url: `/v1/rooms/${created.roomCode}/join`,
      headers: { "x-user-id": "user-b" },
      payload: { password: "wrong" },
    });
    assert.equal(wrong.statusCode, 403);
    assert.equal(wrong.json().error.code, "INVALID_ACTION");

    const ok = await app.inject({
      method: "POST",
      url: `/v1/rooms/${created.roomCode}/join`,
      headers: { "x-user-id": "user-b" },
      payload: { password: "pw" },
    });
    assert.equal(ok.statusCode, 200);
    assert.equal(ok.json().room.players.length, 2);
  } finally {
    await app.close();
  }
});

test("M3: join rejects duplicate player and full room", async () => {
  const { app } = await createTestSetup();

  try {
    const created = await createRoom(app, "user-a");

    const firstJoin = await app.inject({
      method: "POST",
      url: `/v1/rooms/${created.roomCode}/join`,
      headers: { "x-user-id": "user-b" },
      payload: {},
    });
    assert.equal(firstJoin.statusCode, 200);

    const duplicate = await app.inject({
      method: "POST",
      url: `/v1/rooms/${created.roomCode}/join`,
      headers: { "x-user-id": "user-b" },
      payload: {},
    });
    assert.equal(duplicate.statusCode, 409);
    assert.equal(duplicate.json().error.code, "INVALID_ACTION");

    const full = await app.inject({
      method: "POST",
      url: `/v1/rooms/${created.roomCode}/join`,
      headers: { "x-user-id": "user-c" },
      payload: {},
    });
    assert.equal(full.statusCode, 409);
    assert.equal(full.json().error.code, "ROOM_FULL");
  } finally {
    await app.close();
  }
});

test("M3: join unknown room code returns ROOM_NOT_FOUND", async () => {
  const { app } = await createTestSetup();

  try {
    const response = await app.inject({
      method: "POST",
      url: "/v1/rooms/999999/join",
      headers: { "x-user-id": "user-b" },
      payload: {},
    });
    assert.equal(response.statusCode, 404);
    assert.equal(response.json().error.code, "ROOM_NOT_FOUND");
  } finally {
    await app.close();
  }
});

test("M3: get room hides password and returns room", async () => {
  const { app } = await createTestSetup();

  try {
    const created = await createRoom(app, "user-a", { isPrivate: true, password: "pw" });
    const response = await app.inject({ method: "GET", url: `/v1/rooms/${created.roomId}` });
    assert.equal(response.statusCode, 200);
    const body = response.json();
    assert.equal(body.room.isPrivate, true);
    assert.equal(body.room.password, undefined);
  } finally {
    await app.close();
  }
});

test("M3: ready endpoint allows members only", async () => {
  const { app } = await createTestSetup();

  try {
    const created = await createRoom(app, "host");
    await app.inject({
      method: "POST",
      url: `/v1/rooms/${created.roomCode}/join`,
      headers: { "x-user-id": "guest" },
      payload: {},
    });

    const nonMember = await app.inject({
      method: "POST",
      url: `/v1/rooms/${created.roomId}/ready`,
      headers: { "x-user-id": "user-c" },
      payload: { isReady: true },
    });
    assert.equal(nonMember.statusCode, 403);
    assert.equal(nonMember.json().error.code, "INVALID_ACTION");

    const hostReady = await app.inject({
      method: "POST",
      url: `/v1/rooms/${created.roomId}/ready`,
      headers: { "x-user-id": "host" },
      payload: { isReady: true },
    });
    assert.equal(hostReady.statusCode, 200);
  } finally {
    await app.close();
  }
});

test("M3: start rejects non-host, not-full, and not-ready states", async () => {
  const { app } = await createTestSetup();

  try {
    const created = await createRoom(app, "host");

    const notFull = await app.inject({
      method: "POST",
      url: `/v1/rooms/${created.roomId}/start`,
      headers: { "x-user-id": "host" },
    });
    assert.equal(notFull.statusCode, 409);

    await app.inject({
      method: "POST",
      url: `/v1/rooms/${created.roomCode}/join`,
      headers: { "x-user-id": "guest" },
      payload: {},
    });

    const nonHost = await app.inject({
      method: "POST",
      url: `/v1/rooms/${created.roomId}/start`,
      headers: { "x-user-id": "guest" },
    });
    assert.equal(nonHost.statusCode, 403);
    assert.equal(nonHost.json().error.code, "NOT_HOST");

    const notReady = await app.inject({
      method: "POST",
      url: `/v1/rooms/${created.roomId}/start`,
      headers: { "x-user-id": "host" },
    });
    assert.equal(notReady.statusCode, 409);
    assert.equal(notReady.json().error.code, "INVALID_ACTION");
  } finally {
    await app.close();
  }
});

test("M3: start success creates session and prevents further join", async () => {
  const { app } = await createTestSetup();

  try {
    const created = await createRoom(app, "host");

    await app.inject({
      method: "POST",
      url: `/v1/rooms/${created.roomCode}/join`,
      headers: { "x-user-id": "guest" },
      payload: {},
    });

    await app.inject({
      method: "POST",
      url: `/v1/rooms/${created.roomId}/ready`,
      headers: { "x-user-id": "host" },
      payload: { isReady: true },
    });

    await app.inject({
      method: "POST",
      url: `/v1/rooms/${created.roomId}/ready`,
      headers: { "x-user-id": "guest" },
      payload: { isReady: true },
    });

    const start = await app.inject({
      method: "POST",
      url: `/v1/rooms/${created.roomId}/start`,
      headers: { "x-user-id": "host" },
    });

    assert.equal(start.statusCode, 200);
    const body = start.json();
    assert.equal(body.room.status, "started");
    assert.equal(typeof body.room.sessionId, "string");
    assert.equal(body.session.status, "started");
    assert.equal(body.session.stateVersion, 0);
    assert.deepEqual(body.session.actionLog, []);

    const joinAfterStart = await app.inject({
      method: "POST",
      url: `/v1/rooms/${created.roomCode}/join`,
      headers: { "x-user-id": "user-c" },
      payload: {},
    });
    assert.equal(joinAfterStart.statusCode, 409);
    assert.equal(joinAfterStart.json().error.code, "INVALID_ACTION");
  } finally {
    await app.close();
  }
});

test("M3: expired room returns ROOM_EXPIRED then ROOM_NOT_FOUND", async () => {
  const { app, roomStore } = await createTestSetup();

  try {
    const now = new Date();
    const createdAt = new Date(now.getTime() - 20 * 60 * 1000).toISOString();
    const expiredAt = new Date(now.getTime() - 5 * 60 * 1000).toISOString();

    const room: RuntimeRoom = {
      roomId: "expired-room-id",
      roomCode: "121212",
      gameType: "rock-paper-scissors",
      gameVersion: "1",
      isPrivate: false,
      status: "waiting",
      hostUserId: "host",
      maxPlayers: 2,
      players: [
        {
          userId: "host",
          seat: 1,
          status: "joined",
          joinedAt: createdAt,
        },
      ],
      createdAt,
      updatedAt: createdAt,
      expiresAt: expiredAt,
    };

    await roomStore.createRoom(room);

    const firstGet = await app.inject({ method: "GET", url: "/v1/rooms/expired-room-id" });
    assert.equal(firstGet.statusCode, 410);
    assert.equal(firstGet.json().error.code, "ROOM_EXPIRED");

    const secondGet = await app.inject({ method: "GET", url: "/v1/rooms/expired-room-id" });
    assert.equal(secondGet.statusCode, 404);
    assert.equal(secondGet.json().error.code, "ROOM_NOT_FOUND");
  } finally {
    await app.close();
  }
});

test("M3: expired room join returns ROOM_EXPIRED", async () => {
  const { app, roomStore } = await createTestSetup();

  try {
    const now = new Date();
    const createdAt = new Date(now.getTime() - 20 * 60 * 1000).toISOString();
    const expiredAt = new Date(now.getTime() - 5 * 60 * 1000).toISOString();

    const room: RuntimeRoom = {
      roomId: "expired-room-join-id",
      roomCode: "343434",
      gameType: "rock-paper-scissors",
      gameVersion: "1",
      isPrivate: false,
      status: "waiting",
      hostUserId: "host",
      maxPlayers: 2,
      players: [
        {
          userId: "host",
          seat: 1,
          status: "joined",
          joinedAt: createdAt,
        },
      ],
      createdAt,
      updatedAt: createdAt,
      expiresAt: expiredAt,
    };

    await roomStore.createRoom(room);

    const join = await app.inject({
      method: "POST",
      url: "/v1/rooms/343434/join",
      headers: { "x-user-id": "guest" },
      payload: {},
    });

    assert.equal(join.statusCode, 410);
    assert.equal(join.json().error.code, "ROOM_EXPIRED");
  } finally {
    await app.close();
  }
});
