import type { RpsRound } from "../rps-engine/types.js";

export type EnvelopePlayer = {
  userId: string;
  displayName?: string;
  seat: number;
};

export type MatchOutcome = {
  winnerId: string | null;
  player1UserId: string;
  player2UserId: string;
  player1Score: number;
  player2Score: number;
  rounds: RpsRound[];
};

/**
 * Signed envelope sent from game-service to Supabase when a match finishes.
 * The resultHash is SHA-256 of the envelope body (without resultHash/signature).
 * The signature is HMAC-SHA256(secret, envelope body JSON) for integrity verification.
 */
export type SubmitSessionEnvelope = {
  envelopeId: string;
  sessionId: string;
  roomId: string;
  gameType: string;
  gameVersion: string;
  players: EnvelopePlayer[];
  outcome: MatchOutcome;
  startedAt: string;
  endedAt: string;
  envelopeCreatedAt: string;
  resultHash: string;
  signature: string;
};

export type PublishResultOutcome =
  | { ok: true }
  | { ok: false; error: string };

export type ResultPublisher = {
  publishMatchResult(session: import("../../runtime-store/types.js").RuntimeSession<import("../rps-engine/types.js").RpsGameState>): Promise<PublishResultOutcome>;
};
