export type RpsChoice = "rock" | "paper" | "scissors" | null;

export type RpsRoundResult = "win" | "lose" | "draw" | null;

export type RpsPlayerRoundState = {
  userId: string;
  choice: RpsChoice;
  result: RpsRoundResult;
};

export type RpsRound = {
  roundNumber: number;
  player1: RpsPlayerRoundState;
  player2: RpsPlayerRoundState;
  resolvedAt?: string;
};

export type RpsGameState = {
  gameId: string;
  player1UserId: string;
  player2UserId: string;
  player1Score: number;
  player2Score: number;
  currentRound: RpsRound;
  rounds: RpsRound[];
  gameStatus: "active" | "finished";
  winnerId?: string;
  createdAt: string;
  updatedAt: string;
};

export type RpsAction = {
  actionId: string;
  userId: string;
  type: "submit_choice" | "start_game";
  payload: RpsActionPayload;
  createdAt: string;
};

export type RpsActionPayload =
  | {
      choice: RpsChoice;
    }
  | Record<string, never>;

export type RpsEngineError = {
  code: string;
  message: string;
};

export type RpsEngineResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: RpsEngineError };
