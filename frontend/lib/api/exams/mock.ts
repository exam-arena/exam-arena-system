import type { ExamRaw } from "./types";


import data from "@/data.json";

export function getMockExams(): ExamRaw[] {
  return (data.exams || []) as ExamRaw[];
}

export function getMockExamById(examId: string): ExamRaw | undefined {
  return getMockExams().find((e) => e.exam_id === examId);
}

export function getMockExamsByRoomId(roomId: string): ExamRaw[] {
  return getMockExams().filter((e) => e.room_id === roomId);
}
