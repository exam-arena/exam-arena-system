import type { AttemptRaw } from "./types";


import data from "@/data.json";

const mockAttemptUserAnswers: Record<string, string> = {};

export function getMockAttempts(): AttemptRaw[] {
  return (data.exam_attempts || []) as AttemptRaw[];
}

export function getMockAttemptById(
  attemptId: string
): AttemptRaw | undefined {
  const attempts = getMockAttempts();
  return attempts.find((a) => a.attempt_id === attemptId) || attempts[0];
}

export function getMockExamForAttempt(examId: string) {
  return data.exams.find((e) => e.exam_id === examId) || data.exams[0];
}

export function getMockUserForAttempt(userId: string) {
  return data.users.find((u) => u.user_id === userId) || data.users[0];
}

export function getMockRoomForExam(roomId: string) {
  return (
    data.exam_rooms.find((r) => r.room_id === roomId) || data.exam_rooms[0]
  );
}

export function getMockFallbackUserAnswers(): Record<string, string> {
  return mockAttemptUserAnswers;
}
