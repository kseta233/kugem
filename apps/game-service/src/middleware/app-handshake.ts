import type { FastifyReply, FastifyRequest } from "fastify";

type ErrorFactory = (code: string, message: string) => {
  error: {
    code: string;
    message: string;
  };
};

export function validateAppHandshake(
  request: FastifyRequest,
  reply: FastifyReply,
  appHandshakeSecret: string,
  toErrorResponse: ErrorFactory,
): void {
  if (!request.url.startsWith("/v1/")) {
    return;
  }

  const provided = request.headers["x-app-secret"];
  if (typeof provided !== "string" || provided !== appHandshakeSecret) {
    void reply
      .status(401)
      .send(toErrorResponse("INVALID_APP_SECRET", "Missing or invalid app handshake secret"));
  }
}
