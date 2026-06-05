import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { AppEnv } from "../env.js";

export function createSupabaseAdminClient(env: AppEnv): SupabaseClient {
  return createClient(env.supabaseUrl, env.supabaseServiceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
      detectSessionInUrl: false,
    },
  });
}
