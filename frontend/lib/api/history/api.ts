import { apiRequest } from "../client";
import type { HistoryAttemptsResponse } from "./types";

export async function getAttemptHistory(
  cursor?: string | null,
  limit: number = 6
): Promise<HistoryAttemptsResponse> {
  const params = new URLSearchParams();
  params.set("limit", String(limit));
  if (cursor) {
    params.set("cursor", cursor);
  }

  return apiRequest<HistoryAttemptsResponse>(
    `/api/v1/attempts/history?${params.toString()}`
  );
}
