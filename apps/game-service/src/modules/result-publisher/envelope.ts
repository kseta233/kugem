import { createHash, createHmac, randomUUID } from "node:crypto";
import type { RuntimeSession } from "../../runtime-store/types.js";
import type { RpsGameState } from "../rps-engine/types.js";
import type { SubmitSessionEnvelope } from "./types.js";

type EnvelopeBody = Omit<SubmitSessionEnvelope, "resultHash" | "signature">;

function buildBody(session: RuntimeSession<RpsGameState>): EnvelopeBody {
  const gameState = session.state;

  return {
    envelopeId: randomUUID(),
    sessionId: session.sessionId,
    roomId: session.roomId,
    gameType: session.gameType,
    gameVersion: session.gameVersion,
    players: session.players.map((p) => ({
      userId: p.userId,
      ...(p.displayName !== undefined ? { displayName: p.displayName } : {}),
      seat: p.seat,
    })),
    outcome: {
      winnerId: gameState.winnerId ?? null,
      player1UserId: gameState.player1UserId,
      player2UserId: gameState.player2UserId,
      player1Score: gameState.player1Score,
      player2Score: gameState.player2Score,
      rounds: gameState.rounds,
    },
    startedAt: session.startedAt,
    endedAt: session.endedAt ?? new Date().toISOString(),
    envelopeCreatedAt: new Date().toISOString(),
  };
}

/**
 * Build a signed envelope for a finished match session.
 *
 * - resultHash: SHA-256 of the envelope body JSON (without resultHash/signature)
 * - signature: HMAC-SHA256(secret, envelope body JSON)
 */
export function buildEnvelope(
  session: RuntimeSession<RpsGameState>,
  secret: string,
): SubmitSessionEnvelope {
  const body = buildBody(session);
  const serialized = JSON.stringify(body);
  const resultHash = createHash("sha256").update(serialized).digest("hex");
  const signature = createHmac("sha256", secret).update(serialized).digest("hex");

  return { ...body, resultHash, signature };
}

/**
 * Verify a signature against an envelope body.
 * Strips resultHash and signature from the envelope, re-serializes, and computes HMAC.
 */
export function verifyEnvelopeSignature(
  envelope: SubmitSessionEnvelope,
  secret: string,
): boolean {
  const { resultHash: _rh, signature: _sig, ...body } = envelope;
  const serialized = JSON.stringify(body);
  const expected = createHmac("sha256", secret).update(serialized).digest("hex");
  return expected === envelope.signature;
}
