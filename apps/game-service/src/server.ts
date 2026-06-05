import cors from "@fastify/cors";
import Fastify, { type FastifyInstance } from "fastify";
import type { AppEnv } from "./env.js";
import { validateAppHandshake } from "./middleware/app-handshake.js";
import type { GameRoomRuleProvider } from "./modules/rooms/game-room-rule.service.js";
import { registerRoomRoutes } from "./modules/rooms/routes.js";
import type { UserIdentityProvider } from "./modules/rooms/user-identity.service.js";
import type { RuntimeRoomStore } from "./runtime-store/room-store.js";
import type { RuntimeSessionStore } from "./runtime-store/session-store.js";

type ApiErrorResponse = {
  error: {
    code: string;
    message: string;
  };
};

function toErrorResponse(code: string, message: string): ApiErrorResponse {
  return {
    error: {
      code,
      message,
    },
  };
}

type ServerDeps = {
  roomStore: RuntimeRoomStore;
  sessionStore: RuntimeSessionStore;
  gameRoomRuleService: GameRoomRuleProvider;
  userIdentityService: UserIdentityProvider;
};

export async function createServer(env: AppEnv, deps: ServerDeps): Promise<FastifyInstance> {
  const app = Fastify({
    logger: {
      level: env.nodeEnv === "production" ? "info" : "debug",
    },
  });

  await app.register(cors, {
    origin: env.webOrigin,
  });

  app.addHook("onRequest", async (request, reply) => {
    if (env.nodeEnv === "test") {
      return;
    }

    validateAppHandshake(request, reply, env.appHandshakeSecret, toErrorResponse);
    if (reply.sent) {
      return reply;
    }
  });

  app.setNotFoundHandler((_request, reply) => {
    return reply.status(404).send(toErrorResponse("NOT_FOUND", "Route not found"));
  });

  app.setErrorHandler((error, _request, reply) => {
    app.log.error(error);

    if (reply.sent) {
      return;
    }

    return reply
      .status(500)
      .send(toErrorResponse("INTERNAL_SERVER_ERROR", "Unexpected server error"));
  });

  app.get("/health", async () => {
    return {
      status: "ok",
      service: "game-service",
      uptimeSeconds: Math.floor(process.uptime()),
      timestamp: new Date().toISOString(),
    };
  });

  await registerRoomRoutes(app, {
    roomStore: deps.roomStore,
    sessionStore: deps.sessionStore,
    gameRoomRuleService: deps.gameRoomRuleService,
    userIdentityService: deps.userIdentityService,
    toErrorResponse,
  });

  app.get("/v1/sessions/:sessionId/state", async (_request, reply) => {
    return reply
      .status(501)
      .send(
        toErrorResponse("NOT_IMPLEMENTED", "Session API scaffolded but not implemented yet."),
      );
  });

  return app;
}
