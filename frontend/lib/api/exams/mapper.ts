import type { ExamRaw, ExamListItem, ExamDetail } from "./types";


function countRootQuestions(exam: ExamRaw): number {
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
    typeLabel: raw.type.replace(/_/g, " "),
    capacity: raw.capacity,
    durationMinutes,
    durationLabel: `${durationMinutes} phút`,
    totalQuestions: countRootQuestions(raw),
  };
}

export function mapExamToDetail(raw: ExamRaw): ExamDetail {
  const listItem = mapExamToListItem(raw);
  return {
    ...listItem,
    sections: raw.sections,
    startTime: raw.start_time,
  };
}
