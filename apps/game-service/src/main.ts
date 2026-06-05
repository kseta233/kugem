import { loadEnvFiles, readEnv } from "./env.js";
import {
  InMemoryRoomStore,
  InMemorySessionStore,
  startRuntimeCleanupScheduler,
} from "./runtime-store/index.js";
import { createServer } from "./server.js";

async function main() {
  loadEnvFiles();
  const env = readEnv();
  const roomStore = new InMemoryRoomStore();
  const sessionStore = new InMemorySessionStore();
  const app = await createServer(env, {
    roomStore,
    sessionStore,
  });

  const cleanupTimer = startRuntimeCleanupScheduler({
    roomStore,
    sessionStore,
    logger: app.log,
  });

  app.addHook("onClose", async () => {
    clearInterval(cleanupTimer);
  });

  try {
    await app.listen({
      host: "0.0.0.0",
      port: env.port,
    });
  } catch (error) {
    app.log.error(error);
    process.exitCode = 1;
  }
}

void main();
