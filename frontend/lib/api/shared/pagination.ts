export interface PaginatedResponse<T> {
  items: T[];
  totalItems: number;
  currentPage: number;
  totalPages: number;
  itemsPerPage: number;
}
