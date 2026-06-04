import type { RuntimeRoom } from "./types.js";

export interface RuntimeRoomStore {
  createRoom(room: RuntimeRoom): Promise<void>;
  getRoom(roomId: string): Promise<RuntimeRoom | null>;
  getRoomByCode(roomCode: string): Promise<RuntimeRoom | null>;
  updateRoom(room: RuntimeRoom): Promise<void>;
  deleteRoom(roomId: string): Promise<void>;
  listRooms(): Promise<RuntimeRoom[]>;
  expireRooms(now: Date): Promise<number>;
}
