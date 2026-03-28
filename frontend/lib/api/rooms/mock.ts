import type { RoomRaw } from "./types";


import data from "@/data.json";

export function getMockRooms(): RoomRaw[] {
  return (data.exam_rooms || []) as RoomRaw[];
}

export function getMockRoomById(roomId: string): RoomRaw | undefined {
  return getMockRooms().find((r) => r.room_id === roomId);
}
