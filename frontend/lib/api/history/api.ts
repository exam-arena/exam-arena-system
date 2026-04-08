import { apiRequest } from "../client";
import type { HistoryAttemptsResponse } from "./types";

export async function getAttemptHistory(
  page: number = 1,
  limit: number = 6
): Promise<HistoryAttemptsResponse> {
  return apiRequest<HistoryAttemptsResponse>(
    `/api/v1/attempts/history?page=${page}&limit=${limit}`
  );
}
