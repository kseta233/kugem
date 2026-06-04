import type { FastifyBaseLogger } from "fastify";
import { CLEANUP_INTERVAL_MS } from "./constants.js";
import type { RuntimeRoomStore } from "./room-store.js";
import type { RuntimeSessionStore } from "./session-store.js";

export type CleanupSchedulerDeps = {
  roomStore: RuntimeRoomStore;
  sessionStore: RuntimeSessionStore;
  logger: FastifyBaseLogger;
};

export function startRuntimeCleanupScheduler(deps: CleanupSchedulerDeps): NodeJS.Timeout {
  const runCleanup = async (): Promise<void> => {
    const now = new Date();

    const [roomsRemoved, sessionsRemoved] = await Promise.all([
      deps.roomStore.expireRooms(now),
      deps.sessionStore.expireSessions(now),
    ]);

    if (roomsRemoved > 0 || sessionsRemoved > 0) {
      deps.logger.info(
        {
          roomsRemoved,
          sessionsRemoved,
          cleanupIntervalMs: CLEANUP_INTERVAL_MS,
        },
        "runtime cleanup removed expired entities",
      );
    }
  };

  const timer = setInterval(() => {
    void runCleanup();
  }, CLEANUP_INTERVAL_MS);

  timer.unref();
  return timer;
}
