import cors from "@fastify/cors";
import Fastify, { type FastifyInstance } from "fastify";
import type { AppEnv } from "./env.js";

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

export async function createServer(env: AppEnv): Promise<FastifyInstance> {
  const app = Fastify({
    logger: {
      level: env.nodeEnv === "production" ? "info" : "debug",
    },
  });

  await app.register(cors, {
    origin: env.webOrigin,
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

  app.get("/v1/rooms/:roomId", async (_request, reply) => {
    return reply
      .status(501)
      .send(toErrorResponse("NOT_IMPLEMENTED", "Room API scaffolded but not implemented yet."));
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
