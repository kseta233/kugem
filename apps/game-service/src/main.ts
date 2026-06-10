import { loadEnvFiles, readEnv } from "./env.js";
import { createSupabaseAdminClient } from "./lib/supabase-admin.js";
import { GameRoomRuleService } from "./modules/rooms/game-room-rule.service.js";
import { UserIdentityService } from "./modules/rooms/user-identity.service.js";
import { createResultPublisher } from "./modules/result-publisher/index.js";
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
  const supabaseAdmin = createSupabaseAdminClient(env);
  const gameRoomRuleService = new GameRoomRuleService(supabaseAdmin);
  const userIdentityService = new UserIdentityService(supabaseAdmin);
  const resultPublisher = createResultPublisher({
    supabaseResultFunctionUrl: env.supabaseResultFunctionUrl,
    gameServiceHmacSecret: env.gameServiceHmacSecret,
  });

  const app = await createServer(env, {
    roomStore,
    sessionStore,
    gameRoomRuleService,
    userIdentityService,
    resultPublisher,
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
