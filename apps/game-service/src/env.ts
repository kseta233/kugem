import { config as dotenvConfig } from "dotenv";

export type AppEnv = {
  port: number;
  nodeEnv: "development" | "test" | "production";
  webOrigin: string;
  appHandshakeSecret: string;
  supabaseUrl: string;
  supabaseServiceRoleKey: string;
  supabaseResultFunctionUrl: string;
  gameServiceHmacSecret: string;
  supabaseJwtSecret?: string;
  supabaseJwksUrl?: string;
};

export function loadEnvFiles(): void {
  dotenvConfig({ path: ".env" });
  dotenvConfig({ path: ".env.local", override: true });
}

function readRequired(key: string): string {
  const value = process.env[key];
  if (!value || value.trim().length === 0) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
}

export function readEnv(): AppEnv {
  const port = Number.parseInt(process.env.PORT ?? "3001", 10);
  if (!Number.isFinite(port) || port <= 0) {
    throw new Error("Invalid PORT value");
  }

  const nodeEnvRaw = process.env.NODE_ENV ?? "development";
  if (
    nodeEnvRaw !== "development" &&
    nodeEnvRaw !== "test" &&
    nodeEnvRaw !== "production"
  ) {
    throw new Error("NODE_ENV must be development, test, or production");
  }

  const webOrigin = readRequired("WEB_ORIGIN");
  const appHandshakeSecret = readRequired("APP_HANDSHAKE_SECRET");
  const supabaseUrl = readRequired("SUPABASE_URL");
  const supabaseServiceRoleKey = readRequired("SUPABASE_SERVICE_ROLE_KEY");
  const supabaseResultFunctionUrl = readRequired("SUPABASE_RESULT_FUNCTION_URL");
  const gameServiceHmacSecret = readRequired("GAME_SERVICE_HMAC_SECRET");
  const supabaseJwtSecret = process.env.SUPABASE_JWT_SECRET;
  const supabaseJwksUrl = process.env.SUPABASE_JWKS_URL;

  if (!supabaseJwtSecret && !supabaseJwksUrl) {
    throw new Error(
      "Set either SUPABASE_JWT_SECRET or SUPABASE_JWKS_URL for auth token verification",
    );
  }

  return {
    port,
    nodeEnv: nodeEnvRaw,
    webOrigin,
    appHandshakeSecret,
    supabaseUrl,
    supabaseServiceRoleKey,
    supabaseResultFunctionUrl,
    gameServiceHmacSecret,
    supabaseJwtSecret,
    supabaseJwksUrl,
  };
}
