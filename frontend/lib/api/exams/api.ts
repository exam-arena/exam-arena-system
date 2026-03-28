import type { ExamRaw, ExamRoomListItemRaw, ExamListItem, ExamDetail } from "./types";
import type { PaginatedResponse } from "../shared/pagination";
import { getMockExams, getMockExamById, getMockExamsByRoomId } from "./mock";
import { mapExamToListItem, mapExamToDetail } from "./mapper";
import { serverApiRequest } from "../server-client";


export async function getExams(
  page: number = 1,
  limit: number = 8
): Promise<PaginatedResponse<ExamRaw>> {
  const allExams = getMockExams();
  const totalItems = allExams.length;
  const start = (page - 1) * limit;
  const items = allExams.slice(start, start + limit);

  return {
    items,
    totalItems,
    currentPage: page,
    totalPages: Math.ceil(totalItems / limit) || 1,
    itemsPerPage: limit,
  };
}

export async function getExamById(
  examId: string
): Promise<ExamDetail | null> {
  const raw = getMockExamById(examId);
  if (!raw) return null;
  return mapExamToDetail(raw);
}

export async function getExamsByRoomId(
  roomId: string,
  page: number = 1,
  limit: number = 8
): Promise<PaginatedResponse<ExamRoomListItemRaw>> {
  try {
    // Real backend API: GET /api/v1/rooms/{roomId}/exams?page={page}&limit={limit}
    return await serverApiRequest<PaginatedResponse<ExamRoomListItemRaw>>(
      `/api/v1/rooms/${roomId}/exams?page=${page}&limit=${limit}`
    );
  } catch {
    const allExams = getMockExamsByRoomId(roomId);
    const totalItems = allExams.length;
    const start = (page - 1) * limit;
    const items = allExams.slice(start, start + limit).map((exam) => ({
      exam_id: exam.exam_id,
      room_id: exam.room_id,
      title: exam.title,
      type: exam.type,
      duration: exam.duration,
      start_time: exam.start_time,
    }));

    return {
      items,
      totalItems,
      currentPage: page,
      totalPages: Math.ceil(totalItems / limit) || 1,
      itemsPerPage: limit,
    };
  }
}

export async function getLatestExams(): Promise<ExamRaw[]> {
  return getMockExams();
}
