import { randomUUID } from "crypto";
import type {
  RpsAction,
  RpsActionPayload,
  RpsChoice,
  RpsEngineResult,
  RpsGameState,
  RpsRound,
  RpsRoundResult,
} from "./types.js";

/**
 * Determine winner of a single round based on player choices
 * Returns the result from player1's perspective
 */
function resolveRound(choice1: RpsChoice, choice2: RpsChoice): RpsRoundResult {
  if (choice1 === null || choice2 === null) {
    return null;
  }

  if (choice1 === choice2) {
    return "draw";
  }

  if (
    (choice1 === "rock" && choice2 === "scissors") ||
    (choice1 === "paper" && choice2 === "rock") ||
    (choice1 === "scissors" && choice2 === "paper")
  ) {
    return "win";
  }

  return "lose";
}

/**
 * Determine overall game winner based on first-to-2 wins
 */
function checkGameWinner(
  player1Score: number,
  player2Score: number,
  player1UserId: string,
  player2UserId: string,
): string | undefined {
  if (player1Score >= 2) {
    return player1UserId;
  }
  if (player2Score >= 2) {
    return player2UserId;
  }
  return undefined;
}

/**
 * Create initial game state
 */
export function initializeGame(
  gameId: string,
  player1UserId: string,
  player2UserId: string,
): RpsGameState {
  const now = new Date().toISOString();

  const initialRound: RpsRound = {
    roundNumber: 1,
    player1: {
      userId: player1UserId,
      choice: null,
      result: null,
    },
    player2: {
      userId: player2UserId,
      choice: null,
      result: null,
    },
  };

  return {
    gameId,
    player1UserId,
    player2UserId,
    player1Score: 0,
    player2Score: 0,
    currentRound: initialRound,
    rounds: [initialRound],
    gameStatus: "active",
    createdAt: now,
    updatedAt: now,
  };
}

/**
 * Apply a player choice to the current round
 * Returns error if:
 * - player is not in game
 * - player already submitted choice in this round
 * - choice is invalid
 */
export function applyPlayerChoice(
  state: RpsGameState,
  userId: string,
  choice: RpsChoice,
): RpsEngineResult<RpsGameState> {
  // Validate user is in game
  if (userId !== state.player1UserId && userId !== state.player2UserId) {
    return {
      ok: false,
      error: {
        code: "INVALID_PLAYER",
        message: "Player is not in this game",
      },
    };
  }

  // Validate game is active
  if (state.gameStatus !== "active") {
    return {
      ok: false,
      error: {
        code: "GAME_NOT_ACTIVE",
        message: "Game is not active",
      },
    };
  }

  // Validate choice
  if (choice === null || !["rock", "paper", "scissors"].includes(choice)) {
    return {
      ok: false,
      error: {
        code: "INVALID_CHOICE",
        message: "Choice must be rock, paper, or scissors",
      },
    };
  }

  const isPlayer1 = userId === state.player1UserId;

  // Clone state for immutability
  const newState = JSON.parse(JSON.stringify(state)) as RpsGameState;
  // After cloning, currentRound and rounds[last] are different objects
  // We need to work with the one in the rounds array
  const newRound = newState.rounds[newState.rounds.length - 1];

  // Check for duplicate submission in same round (using cloned state)
  if (isPlayer1) {
    if (newRound.player1.choice !== null) {
      return {
        ok: false,
        error: {
          code: "DUPLICATE_CHOICE",
          message: "Player already submitted choice for this round",
        },
      };
    }
  } else {
    if (newRound.player2.choice !== null) {
      return {
        ok: false,
        error: {
          code: "DUPLICATE_CHOICE",
          message: "Player already submitted choice for this round",
        },
      };
    }
  }

  // Update player choice
  if (isPlayer1) {
    newRound.player1.choice = choice;
  } else {
    newRound.player2.choice = choice;
  }

  // Sync currentRound to be the same object as the modified round
  newState.currentRound = newRound;

  // Both players submitted - resolve round
  if (newRound.player1.choice !== null && newRound.player2.choice !== null) {
    const player1Result = resolveRound(newRound.player1.choice, newRound.player2.choice);
    const player2Result = player1Result === "draw" ? "draw" : player1Result === "win" ? "lose" : "win";

    newRound.player1.result = player1Result;
    newRound.player2.result = player2Result;
    newRound.resolvedAt = new Date().toISOString();

    // Update scores
    if (player1Result === "win") {
      newState.player1Score += 1;
    } else if (player1Result === "lose") {
      newState.player2Score += 1;
    }
    // draw: no score change

    // Check if game is won (first to 2)
    const winnerId = checkGameWinner(
      newState.player1Score,
      newState.player2Score,
      newState.player1UserId,
      newState.player2UserId,
    );

    if (winnerId) {
      newState.gameStatus = "finished";
      newState.winnerId = winnerId;
    } else {
      // Start next round
      const nextRound: RpsRound = {
        roundNumber: newRound.roundNumber + 1,
        player1: {
          userId: newState.player1UserId,
          choice: null,
          result: null,
        },
        player2: {
          userId: newState.player2UserId,
          choice: null,
          result: null,
        },
      };
      newState.currentRound = nextRound;
      newState.rounds.push(nextRound);
    }
  }

  newState.updatedAt = new Date().toISOString();
  return {
    ok: true,
    data: newState,
  };
}

/**
 * Apply an action to the game state
 * Reducer-like function for state updates
 */
export function applyAction(
  state: RpsGameState,
  action: RpsAction,
): RpsEngineResult<RpsGameState> {
  if (action.type === "submit_choice") {
    const payload = action.payload as { choice: RpsChoice };
    return applyPlayerChoice(state, action.userId, payload.choice);
  }

  return {
    ok: false,
    error: {
      code: "UNKNOWN_ACTION",
      message: `Unknown action type: ${action.type}`,
    },
  };
}

/**
 * Get visible state for a player (hide opponent's unrevealed choices)
 */
export function getPlayerVisibleState(
  state: RpsGameState,
  playerUserId: string,
): RpsGameState {
  if (playerUserId !== state.player1UserId && playerUserId !== state.player2UserId) {
    return state; // Non-player sees full state (shouldn't happen)
  }

  const isPlayer1 = playerUserId === state.player1UserId;

  // Clone state
  const visibleState = JSON.parse(JSON.stringify(state)) as RpsGameState;

  // Hide opponent's unrevealed choices in current round
  if (visibleState.currentRound.player1.choice !== null &&
      visibleState.currentRound.player2.choice !== null) {
    // Both submitted - no hiding needed
    return visibleState;
  }

  // Hide opponent's choice if it's unrevealed
  if (isPlayer1) {
    if (visibleState.currentRound.player2.choice !== null &&
        visibleState.currentRound.player1.choice === null) {
      visibleState.currentRound.player2.choice = null;
    }
  } else {
    if (visibleState.currentRound.player1.choice !== null &&
        visibleState.currentRound.player2.choice === null) {
      visibleState.currentRound.player1.choice = null;
    }
  }

  return visibleState;
}
