

export interface RoomRaw {
  room_id: string;
  name: string;
  type: string;
  price: number;
  test_quantity: number;
  status: string;
  has_access: boolean;
}


export interface RoomListItem {
  id: string;
  name: string;
  type: string;
  typeLabel: string;
  price: number;
  priceLabel: string;
  testQuantity: number;
  status: string;
  statusLabel: string;
}

export type RoomDetail = RoomListItem;
