import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { randomUUID } from "node:crypto";
import type { RuntimeSession } from "../../runtime-store/types.js";
import type { RuntimeSessionStore } from "../../runtime-store/session-store.js";
import type { RpsActionPayload, RpsChoice, RpsGameState } from "../rps-engine/types.js";
import { initializeGame, applyAction, getPlayerVisibleState } from "../rps-engine/engine.js";
import type { ResultPublisher } from "../result-publisher/index.js";

type ApiErrorPayload = {
  error: {
    code: string;
    message: string;
  };
};

type SubmitActionBody = {
  actionType: "submit_choice";
  payload: RpsActionPayload;
};

type SessionRouteDeps = {
  sessionStore: RuntimeSessionStore;
  resultPublisher: ResultPublisher;
  toErrorResponse: (code: string, message: string) => ApiErrorPayload;
};

function nowIso(): string {
  return new Date().toISOString();
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

function isSessionExpired(session: RuntimeSession): boolean {
  return new Date(session.expiresAt).getTime() <= Date.now();
}

function ensureGameStateInitialized(session: RuntimeSession<unknown>): RuntimeSession<RpsGameState> {
  const typedSession = session as RuntimeSession<Record<string, unknown>>;

  if (typedSession.gameType !== "rock-paper-scissors") {
    throw new Error(`Unsupported gameType: ${typedSession.gameType}`);
  }

  // Check if state is already initialized - if it has expected RPS properties, reuse it
  const state = typedSession.state as Record<string, unknown>;
  if (
    state &&
    typeof state === "object" &&
    typeof state.gameId === "string" &&
    typeof state.player1Score === "number" &&
    Array.isArray(state.rounds)
  ) {
    return typedSession as RuntimeSession<RpsGameState>;
  }

  // Initialize RPS game state
  const [player1, player2] = typedSession.players;
  if (!player1 || !player2) {
    throw new Error("Session must have exactly 2 players");
  }

  const gameState = initializeGame(
    randomUUID(),
    player1.userId,
    player2.userId,
  );

  const initializedSession: RuntimeSession<RpsGameState> = {
    ...typedSession,
    state: gameState,
  };

  return initializedSession;
}

export async function registerSessionRoutes(
  app: FastifyInstance,
  deps: SessionRouteDeps,
): Promise<void> {
  app.get<{ Params: { sessionId: string } }>(
    "/v1/sessions/:sessionId/state",
    async (request, reply) => {
      const userId = getRequestUserId(request, reply, deps.toErrorResponse);
      if (!userId) {
        return;
      }

      const session = await deps.sessionStore.getSession(request.params.sessionId);
      if (!session) {
        return reply
          .status(404)
          .send(deps.toErrorResponse("SESSION_NOT_FOUND", "Session was not found"));
      }

      if (isSessionExpired(session)) {
        await deps.sessionStore.deleteSession(session.sessionId);
        return reply
          .status(410)
          .send(deps.toErrorResponse("SESSION_EXPIRED", "Session expired"));
      }

      const isPlayer = session.players.some((player) => player.userId === userId);
      if (!isPlayer) {
        return reply
          .status(403)
          .send(deps.toErrorResponse("UNAUTHORIZED", "Only session players can access state"));
      }

      // Return player's visible state
      let visibleState: unknown = session.state;
      if (session.gameType === "rock-paper-scissors" && session.state) {
        const typedSession = ensureGameStateInitialized(session);
        const visibleGameState = getPlayerVisibleState(
          typedSession.state as RpsGameState,
          userId,
        );
        visibleState = visibleGameState;
      }

      return reply.send({
        session: {
          sessionId: session.sessionId,
          roomId: session.roomId,
          gameType: session.gameType,
          gameVersion: session.gameVersion,
          status: session.status,
          players: session.players,
          state: visibleState,
          stateVersion: session.stateVersion,
          startedAt: session.startedAt,
          updatedAt: session.updatedAt,
          endedAt: session.endedAt,
        },
      });
    },
  );

  app.post<{ Params: { sessionId: string }; Body: SubmitActionBody }>(
    "/v1/sessions/:sessionId/actions",
    {
      schema: {
        body: {
          type: "object",
          required: ["actionType", "payload"],
          additionalProperties: false,
          properties: {
            actionType: { type: "string", enum: ["submit_choice"] },
            payload: {
              type: "object",
              required: ["choice"],
              properties: {
                choice: { type: "string", enum: ["rock", "paper", "scissors"] },
              },
            },
          },
        },
      },
    },
    async (request, reply) => {
      const userId = getRequestUserId(request, reply, deps.toErrorResponse);
      if (!userId) {
        return;
      }

      const session = await deps.sessionStore.getSession(request.params.sessionId);
      if (!session) {
        return reply
          .status(404)
          .send(deps.toErrorResponse("SESSION_NOT_FOUND", "Session was not found"));
      }

      if (isSessionExpired(session)) {
        await deps.sessionStore.deleteSession(session.sessionId);
        return reply
          .status(410)
          .send(deps.toErrorResponse("SESSION_EXPIRED", "Session expired"));
      }

      const isPlayer = session.players.some((player) => player.userId === userId);
      if (!isPlayer) {
        return reply
          .status(403)
          .send(deps.toErrorResponse("UNAUTHORIZED", "Only session players can submit actions"));
      }

      if (session.status !== "started") {
        return reply
          .status(409)
          .send(
            deps.toErrorResponse(
              "INVALID_ACTION",
              `Session status is ${session.status}, cannot submit actions`,
            ),
          );
      }

      const actionType = request.body?.actionType;
      if (actionType !== "submit_choice") {
        return reply
          .status(400)
          .send(deps.toErrorResponse("INVALID_ACTION", `Unknown action type: ${actionType}`));
      }

      if (session.gameType !== "rock-paper-scissors") {
        return reply
          .status(400)
          .send(
            deps.toErrorResponse(
              "INVALID_ACTION",
              `Game type ${session.gameType} is not supported`,
            ),
          );
      }

      try {
        // Ensure game state is initialized
        let typedSession = ensureGameStateInitialized(session);

        // Apply the action
        const actionPayload = request.body?.payload as { choice: RpsChoice };
        const currentGameState = typedSession.state as RpsGameState;
        
        const actionResult = applyAction(currentGameState, {
          actionId: randomUUID(),
          userId,
          type: "submit_choice",
          payload: actionPayload,
          createdAt: nowIso(),
        });

        if (!actionResult.ok) {
          return reply
            .status(400)
            .send(
              deps.toErrorResponse(
                actionResult.error.code,
                actionResult.error.message,
              ),
            );
        }

        // Update session state
        const newGameState = actionResult.data;
        const newStateVersion = session.stateVersion + 1;
        const now = nowIso();

        typedSession.state = newGameState;
        typedSession.stateVersion = newStateVersion;
        typedSession.updatedAt = now;

        // Add to action log
        typedSession.actionLog.push({
          actionId: randomUUID(),
          seq: typedSession.actionLog.length + 1,
          userId,
          type: "submit_choice",
          payload: actionPayload,
          stateVersionBefore: session.stateVersion,
          stateVersionAfter: newStateVersion,
          createdAt: now,
        });

        // Check if game is finished
        if (newGameState.gameStatus === "finished") {
          typedSession.status = "finished";
          typedSession.endedAt = now;
        }

        // Persist updated session
        await deps.sessionStore.updateSession(typedSession);

        // Publish result to Supabase when match finishes
        if (newGameState.gameStatus === "finished") {
          const publishOutcome = await deps.resultPublisher.publishMatchResult(
            typedSession as RuntimeSession<RpsGameState>,
          );

          if (!publishOutcome.ok) {
            app.log.error({ error: publishOutcome.error, sessionId: typedSession.sessionId }, "Result publication failed");
            return reply
              .status(502)
              .send(deps.toErrorResponse("RESULT_SUBMISSION_FAILED", "Failed to submit match result"));
          }

          typedSession.submittedAt = nowIso();
          await deps.sessionStore.updateSession(typedSession);
        }

        // Return player's visible state
        const visibleGameState = getPlayerVisibleState(newGameState, userId);

        return reply.send({
          session: {
            sessionId: typedSession.sessionId,
            roomId: typedSession.roomId,
            gameType: typedSession.gameType,
            gameVersion: typedSession.gameVersion,
            status: typedSession.status,
            players: typedSession.players,
            state: visibleGameState,
            stateVersion: newStateVersion,
            startedAt: typedSession.startedAt,
            updatedAt: typedSession.updatedAt,
            endedAt: typedSession.endedAt,
          },
        });
      } catch (error) {
        app.log.error(error);
        return reply
          .status(500)
          .send(
            deps.toErrorResponse(
              "INTERNAL_SERVER_ERROR",
              error instanceof Error ? error.message : "Unexpected error",
            ),
          );
      }
    },
  );
}
