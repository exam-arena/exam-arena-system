import type { ExamRaw, ExamRoomListItemRaw, ExamDetail } from "./types";
import type { PaginatedResponse } from "../shared/pagination";
import { mapExamToDetail } from "./mapper";
import { serverApiRequest } from "../server-client";


export async function getExams(
  page: number = 1,
  limit: number = 8
): Promise<PaginatedResponse<ExamRaw>> {
  return serverApiRequest<PaginatedResponse<ExamRaw>>(
    `/api/v1/exams?page=${page}&limit=${limit}`
  );
}

export async function getExamById(
  examId: string
): Promise<ExamDetail | null> {
  const raw = await serverApiRequest<ExamRaw>(`/api/v1/exams/${examId}`);
  return mapExamToDetail(raw);
}

export async function getExamsByRoomId(
  roomId: string,
  page: number = 1,
  limit: number = 8
): Promise<PaginatedResponse<ExamRoomListItemRaw>> {
  return serverApiRequest<PaginatedResponse<ExamRoomListItemRaw>>(
    `/api/v1/rooms/${roomId}/exams?page=${page}&limit=${limit}`
  );
}

export async function getLatestExams(): Promise<ExamRaw[]> {
  return serverApiRequest<ExamRaw[]>("/api/v1/exams/latest?limit=8");
}
