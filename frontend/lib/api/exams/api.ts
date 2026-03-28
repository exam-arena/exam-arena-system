import type { ExamRaw, ExamListItem, ExamDetail } from "./types";
import type { PaginatedResponse } from "../shared/pagination";
import { getMockExams, getMockExamById, getMockExamsByRoomId } from "./mock";
import { mapExamToListItem, mapExamToDetail } from "./mapper";


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
  limit: number = 6
): Promise<PaginatedResponse<ExamRaw>> {
  const allExams = getMockExamsByRoomId(roomId);
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

export async function getLatestExams(): Promise<ExamRaw[]> {
  return getMockExams();
}
