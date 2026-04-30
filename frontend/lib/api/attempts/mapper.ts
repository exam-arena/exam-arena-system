import type {
  AttemptData,
  AttemptQuestion,
  AttemptResultData,
  AttemptReviewData,
  AttemptRaw,
  AttemptUser,
} from "./types";
import type { SectionRaw } from "../exams/types";
import type { QuestionRaw } from "../exams/types";

interface RawUser {
  username: string;
  fullname: string;
  email: string;
  role: string;
}

interface RawExam {
  exam_id: string;
  title: string;
  type: string;
  duration: number;
  start_time?: string;
  room_id: string;
  sections: SectionRaw[];
}

interface RawRoom {
  room_id: string;
  name: string;
}

function mapUser(raw: RawUser): AttemptUser {
  return {
    name: raw.username,
    fullName: raw.fullname,
    email: raw.email,
    role: raw.role,
  };
}

function mapRawQuestion(raw: QuestionRaw): AttemptQuestion {
  return {
    question_id: raw.question_id,
    parent_id: raw.parent_id,
    content: raw.content,
    image_url: raw.image_url,
    options: raw.options ?? [],
    type: raw.type,
    question_type: raw.question_type,
    explanation: raw.explanation,
    explanation_blocks: raw.explanation_blocks,
    correct_answer: raw.correct_answer,
  };
}

export function mapAttemptData(
  exam: RawExam,
  user: RawUser
): AttemptData {
  const questions = exam.sections.reduce(
    (acc: AttemptQuestion[], sec) => acc.concat(sec.questions.map(mapRawQuestion)),
    [] as AttemptQuestion[]
  );

  return {
    title: exam.title,
    durationMinutes: Math.floor(exam.duration / 60),
    questions,
    user: mapUser(user),
  };
}

export function mapAttemptResult(
  attempt: AttemptRaw,
  exam: RawExam,
  user: RawUser,
  room: RawRoom
): AttemptResultData {
  let correct = 0,
    wrong = 0,
    skipped = 0;

  if (attempt.section_logs) {
    attempt.section_logs.forEach((sec) => {
      sec.details.forEach((detail) => {
        if (!detail.selected_ans) skipped++;
        else if (detail.is_correct) correct++;
        else wrong++;
      });
    });
  } else {
    correct = 32;
    wrong = 8;
    skipped = 10;
  }

  return {
    user: {
      username: user.username,
      fullname: user.fullname,
      email: user.email,
      role: user.role,
    },
    exam: {
      id: exam.exam_id,
      title: exam.title,
      type: exam.type,
      duration: exam.duration,
      start_time: exam.start_time,
    },
    room: { id: room.room_id, name: room.name },
    result: {
      score: attempt.marks ? attempt.marks.toString() : "8.0",
      message: "Mức điểm khá ổn, hãy cố gắng hơn nữa nhé!",
      correct,
      wrong,
      skipped,
    },
  };
}

export function mapAttemptReview(
  attempt: AttemptRaw,
  exam: RawExam,
  user: RawUser,
  fallbackAnswers: Record<string, string>
): AttemptReviewData {
  const questions = exam.sections.reduce(
    (acc: AttemptQuestion[], sec) => acc.concat(sec.questions.map(mapRawQuestion)),
    [] as AttemptQuestion[]
  );

  let userAnswers: Record<string, string> = {};
  if (attempt.section_logs) {
    attempt.section_logs.forEach((log) => {
      log.details.forEach((d) => {
        userAnswers[d.question_id] = d.selected_ans;
      });
    });
  } else {
    userAnswers = fallbackAnswers;
  }

  return {
    title: exam.title,
    questions,
    userAnswers,
    user: mapUser(user),
  };
}
