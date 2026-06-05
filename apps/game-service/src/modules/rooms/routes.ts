import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { randomUUID } from "node:crypto";
import { ACTIVE_SESSION_TTL_MS, WAITING_ROOM_TTL_MS } from "../../runtime-store/constants.js";
import type { RuntimeRoomStore } from "../../runtime-store/room-store.js";
import type { RuntimeSessionStore } from "../../runtime-store/session-store.js";
import type { RuntimeRoom, RuntimeRoomPlayer, RuntimeSession } from "../../runtime-store/types.js";

type ApiErrorPayload = {
  error: {
    code: string;
    message: string;
  };
};

type CreateRoomBody = {
  gameType?: string;
  gameVersion?: string;
  maxPlayers?: number;
  displayName?: string;
};

type JoinRoomBody = {
  displayName?: string;
};

type ReadyBody = {
  isReady?: boolean;
};

type RoomRouteDeps = {
  roomStore: RuntimeRoomStore;
  sessionStore: RuntimeSessionStore;
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
  return structuredClone(room);
}

export async function registerRoomRoutes(app: FastifyInstance, deps: RoomRouteDeps): Promise<void> {
  app.post<{ Body: CreateRoomBody }>("/v1/rooms", async (request, reply) => {
    const userId = getRequestUserId(request, reply, deps.toErrorResponse);
    if (!userId) {
      return;
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
      gameType: request.body?.gameType ?? "rock-paper-scissors",
      gameVersion: request.body?.gameVersion ?? "1.0",
      status: "waiting",
      hostUserId: userId,
      maxPlayers: request.body?.maxPlayers ?? 2,
      players: [player],
      createdAt,
      updatedAt: createdAt,
      expiresAt: addMs(createdAt, WAITING_ROOM_TTL_MS),
    };

    if (room.maxPlayers !== 2) {
      return reply
        .status(400)
        .send(deps.toErrorResponse("INVALID_ACTION", "Only maxPlayers=2 is supported in MVP"));
    }

    await deps.roomStore.createRoom(room);
    return reply.status(201).send({ room: sanitizeRoom(room) });
  });

  app.post<{ Params: { roomCode: string }; Body: JoinRoomBody }>(
    "/v1/rooms/:roomCode/join",
    async (request, reply) => {
      const userId = getRequestUserId(request, reply, deps.toErrorResponse);
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
      const userId = getRequestUserId(request, reply, deps.toErrorResponse);
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
    const userId = getRequestUserId(request, reply, deps.toErrorResponse);
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
