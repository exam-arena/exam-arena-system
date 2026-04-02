import type { RoomRaw, RoomDetail } from "./types";
import type { PaginatedResponse } from "../shared/pagination";
import { getMockRoomById } from "./mock";
import { mapRoomToDetail } from "./mapper";
import { serverApiRequest } from "../server-client";


export async function getRooms(
  page: number = 1,
  limit: number = 6
): Promise<PaginatedResponse<RoomRaw>> {
  return serverApiRequest<PaginatedResponse<RoomRaw>>(
    `/api/v1/rooms?page=${page}&limit=${limit}`
  );
}

export async function getRoomById(
  roomId: string
): Promise<RoomDetail | null> {
  const raw = getMockRoomById(roomId);
  if (!raw) return null;
  return mapRoomToDetail(raw);
}

export async function getHotRooms(): Promise<RoomRaw[]> {
  return serverApiRequest<RoomRaw[]>("/api/v1/rooms/hot?limit=4");
}
