import type { RoomRaw, RoomListItem, RoomDetail } from "./types";
import type { PaginatedResponse } from "../shared/pagination";
import { getMockRooms, getMockRoomById } from "./mock";
import { mapRoomToListItem, mapRoomToDetail } from "./mapper";


export async function getRooms(
  page: number = 1,
  limit: number = 6
): Promise<PaginatedResponse<RoomRaw>> {
  const allRooms = getMockRooms();
  const totalItems = allRooms.length;
  const start = (page - 1) * limit;
  const items = allRooms.slice(start, start + limit);

  return {
    items,
    totalItems,
    currentPage: page,
    totalPages: Math.ceil(totalItems / limit) || 1,
    itemsPerPage: limit,
  };
}

export async function getRoomById(
  roomId: string
): Promise<RoomDetail | null> {
  const raw = getMockRoomById(roomId);
  if (!raw) return null;
  return mapRoomToDetail(raw);
}

export async function getHotRooms(): Promise<RoomRaw[]> {
  return getMockRooms();
}
