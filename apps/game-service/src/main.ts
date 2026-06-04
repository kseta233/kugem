import { loadEnvFiles, readEnv } from "./env.js";
import { createServer } from "./server.js";

async function main() {
  loadEnvFiles();
  const env = readEnv();
  const app = await createServer(env);

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
