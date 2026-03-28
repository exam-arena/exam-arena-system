import type { AttemptData, AttemptResultData, AttemptReviewData } from "./types";
import {
  getMockAttemptById,
  getMockExamForAttempt,
  getMockUserForAttempt,
  getMockRoomForExam,
  getMockFallbackUserAnswers,
} from "./mock";
import {
  mapAttemptData,
  mapAttemptResult,
  mapAttemptReview,
} from "./mapper";

export async function getAttempt(
  attemptId: string
): Promise<AttemptData> {
  const attempt = getMockAttemptById(attemptId)!;
  const exam = getMockExamForAttempt(attempt.exam_id);
  const user = getMockUserForAttempt(attempt.user_id);

  return mapAttemptData(exam, user);
}

export async function getAttemptResult(
  attemptId: string
): Promise<AttemptResultData> {
  const attempt = getMockAttemptById(attemptId)!;
  const exam = getMockExamForAttempt(attempt.exam_id);
  const user = getMockUserForAttempt(attempt.user_id);
  const room = getMockRoomForExam(exam.room_id);

  return mapAttemptResult(attempt, exam, user, room);
}

export async function getAttemptReview(
  attemptId: string
): Promise<AttemptReviewData> {
  const attempt = getMockAttemptById(attemptId)!;
  const exam = getMockExamForAttempt(attempt.exam_id);
  const user = getMockUserForAttempt(attempt.user_id);

  return mapAttemptReview(
    attempt,
    exam,
    user,
    getMockFallbackUserAnswers()
  );
}
