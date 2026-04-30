import { apiRequest } from "../client";

export type ExamCompletionMap = Record<string, boolean>;

export async function getExamCompletion(
  examIds: string[]
): Promise<ExamCompletionMap> {
  const ids = Array.from(new Set(examIds.map((id) => id.trim()).filter(Boolean)));
  if (ids.length === 0) {
    return {};
  }

  const query = ids.map(encodeURIComponent).join(",");
  return apiRequest<ExamCompletionMap>(`/api/v1/exams/completion?ids=${query}`, {
    auth: true,
  });
}
