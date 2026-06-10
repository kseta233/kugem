import type { RuntimeSession } from "../../runtime-store/types.js";
import type { RpsGameState } from "../rps-engine/types.js";
import { buildEnvelope } from "./envelope.js";
import type { PublishResultOutcome, ResultPublisher } from "./types.js";

export type ResultPublisherConfig = {
  supabaseResultFunctionUrl: string;
  gameServiceHmacSecret: string;
};

export function createResultPublisher(config: ResultPublisherConfig): ResultPublisher {
  return {
    async publishMatchResult(
      session: RuntimeSession<RpsGameState>,
    ): Promise<PublishResultOutcome> {
      const envelope = buildEnvelope(session, config.gameServiceHmacSecret);

      let response: Response;
      try {
        response = await fetch(config.supabaseResultFunctionUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-game-service-signature": envelope.signature,
          },
          body: JSON.stringify(envelope),
        });
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        return { ok: false, error: `Network error: ${message}` };
      }

      if (!response.ok) {
        const text = await response.text().catch(() => "");
        return {
          ok: false,
          error: `HTTP ${response.status}${text ? `: ${text}` : ""}`,
        };
      }

      return { ok: true };
    },
  };
}
