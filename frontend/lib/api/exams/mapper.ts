import type { ExamRaw, ExamListItem, ExamDetail } from "./types";

export function formatExamType(type: string): string {
  const normalized = type.trim().toLowerCase();

  switch (normalized) {
    case "practice":
      return "Luyện tập";
    case "mock_test":
      return "Thi thử";
    case "official":
      return "Chính thức";
    default:
      return type.replace(/_/g, " ");
  }
}

function countRootQuestions(exam: ExamRaw): number {
  if (typeof exam.total_questions === "number") {
    return exam.total_questions;
  }

  return (
    exam.sections?.reduce(
      (total, section) =>
        total +
        (section.questions?.filter((q) => q.parent_id === null).length || 0),
      0
    ) || 0
  );
}

export function mapExamToListItem(raw: ExamRaw): ExamListItem {
  const durationMinutes = Math.floor(raw.duration / 60);
  return {
    id: raw.exam_id,
    roomId: raw.room_id,
    title: raw.title,
    type: raw.type,
    typeLabel: formatExamType(raw.type),
    capacity: raw.capacity,
    durationSeconds: raw.duration,
    durationMinutes,
    durationLabel: `${durationMinutes} phút`,
    totalQuestions: countRootQuestions(raw),
  };
}

export function mapExamToDetail(raw: ExamRaw): ExamDetail {
  const listItem = mapExamToListItem(raw);
  return {
    ...listItem,
    roomName: raw.room_name ?? "",
    sections: raw.sections ?? [],
    startTime: raw.start_time ?? "",
    participantCount: raw.participant_count ?? 0,
  };
}
