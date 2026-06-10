import { describe, it } from "node:test";
import assert from "node:assert";
import {
  initializeGame,
  applyPlayerChoice,
  applyAction,
  getPlayerVisibleState,
} from "./engine.js";
import type { RpsGameState, RpsAction } from "./types.js";

const player1Id = "user-1";
const player2Id = "user-2";
const gameId = "game-1";

describe("RockPaperScissor Engine", () => {

  describe("initializeGame", () => {
    it("should create initial game state with round 1", () => {
      const gameState = initializeGame(gameId, player1Id, player2Id);
      assert.strictEqual(gameState.gameId, gameId);
      assert.strictEqual(gameState.player1UserId, player1Id);
      assert.strictEqual(gameState.player2UserId, player2Id);
      assert.strictEqual(gameState.player1Score, 0);
      assert.strictEqual(gameState.player2Score, 0);
      assert.strictEqual(gameState.gameStatus, "active");
      assert.strictEqual(gameState.currentRound.roundNumber, 1);
      assert.strictEqual(gameState.rounds.length, 1);
    });

    it("should have both players with null choices initially", () => {
      const gameState = initializeGame(gameId, player1Id, player2Id);
      assert.strictEqual(gameState.currentRound.player1.choice, null);
      assert.strictEqual(gameState.currentRound.player2.choice, null);
    });
  });

  describe("applyPlayerChoice - Single Choice", () => {
    it("should accept rock, paper, or scissors", () => {
      let gameState = initializeGame(gameId, player1Id, player2Id);
      const choicesResult1 = applyPlayerChoice(gameState, player1Id, "rock");
      assert.ok(choicesResult1.ok === true);

      gameState = choicesResult1.data;
      assert.strictEqual(gameState.currentRound.player1.choice, "rock");
      
      const choicesResult2 = applyPlayerChoice(gameState, player2Id, "paper");
      assert.ok(choicesResult2.ok === true);

      gameState = choicesResult2.data;
      // After both submit, we move to next round, so check the resolved round
      assert.strictEqual(gameState.rounds[0].player1.choice, "rock");
      assert.strictEqual(gameState.rounds[0].player2.choice, "paper");
    });

    it("should reject invalid choice", () => {
      const gameState = initializeGame(gameId, player1Id, player2Id);
      const result = applyPlayerChoice(gameState, player1Id, "invalid" as any);
      assert.ok(result.ok === false);
      assert.strictEqual(result.error.code, "INVALID_CHOICE");
    });

    it("should reject null choice", () => {
      const gameState = initializeGame(gameId, player1Id, player2Id);
      const result = applyPlayerChoice(gameState, player1Id, null);
      assert.ok(result.ok === false);
      assert.strictEqual(result.error.code, "INVALID_CHOICE");
    });

    it("should reject choice from non-player", () => {
      const gameState = initializeGame(gameId, player1Id, player2Id);
      const result = applyPlayerChoice(gameState, "unknown-user", "rock");
      assert.ok(result.ok === false);
      assert.strictEqual(result.error.code, "INVALID_PLAYER");
    });

    it("should reject choice when game not active", () => {
      let gameState = initializeGame(gameId, player1Id, player2Id);
      gameState.gameStatus = "finished";
      const result = applyPlayerChoice(gameState, player1Id, "rock");
      assert.ok(result.ok === false);
      assert.strictEqual(result.error.code, "GAME_NOT_ACTIVE");
    });
  });

  describe("applyPlayerChoice - Duplicate Submission", () => {
    it("should reject duplicate submission from same player", () => {
      let gameState = initializeGame(gameId, player1Id, player2Id);
      let result = applyPlayerChoice(gameState, player1Id, "rock");
      assert.ok(result.ok === true);
      gameState = result.data;

      result = applyPlayerChoice(gameState, player1Id, "paper");
      assert.ok(result.ok === false);
      assert.strictEqual(result.error.code, "DUPLICATE_CHOICE");
    });

    it("should allow other player to submit even if first player submitted", () => {
      let gameState = initializeGame(gameId, player1Id, player2Id);
      let result = applyPlayerChoice(gameState, player1Id, "rock");
      assert.ok(result.ok === true);
      gameState = result.data;

      result = applyPlayerChoice(gameState, player2Id, "paper");
      assert.ok(result.ok === true);
      gameState = result.data;
      // After both submit, we move to next round
      assert.strictEqual(gameState.rounds[0].player2.choice, "paper");
    });
  });

  describe("Round Resolution - Player 1 Wins", () => {
    it("rock beats scissors", () => {
      let gameState = initializeGame(gameId, player1Id, player2Id);
      let result = applyPlayerChoice(gameState, player1Id, "rock");
      gameState = result.data;

      result = applyPlayerChoice(gameState, player2Id, "scissors");
      gameState = result.data;

      assert.strictEqual(gameState.rounds[0].player1.result, "win");
      assert.strictEqual(gameState.rounds[0].player2.result, "lose");
      assert.strictEqual(gameState.player1Score, 1);
      assert.strictEqual(gameState.player2Score, 0);
    });

    it("paper beats rock", () => {
      let gameState = initializeGame(gameId, player1Id, player2Id);
      let result = applyPlayerChoice(gameState, player1Id, "paper");
      gameState = result.data;

      result = applyPlayerChoice(gameState, player2Id, "rock");
      gameState = result.data;

      assert.strictEqual(gameState.rounds[0].player1.result, "win");
      assert.strictEqual(gameState.rounds[0].player2.result, "lose");
      assert.strictEqual(gameState.player1Score, 1);
      assert.strictEqual(gameState.player2Score, 0);
    });

    it("scissors beats paper", () => {
      let gameState = initializeGame(gameId, player1Id, player2Id);
      let result = applyPlayerChoice(gameState, player1Id, "scissors");
      gameState = result.data;

      result = applyPlayerChoice(gameState, player2Id, "paper");
      gameState = result.data;

      assert.strictEqual(gameState.rounds[0].player1.result, "win");
      assert.strictEqual(gameState.rounds[0].player2.result, "lose");
      assert.strictEqual(gameState.player1Score, 1);
      assert.strictEqual(gameState.player2Score, 0);
    });
  });

  describe("Round Resolution - Player 2 Wins", () => {
    it("scissors beats paper", () => {
      let gameState = initializeGame(gameId, player1Id, player2Id);
      let result = applyPlayerChoice(gameState, player1Id, "paper");
      gameState = result.data;

      result = applyPlayerChoice(gameState, player2Id, "scissors");
      gameState = result.data;

      assert.strictEqual(gameState.rounds[0].player1.result, "lose");
      assert.strictEqual(gameState.rounds[0].player2.result, "win");
      assert.strictEqual(gameState.player1Score, 0);
      assert.strictEqual(gameState.player2Score, 1);
    });
  });

  describe("Round Resolution - Draw", () => {
    it("should handle draw with no score change", () => {
      let gameState = initializeGame(gameId, player1Id, player2Id);
      let result = applyPlayerChoice(gameState, player1Id, "rock");
      gameState = result.data;

      result = applyPlayerChoice(gameState, player2Id, "rock");
      gameState = result.data;

      assert.strictEqual(gameState.rounds[0].player1.result, "draw");
      assert.strictEqual(gameState.rounds[0].player2.result, "draw");
      assert.strictEqual(gameState.player1Score, 0);
      assert.strictEqual(gameState.player2Score, 0);
    });
  });

  describe("Game Progression", () => {
    it("should move to round 2 after round 1 resolves", () => {
      let gameState = initializeGame(gameId, player1Id, player2Id);
      let result = applyPlayerChoice(gameState, player1Id, "rock");
      gameState = result.data;

      result = applyPlayerChoice(gameState, player2Id, "scissors");
      gameState = result.data;

      assert.strictEqual(gameState.rounds.length, 2);
      assert.strictEqual(gameState.currentRound.roundNumber, 2);
      assert.strictEqual(gameState.currentRound.player1.choice, null);
      assert.strictEqual(gameState.currentRound.player2.choice, null);
      assert.strictEqual(gameState.gameStatus, "active");
    });

    it("should continue to round 3 after round 2", () => {
      let gameState = initializeGame(gameId, player1Id, player2Id);
      let result = applyPlayerChoice(gameState, player1Id, "rock");
      gameState = result.data;
      result = applyPlayerChoice(gameState, player2Id, "scissors");
      gameState = result.data;

      result = applyPlayerChoice(gameState, player1Id, "paper");
      gameState = result.data;
      result = applyPlayerChoice(gameState, player2Id, "scissors");
      gameState = result.data;

      assert.strictEqual(gameState.rounds.length, 3);
      assert.strictEqual(gameState.currentRound.roundNumber, 3);
      assert.strictEqual(gameState.player1Score, 1);
      assert.strictEqual(gameState.player2Score, 1);
    });
  });

  describe("First-to-2 Wins", () => {
    it("should end game when player 1 reaches 2 wins", () => {
      let gameState = initializeGame(gameId, player1Id, player2Id);
      let result = applyPlayerChoice(gameState, player1Id, "rock");
      gameState = result.data;
      result = applyPlayerChoice(gameState, player2Id, "scissors");
      gameState = result.data;

      assert.strictEqual(gameState.gameStatus, "active");
      assert.strictEqual(gameState.player1Score, 1);

      result = applyPlayerChoice(gameState, player1Id, "paper");
      gameState = result.data;
      result = applyPlayerChoice(gameState, player2Id, "rock");
      gameState = result.data;

      assert.strictEqual(gameState.gameStatus, "finished");
      assert.strictEqual(gameState.winnerId, player1Id);
      assert.strictEqual(gameState.player1Score, 2);
    });

    it("should end game when player 2 reaches 2 wins", () => {
      let gameState = initializeGame(gameId, player1Id, player2Id);
      let result = applyPlayerChoice(gameState, player1Id, "paper");
      gameState = result.data;
      result = applyPlayerChoice(gameState, player2Id, "scissors");
      gameState = result.data;

      result = applyPlayerChoice(gameState, player1Id, "rock");
      gameState = result.data;
      result = applyPlayerChoice(gameState, player2Id, "paper");
      gameState = result.data;

      assert.strictEqual(gameState.gameStatus, "finished");
      assert.strictEqual(gameState.winnerId, player2Id);
      assert.strictEqual(gameState.player2Score, 2);
    });

    it("should not end game at 1-1", () => {
      let gameState = initializeGame(gameId, player1Id, player2Id);
      let result = applyPlayerChoice(gameState, player1Id, "rock");
      gameState = result.data;
      result = applyPlayerChoice(gameState, player2Id, "scissors");
      gameState = result.data;

      result = applyPlayerChoice(gameState, player1Id, "paper");
      gameState = result.data;
      result = applyPlayerChoice(gameState, player2Id, "scissors");
      gameState = result.data;

      assert.strictEqual(gameState.gameStatus, "active");
      assert.strictEqual(gameState.player1Score, 1);
      assert.strictEqual(gameState.player2Score, 1);
      assert.strictEqual(gameState.currentRound.roundNumber, 3);
    });
  });

  describe("applyAction", () => {
    it("should apply submit_choice action", () => {
      const gameState = initializeGame(gameId, player1Id, player2Id);
      const action: RpsAction = {
        actionId: "action-1",
        userId: player1Id,
        type: "submit_choice",
        payload: { choice: "rock" },
        createdAt: new Date().toISOString(),
      };

      const result = applyAction(gameState, action);
      assert.ok(result.ok === true);
      assert.strictEqual(result.data.currentRound.player1.choice, "rock");
    });

    it("should reject unknown action type", () => {
      const gameState = initializeGame(gameId, player1Id, player2Id);
      const action: RpsAction = {
        actionId: "action-1",
        userId: player1Id,
        type: "unknown_action" as any,
        payload: {},
        createdAt: new Date().toISOString(),
      };

      const result = applyAction(gameState, action);
      assert.ok(result.ok === false);
      assert.strictEqual(result.error.code, "UNKNOWN_ACTION");
    });
  });

  describe("getPlayerVisibleState", () => {
    it("should hide opponent choice when only opponent submitted", () => {
      let gameState = initializeGame(gameId, player1Id, player2Id);
      let result = applyPlayerChoice(gameState, player1Id, "rock");
      gameState = result.data;

      const visibleState = getPlayerVisibleState(gameState, player1Id);
      assert.strictEqual(visibleState.currentRound.player1.choice, "rock");
      assert.strictEqual(visibleState.currentRound.player2.choice, null);
    });

    it("should show both choices after both submit", () => {
      let gameState = initializeGame(gameId, player1Id, player2Id);
      let result = applyPlayerChoice(gameState, player1Id, "rock");
      gameState = result.data;

      result = applyPlayerChoice(gameState, player2Id, "scissors");
      gameState = result.data;

      // After both submit, we moved to round 2, check the previous round
      const visibleState = getPlayerVisibleState(gameState, player1Id);
      assert.strictEqual(visibleState.rounds[0].player1.choice, "rock");
      assert.strictEqual(visibleState.rounds[0].player2.choice, "scissors");
    });

    it("should hide player1 choice from player2 when only player1 submitted", () => {
      let gameState = initializeGame(gameId, player1Id, player2Id);
      let result = applyPlayerChoice(gameState, player1Id, "rock");
      gameState = result.data;

      const visibleState = getPlayerVisibleState(gameState, player2Id);
      assert.strictEqual(visibleState.currentRound.player1.choice, null);
      assert.strictEqual(visibleState.currentRound.player2.choice, null);
    });
  });

  describe("Complete Game Scenarios", () => {
    it("should complete full first-to-2 game with winners", () => {
      let gameState = initializeGame(gameId, player1Id, player2Id);
      let result = applyPlayerChoice(gameState, player1Id, "rock");
      gameState = result.data;
      result = applyPlayerChoice(gameState, player2Id, "scissors");
      gameState = result.data;

      assert.strictEqual(gameState.player1Score, 1);
      assert.strictEqual(gameState.gameStatus, "active");

      result = applyPlayerChoice(gameState, player1Id, "paper");
      gameState = result.data;
      result = applyPlayerChoice(gameState, player2Id, "rock");
      gameState = result.data;

      assert.strictEqual(gameState.player1Score, 2);
      assert.strictEqual(gameState.gameStatus, "finished");
      assert.strictEqual(gameState.winnerId, player1Id);
      assert.strictEqual(gameState.rounds.length, 2);
    });

    it("should complete full first-to-2 game with draws", () => {
      let gameState = initializeGame(gameId, player1Id, player2Id);
      let result = applyPlayerChoice(gameState, player1Id, "rock");
      gameState = result.data;
      result = applyPlayerChoice(gameState, player2Id, "rock");
      gameState = result.data;

      assert.strictEqual(gameState.player1Score, 0);
      assert.strictEqual(gameState.player2Score, 0);
      assert.strictEqual(gameState.currentRound.roundNumber, 2);

      result = applyPlayerChoice(gameState, player1Id, "paper");
      gameState = result.data;
      result = applyPlayerChoice(gameState, player2Id, "rock");
      gameState = result.data;

      assert.strictEqual(gameState.player1Score, 1);

      result = applyPlayerChoice(gameState, player1Id, "rock");
      gameState = result.data;
      result = applyPlayerChoice(gameState, player2Id, "scissors");
      gameState = result.data;

      assert.strictEqual(gameState.gameStatus, "finished");
      assert.strictEqual(gameState.winnerId, player1Id);
      assert.strictEqual(gameState.rounds.length, 3);
    });
  });
});
