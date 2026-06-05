import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { randomUUID } from "node:crypto";
import { ACTIVE_SESSION_TTL_MS, WAITING_ROOM_TTL_MS } from "../../runtime-store/constants.js";
import type { RuntimeRoomStore } from "../../runtime-store/room-store.js";
import type { RuntimeSessionStore } from "../../runtime-store/session-store.js";
import type { RuntimeRoom, RuntimeRoomPlayer, RuntimeSession } from "../../runtime-store/types.js";
import type { GameRoomRuleProvider } from "./game-room-rule.service.js";
import type { UserIdentityProvider } from "./user-identity.service.js";

type ApiErrorPayload = {
  error: {
    code: string;
    message: string;
  };
};

type CreateRoomBody = {
  gameType?: string;
  maxPlayers?: number;
  displayName?: string;
  isPrivate?: boolean;
  password?: string;
};

type JoinRoomBody = {
  displayName?: string;
  password?: string;
};

type ReadyBody = {
  isReady?: boolean;
};

type RoomRouteDeps = {
  roomStore: RuntimeRoomStore;
  sessionStore: RuntimeSessionStore;
  gameRoomRuleService: GameRoomRuleProvider;
  userIdentityService: UserIdentityProvider;
  toErrorResponse: (code: string, message: string) => ApiErrorPayload;
};

function nowIso(): string {
  return new Date().toISOString();
}

function addMs(dateIso: string, ms: number): string {
  return new Date(new Date(dateIso).getTime() + ms).toISOString();
}

function makeRoomCode(): string {
  const value = Math.floor(Math.random() * 1_000_000);
  return value.toString().padStart(6, "0");
}

function getRequestUserId(
  request: FastifyRequest,
  reply: FastifyReply,
  toErrorResponse: (code: string, message: string) => ApiErrorPayload,
): string | null {
  const userId = request.headers["x-user-id"];

  if (typeof userId !== "string" || userId.trim().length === 0) {
    void reply
      .status(401)
      .send(toErrorResponse("UNAUTHORIZED", "Missing x-user-id header"));
    return null;
  }

  return userId;
}

function isRoomExpired(room: RuntimeRoom): boolean {
  return new Date(room.expiresAt).getTime() <= Date.now();
}

function sanitizeRoom(room: RuntimeRoom): RuntimeRoom {
  const cloned = structuredClone(room);
  delete cloned.password;
  return cloned;
}

async function getAuthorizedUserId(
  request: FastifyRequest,
  reply: FastifyReply,
  deps: RoomRouteDeps,
): Promise<string | null> {
  const userId = getRequestUserId(request, reply, deps.toErrorResponse);
  if (!userId) {
    return null;
  }

  const exists = await deps.userIdentityService.userExists(userId);
  if (!exists) {
    void reply.status(401).send(deps.toErrorResponse("UNAUTHORIZED", "User not found in Supabase"));
    return null;
  }

  return userId;
}

export async function registerRoomRoutes(app: FastifyInstance, deps: RoomRouteDeps): Promise<void> {
  app.post<{ Body: CreateRoomBody }>("/v1/rooms", async (request, reply) => {
    const userId = await getAuthorizedUserId(request, reply, deps);
    if (!userId) {
      return;
    }

    const gameType = request.body?.gameType ?? "rock-paper-scissors";
    const game = await deps.gameRoomRuleService.getActiveGameByType(gameType);
    if (!game) {
      return reply
        .status(400)
        .send(deps.toErrorResponse("INVALID_ACTION", `Unknown or inactive gameType: ${gameType}`));
    }

    const roomRules = deps.gameRoomRuleService.extractRoomRules(game.config);
    const maxPlayers = request.body?.maxPlayers ?? roomRules.maxPlayers[0] ?? 2;
    if (!roomRules.maxPlayers.includes(maxPlayers)) {
      return reply.status(400).send(
        deps.toErrorResponse(
          "INVALID_ACTION",
          `maxPlayers=${maxPlayers} is not allowed for gameType=${gameType}`,
        ),
      );
    }

    const isPrivate = request.body?.isPrivate === true;
    if (isPrivate && roomRules.privateRoomEnabled !== true) {
      return reply
        .status(400)
        .send(deps.toErrorResponse("INVALID_ACTION", "Private room is not enabled for this game"));
    }

    if (isPrivate && (!request.body?.password || request.body.password.length === 0)) {
      return reply
        .status(400)
        .send(deps.toErrorResponse("INVALID_ACTION", "Password is required for private room"));
    }

    const createdAt = nowIso();
    const roomId = randomUUID();
    const roomCode = makeRoomCode();
    const player: RuntimeRoomPlayer = {
      userId,
      displayName: request.body?.displayName,
      seat: 1,
      status: "joined",
      joinedAt: createdAt,
    };

    const room: RuntimeRoom = {
      roomId,
      roomCode,
      gameType,
      gameVersion: String(game.version),
      isPrivate,
      password: isPrivate ? request.body?.password : undefined,
      status: "waiting",
      hostUserId: userId,
      maxPlayers,
      players: [player],
      createdAt,
      updatedAt: createdAt,
      expiresAt: addMs(createdAt, WAITING_ROOM_TTL_MS),
    };

    await deps.roomStore.createRoom(room);
    return reply.status(201).send({ room: sanitizeRoom(room) });
  });

  app.post<{ Params: { roomCode: string }; Body: JoinRoomBody }>(
    "/v1/rooms/:roomCode/join",
    async (request, reply) => {
      const userId = await getAuthorizedUserId(request, reply, deps);
      if (!userId) {
        return;
      }

      const room = await deps.roomStore.getRoomByCode(request.params.roomCode);
      if (!room) {
        return reply
          .status(404)
          .send(deps.toErrorResponse("ROOM_NOT_FOUND", "Room was not found"));
      }

      if (isRoomExpired(room)) {
        await deps.roomStore.deleteRoom(room.roomId);
        return reply
          .status(410)
          .send(deps.toErrorResponse("ROOM_EXPIRED", "Room expired. Please create a new room."));
      }

      if (room.status === "started") {
        return reply
          .status(409)
          .send(deps.toErrorResponse("INVALID_ACTION", "Room already started"));
      }

      if (room.isPrivate && room.password !== request.body?.password) {
        return reply
          .status(403)
          .send(deps.toErrorResponse("INVALID_ACTION", "Room password does not match"));
      }

      const existing = room.players.find((player) => player.userId === userId);
      if (existing) {
        return reply
          .status(409)
          .send(deps.toErrorResponse("INVALID_ACTION", "Player already joined this room"));
      }

      if (room.players.length >= room.maxPlayers) {
        return reply.status(409).send(deps.toErrorResponse("ROOM_FULL", "Room is full"));
      }

      const joinedAt = nowIso();
      room.players.push({
        userId,
        displayName: request.body?.displayName,
        seat: room.players.length + 1,
        status: "joined",
        joinedAt,
      });
      room.updatedAt = joinedAt;

      await deps.roomStore.updateRoom(room);
      return reply.send({ room: sanitizeRoom(room) });
    },
  );

  app.get<{ Params: { roomId: string } }>("/v1/rooms/:roomId", async (request, reply) => {
    const room = await deps.roomStore.getRoom(request.params.roomId);
    if (!room) {
      return reply.status(404).send(deps.toErrorResponse("ROOM_NOT_FOUND", "Room was not found"));
    }

    if (isRoomExpired(room)) {
      await deps.roomStore.deleteRoom(room.roomId);
      return reply
        .status(410)
        .send(deps.toErrorResponse("ROOM_EXPIRED", "Room expired. Please create a new room."));
    }

    return reply.send({ room: sanitizeRoom(room) });
  });

  app.post<{ Params: { roomId: string }; Body: ReadyBody }>(
    "/v1/rooms/:roomId/ready",
    async (request, reply) => {
      const userId = await getAuthorizedUserId(request, reply, deps);
      if (!userId) {
        return;
      }

      const room = await deps.roomStore.getRoom(request.params.roomId);
      if (!room) {
        return reply
          .status(404)
          .send(deps.toErrorResponse("ROOM_NOT_FOUND", "Room was not found"));
      }

      if (isRoomExpired(room)) {
        await deps.roomStore.deleteRoom(room.roomId);
        return reply
          .status(410)
          .send(deps.toErrorResponse("ROOM_EXPIRED", "Room expired. Please create a new room."));
      }

      const member = room.players.find((player) => player.userId === userId);
      if (!member) {
        return reply
          .status(403)
          .send(deps.toErrorResponse("INVALID_ACTION", "Only room members can set ready status"));
      }

      const isReady = request.body?.isReady ?? true;
      member.status = isReady ? "ready" : "joined";
      room.status = room.players.every((player) => player.status === "ready")
        ? "ready"
        : "waiting";
      room.updatedAt = nowIso();

      await deps.roomStore.updateRoom(room);
      return reply.send({ room: sanitizeRoom(room) });
    },
  );

  app.post<{ Params: { roomId: string } }>("/v1/rooms/:roomId/start", async (request, reply) => {
    const userId = await getAuthorizedUserId(request, reply, deps);
    if (!userId) {
      return;
    }

    const room = await deps.roomStore.getRoom(request.params.roomId);
    if (!room) {
      return reply.status(404).send(deps.toErrorResponse("ROOM_NOT_FOUND", "Room was not found"));
    }

    if (isRoomExpired(room)) {
      await deps.roomStore.deleteRoom(room.roomId);
      return reply
        .status(410)
        .send(deps.toErrorResponse("ROOM_EXPIRED", "Room expired. Please create a new room."));
    }

    if (!room.players.find((player) => player.userId === userId)) {
      return reply
        .status(403)
        .send(deps.toErrorResponse("INVALID_ACTION", "Only room members can start room"));
    }

    if (room.hostUserId !== userId) {
      return reply.status(403).send(deps.toErrorResponse("NOT_HOST", "Only host can start room"));
    }

    if (room.players.length !== room.maxPlayers) {
      return reply
        .status(409)
        .send(deps.toErrorResponse("INVALID_ACTION", "Room is not full yet"));
    }

    if (!room.players.every((player) => player.status === "ready")) {
      return reply
        .status(409)
        .send(deps.toErrorResponse("INVALID_ACTION", "All players must be ready"));
    }

    const startedAt = nowIso();
    const session: RuntimeSession<Record<string, never>> = {
      sessionId: randomUUID(),
      roomId: room.roomId,
      gameType: room.gameType,
      gameVersion: room.gameVersion,
      status: "started",
      players: structuredClone(room.players),
      state: {},
      stateVersion: 0,
      actionLog: [],
      startedAt,
      updatedAt: startedAt,
      expiresAt: addMs(startedAt, ACTIVE_SESSION_TTL_MS),
    };

    room.status = "started";
    room.sessionId = session.sessionId;
    room.updatedAt = startedAt;

    await deps.sessionStore.createSession(session);
    await deps.roomStore.updateRoom(room);

    return reply.send({
      room: sanitizeRoom(room),
      session: structuredClone(session),
    });
  });
}
