import type { RuntimeRoomStore } from "./room-store.js";
import type { RuntimeSessionStore } from "./session-store.js";
import type { RuntimeRoom, RuntimeSession } from "./types.js";

function clone<T>(value: T): T {
  return structuredClone(value);
}

export class InMemoryRoomStore implements RuntimeRoomStore {
  private readonly roomsById = new Map<string, RuntimeRoom>();
  private readonly roomIdByCode = new Map<string, string>();

  async createRoom(room: RuntimeRoom): Promise<void> {
    this.roomsById.set(room.roomId, clone(room));
    this.roomIdByCode.set(room.roomCode, room.roomId);
  }

  async getRoom(roomId: string): Promise<RuntimeRoom | null> {
    const room = this.roomsById.get(roomId);
    return room ? clone(room) : null;
  }

  async getRoomByCode(roomCode: string): Promise<RuntimeRoom | null> {
    const roomId = this.roomIdByCode.get(roomCode);
    if (!roomId) {
      return null;
    }

    const room = this.roomsById.get(roomId);
    return room ? clone(room) : null;
  }

  async updateRoom(room: RuntimeRoom): Promise<void> {
    const previous = this.roomsById.get(room.roomId);
    if (previous && previous.roomCode !== room.roomCode) {
      this.roomIdByCode.delete(previous.roomCode);
    }

    this.roomsById.set(room.roomId, clone(room));
    this.roomIdByCode.set(room.roomCode, room.roomId);
  }

  async deleteRoom(roomId: string): Promise<void> {
    const room = this.roomsById.get(roomId);
    if (!room) {
      return;
    }

    this.roomsById.delete(roomId);
    this.roomIdByCode.delete(room.roomCode);
  }

  async listRooms(): Promise<RuntimeRoom[]> {
    return Array.from(this.roomsById.values(), (room) => clone(room));
  }

  async expireRooms(now: Date): Promise<number> {
    let removed = 0;

    for (const [roomId, room] of this.roomsById.entries()) {
      const isNotStarted = room.status === "waiting" || room.status === "ready";
      const isExpired = new Date(room.expiresAt).getTime() <= now.getTime();

      if (isNotStarted && isExpired) {
        this.roomsById.delete(roomId);
        this.roomIdByCode.delete(room.roomCode);
        removed += 1;
      }
    }

    return removed;
  }
}

export class InMemorySessionStore implements RuntimeSessionStore {
  private readonly sessionsById = new Map<string, RuntimeSession>();

  async createSession(session: RuntimeSession): Promise<void> {
    this.sessionsById.set(session.sessionId, clone(session));
  }

  async getSession(sessionId: string): Promise<RuntimeSession | null> {
    const session = this.sessionsById.get(sessionId);
    return session ? clone(session) : null;
  }

  async updateSession(session: RuntimeSession): Promise<void> {
    this.sessionsById.set(session.sessionId, clone(session));
  }

  async deleteSession(sessionId: string): Promise<void> {
    this.sessionsById.delete(sessionId);
  }

  async listSessions(): Promise<RuntimeSession[]> {
    return Array.from(this.sessionsById.values(), (session) => clone(session));
  }

  async expireSessions(now: Date): Promise<number> {
    let removed = 0;

    for (const [sessionId, session] of this.sessionsById.entries()) {
      const isActive = session.status === "started";
      const isExpired = new Date(session.expiresAt).getTime() <= now.getTime();

      if (isActive && isExpired) {
        this.sessionsById.delete(sessionId);
        removed += 1;
      }
    }

    return removed;
  }
}
