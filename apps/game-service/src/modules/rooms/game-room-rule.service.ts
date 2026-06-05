import type { SupabaseClient } from "@supabase/supabase-js";

export type GameRoomRules = {
  maxPlayers: number[];
  privateRoomEnabled: boolean;
};

export type GameCatalogRecord = {
  slug: string;
  version: number;
  config: Record<string, unknown>;
};

export interface GameRoomRuleProvider {
  getActiveGameByType(gameType: string): Promise<GameCatalogRecord | null>;
  extractRoomRules(config: Record<string, unknown>): GameRoomRules;
}

export class GameRoomRuleService implements GameRoomRuleProvider {
  constructor(private readonly supabase: SupabaseClient) {}

  async getActiveGameByType(gameType: string): Promise<GameCatalogRecord | null> {
    const { data, error } = await this.supabase
      .from("games")
      .select("slug, version, config")
      .eq("slug", gameType)
      .eq("status", "active")
      .maybeSingle();

    if (error || !data) {
      return null;
    }

    return {
      slug: data.slug,
      version: data.version,
      config: (data.config ?? {}) as Record<string, unknown>,
    };
  }

  extractRoomRules(config: Record<string, unknown>): GameRoomRules {
    const roomRulesRaw = config.roomRules;
    if (!roomRulesRaw || typeof roomRulesRaw !== "object") {
      return {
        maxPlayers: [2],
        privateRoomEnabled: false,
      };
    }

    const roomRules = roomRulesRaw as Record<string, unknown>;
    const maxPlayersRaw = roomRules.maxPlayers;
    const maxPlayers = Array.isArray(maxPlayersRaw)
      ? maxPlayersRaw.filter((value): value is number => Number.isInteger(value) && value > 1)
      : [2];

    return {
      maxPlayers: maxPlayers.length > 0 ? maxPlayers : [2],
      privateRoomEnabled: roomRules.privateRoomEnabled === true,
    };
  }
}
