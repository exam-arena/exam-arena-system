

export interface RoomRaw {
  room_id: string;
  name: string;
  type: string;
  price: number;
  test_quantity: number;
  status: string;
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

export interface RoomDetail extends RoomListItem {}
