export interface HistoryAttemptItem {
  attempt_id: string;
  started_at: string;
  submitted_at: string | null;
  room_name: string;
  exam_name: string;
  score: string;
}

export interface HistoryAttemptsResponse {
  items: HistoryAttemptItem[];
  totalItems: number;
  currentPage: number;
  totalPages: number;
  itemsPerPage: number;
}
