import type { RuntimeSession } from "./types.js";

export interface RuntimeSessionStore {
  createSession(session: RuntimeSession): Promise<void>;
  getSession(sessionId: string): Promise<RuntimeSession | null>;
  updateSession(session: RuntimeSession): Promise<void>;
  deleteSession(sessionId: string): Promise<void>;
  listSessions(): Promise<RuntimeSession[]>;
  expireSessions(now: Date): Promise<number>;
}
