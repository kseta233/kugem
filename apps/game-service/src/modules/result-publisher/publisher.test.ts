import assert from "node:assert/strict";
import test from "node:test";
import type { RuntimeSession } from "../../runtime-store/types.js";
import type { RpsGameState } from "../rps-engine/types.js";
import { buildEnvelope, verifyEnvelopeSignature } from "./envelope.js";
import { createResultPublisher } from "./publisher.js";

const TEST_SECRET = "test-hmac-secret-32chars-minimum!!";

function buildFinishedSession(): RuntimeSession<RpsGameState> {
  const now = "2026-06-10T00:00:00.000Z";
  return {
    sessionId: "sess-001",
    roomId: "room-001",
    gameType: "rock-paper-scissors",
    gameVersion: "1",
    status: "finished",
    players: [
      { userId: "user-a", displayName: "Player A", seat: 1, status: "ready", joinedAt: now },
      { userId: "user-b", displayName: "Player B", seat: 2, status: "ready", joinedAt: now },
    ],
    state: {
      gameId: "game-001",
      player1UserId: "user-a",
      player2UserId: "user-b",
      player1Score: 2,
      player2Score: 0,
      currentRound: {
        roundNumber: 2,
        player1: { userId: "user-a", choice: "rock", result: "win" },
        player2: { userId: "user-b", choice: "scissors", result: "lose" },
        resolvedAt: now,
      },
      rounds: [
        {
          roundNumber: 1,
          player1: { userId: "user-a", choice: "rock", result: "win" },
          player2: { userId: "user-b", choice: "scissors", result: "lose" },
          resolvedAt: now,
        },
        {
          roundNumber: 2,
          player1: { userId: "user-a", choice: "rock", result: "win" },
          player2: { userId: "user-b", choice: "scissors", result: "lose" },
          resolvedAt: now,
        },
      ],
      gameStatus: "finished",
      winnerId: "user-a",
      createdAt: now,
      updatedAt: now,
    },
    stateVersion: 4,
    actionLog: [],
    startedAt: now,
    updatedAt: now,
    endedAt: now,
    expiresAt: "2026-06-10T00:30:00.000Z",
  };
}

test("M6: buildEnvelope includes correct session and outcome fields", () => {
  const session = buildFinishedSession();
  const envelope = buildEnvelope(session, TEST_SECRET);

  assert.equal(envelope.sessionId, session.sessionId);
  assert.equal(envelope.roomId, session.roomId);
  assert.equal(envelope.gameType, session.gameType);
  assert.equal(envelope.gameVersion, session.gameVersion);
  assert.equal(envelope.startedAt, session.startedAt);
  assert.equal(envelope.endedAt, session.endedAt);

  assert.equal(envelope.outcome.winnerId, "user-a");
  assert.equal(envelope.outcome.player1UserId, "user-a");
  assert.equal(envelope.outcome.player2UserId, "user-b");
  assert.equal(envelope.outcome.player1Score, 2);
  assert.equal(envelope.outcome.player2Score, 0);
  assert.equal(envelope.outcome.rounds.length, 2);

  assert.equal(envelope.players.length, 2);
  assert.equal(envelope.players[0].userId, "user-a");
  assert.equal(envelope.players[1].userId, "user-b");
});

test("M6: buildEnvelope sets resultHash and signature", () => {
  const session = buildFinishedSession();
  const envelope = buildEnvelope(session, TEST_SECRET);

  assert.ok(typeof envelope.resultHash === "string" && envelope.resultHash.length === 64, "resultHash should be 64-char hex");
  assert.ok(typeof envelope.signature === "string" && envelope.signature.length === 64, "signature should be 64-char hex");
  assert.notEqual(envelope.resultHash, envelope.signature);
});

test("M6: verifyEnvelopeSignature accepts correct signature", () => {
  const session = buildFinishedSession();
  const envelope = buildEnvelope(session, TEST_SECRET);
  assert.ok(verifyEnvelopeSignature(envelope, TEST_SECRET));
});

test("M6: verifyEnvelopeSignature rejects wrong secret", () => {
  const session = buildFinishedSession();
  const envelope = buildEnvelope(session, TEST_SECRET);
  assert.ok(!verifyEnvelopeSignature(envelope, "wrong-secret"));
});

test("M6: verifyEnvelopeSignature rejects tampered payload", () => {
  const session = buildFinishedSession();
  const envelope = buildEnvelope(session, TEST_SECRET);
  const tampered = { ...envelope, outcome: { ...envelope.outcome, player1Score: 999 } };
  assert.ok(!verifyEnvelopeSignature(tampered, TEST_SECRET));
});

test("M6: buildEnvelope two calls produce different envelopeIds", () => {
  const session = buildFinishedSession();
  const a = buildEnvelope(session, TEST_SECRET);
  const b = buildEnvelope(session, TEST_SECRET);
  assert.notEqual(a.envelopeId, b.envelopeId);
});

test("M6: createResultPublisher returns ok on 200 response", async () => {
  const publisher = createResultPublisher({
    supabaseResultFunctionUrl: "http://localhost:9999/submit",
    gameServiceHmacSecret: TEST_SECRET,
  });

  // Mock fetch to return 200
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => new Response(JSON.stringify({ ok: true }), { status: 200 });
  try {
    const session = buildFinishedSession();
    const result = await publisher.publishMatchResult(session);
    assert.ok(result.ok);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("M6: createResultPublisher returns error on non-200 response", async () => {
  const publisher = createResultPublisher({
    supabaseResultFunctionUrl: "http://localhost:9999/submit",
    gameServiceHmacSecret: TEST_SECRET,
  });

  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => new Response("INVALID_SIGNATURE", { status: 401 });
  try {
    const session = buildFinishedSession();
    const result = await publisher.publishMatchResult(session);
    assert.ok(!result.ok);
    assert.ok("error" in result && result.error.includes("401"));
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("M6: createResultPublisher returns error on network failure", async () => {
  const publisher = createResultPublisher({
    supabaseResultFunctionUrl: "http://localhost:9999/submit",
    gameServiceHmacSecret: TEST_SECRET,
  });

  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => { throw new Error("ECONNREFUSED"); };
  try {
    const session = buildFinishedSession();
    const result = await publisher.publishMatchResult(session);
    assert.ok(!result.ok);
    assert.ok("error" in result && result.error.includes("ECONNREFUSED"));
  } finally {
    globalThis.fetch = originalFetch;
  }
});
