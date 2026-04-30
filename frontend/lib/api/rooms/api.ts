import type { RoomRaw, RoomDetail } from "./types";
import type { PaginatedResponse } from "../shared/pagination";
import { mapRoomToDetail } from "./mapper";
import { apiRequest } from "../client";
import { ApiError } from "../shared/errors";


export async function getRooms(
  page: number = 1,
  limit: number = 6
): Promise<PaginatedResponse<RoomRaw>> {
  const { serverApiRequest } = await import("../server-client");
  return serverApiRequest<PaginatedResponse<RoomRaw>>(
    `/api/v1/rooms?page=${page}&limit=${limit}`
  );
}

export async function getRoomById(
  roomId: string
): Promise<RoomDetail | null> {
  try {
    const raw =
      typeof window === "undefined"
        ? await (await import("../server-client")).serverApiRequest<RoomRaw>(
            `/api/v1/rooms/${roomId}`
          )
        : await apiRequest<RoomRaw>(`/api/v1/rooms/${roomId}`);

    return mapRoomToDetail(raw);
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) {
      return null;
    }
    throw error;
  }
}

export async function getHotRooms(): Promise<RoomRaw[]> {
  if (typeof window === "undefined") {
    const { serverApiRequest } = await import("../server-client");
    return serverApiRequest<RoomRaw[]>("/api/v1/rooms/hot?limit=4");
  }

  return apiRequest<RoomRaw[]>("/api/v1/rooms/hot?limit=4");
}

export async function joinRoom(roomId: string) {
  return apiRequest<{
    room_id: string;
    access_granted: boolean;
    requires_payment: boolean;
    granted_at?: string | null;
    expired_at?: string | null;
    price?: number;
    source_type?: string;
  }>(`/api/v1/rooms/${roomId}/join`, {
    method: "POST",
  });
}
