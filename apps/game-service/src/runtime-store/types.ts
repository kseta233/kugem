export type RuntimeRoomStatus =
  | "waiting"
  | "ready"
  | "started"
  | "finished"
  | "cancelled"
  | "expired";

export type RuntimeSessionStatus =
  | "started"
  | "finished"
  | "abandoned"
  | "cancelled"
  | "expired";

export type RuntimeRoomPlayerStatus = "joined" | "ready" | "left";

export type RuntimeRoomPlayer = {
  userId: string;
  displayName?: string;
  seat: number;
  status: RuntimeRoomPlayerStatus;
  joinedAt: string;
};

export type RuntimeGameAction = {
  actionId: string;
  seq: number;
  userId: string;
  type: string;
  payload: unknown;
  stateVersionBefore: number;
  stateVersionAfter: number;
  createdAt: string;
};

export type RuntimeActionLog = RuntimeGameAction[];

export type RuntimeRoom = {
  roomId: string;
  roomCode: string;
  gameType: string;
  gameVersion: string;
  status: RuntimeRoomStatus;
  hostUserId: string;
  maxPlayers: number;
  players: RuntimeRoomPlayer[];
  sessionId?: string;
  createdAt: string;
  updatedAt: string;
  expiresAt: string;
};

export type RuntimeSession<TState = unknown> = {
  sessionId: string;
  roomId: string;
  gameType: string;
  gameVersion: string;
  status: RuntimeSessionStatus;
  players: RuntimeRoomPlayer[];
  state: TState;
  stateVersion: number;
  actionLog: RuntimeActionLog;
  startedAt: string;
  updatedAt: string;
  endedAt?: string;
  submittedAt?: string;
  expiresAt: string;
};
