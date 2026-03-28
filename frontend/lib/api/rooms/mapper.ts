import type { RoomRaw, RoomListItem, RoomDetail } from "./types";


function formatPrice(price: number): string {
  if (price <= 0) return "Miễn phí";
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
  }).format(price);
}

function formatType(type: string): string {
  return type.replace(/_/g, " ");
}

function formatStatus(status: string): string {
  return status === "active" ? "Đang mở" : "Đóng";
}

export function mapRoomToListItem(raw: RoomRaw): RoomListItem {
  return {
    id: raw.room_id,
    name: raw.name,
    type: raw.type,
    typeLabel: formatType(raw.type),
    price: raw.price,
    priceLabel: formatPrice(raw.price),
    testQuantity: raw.test_quantity,
    status: raw.status,
    statusLabel: formatStatus(raw.status),
  };
}

export function mapRoomToDetail(raw: RoomRaw): RoomDetail {
  return mapRoomToListItem(raw);
}
