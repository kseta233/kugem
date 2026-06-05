import type { SupabaseClient } from "@supabase/supabase-js";

export interface UserIdentityProvider {
  userExists(userId: string): Promise<boolean>;
}

export class UserIdentityService implements UserIdentityProvider {
  constructor(private readonly supabase: SupabaseClient) {}

  async userExists(userId: string): Promise<boolean> {
    const { data, error } = await this.supabase.auth.admin.getUserById(userId);

    if (error) {
      return false;
    }

    return !!data.user;
  }
}
