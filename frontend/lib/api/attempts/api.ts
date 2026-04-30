import type {
  AttemptData,
  AttemptProcessingData,
  AttemptResultData,
  AttemptReviewData,
  SaveAttemptAnswerInput,
  SaveAttemptAnswersData,
  StartAttemptData,
  SubmitAttemptData,
} from "./types";
import { apiRequest } from "../client";

export async function getAttempt(
  attemptId: string
): Promise<AttemptData> {
  return apiRequest<AttemptData>(`/api/v1/attempts/${attemptId}`);
}

export async function startAttempt(
  examId: string
): Promise<StartAttemptData> {
  return apiRequest<StartAttemptData>(`/api/v1/exams/${examId}/attempts`, {
    method: "POST",
  });
}

export async function saveAttemptAnswers(
  attemptId: string,
  answers: SaveAttemptAnswerInput[]
): Promise<SaveAttemptAnswersData> {
  return apiRequest<SaveAttemptAnswersData>(`/api/v1/attempts/${attemptId}/answers`, {
    method: "PUT",
    body: { answers },
  });
}

export async function submitAttempt(
  attemptId: string
): Promise<SubmitAttemptData> {
  return apiRequest<SubmitAttemptData>(`/api/v1/attempts/${attemptId}/submit`, {
    method: "POST",
    allowProcessing: true,
  });
}

export async function getAttemptResult(
  attemptId: string
): Promise<AttemptResultData | AttemptProcessingData> {
  return apiRequest<AttemptResultData | AttemptProcessingData>(
    `/api/v1/attempts/${attemptId}/result`,
    { allowProcessing: true }
  );
}

export async function getAttemptReview(
  attemptId: string
): Promise<AttemptReviewData | AttemptProcessingData> {
  return apiRequest<AttemptReviewData | AttemptProcessingData>(
    `/api/v1/attempts/${attemptId}/review`,
    { allowProcessing: true }
  );
}
