

import type { AttemptExplanationBlock } from "../attempts/types";

export interface QuestionOption {
  id: string;
  text: string;
}

export interface QuestionRaw {
  question_id: string;
  parent_id: string | null;
  content: string;
  image_url: string | null;
  options: QuestionOption[] | null;
  correct_answer: string | null;
  explanation?: string;
  explanation_blocks?: AttemptExplanationBlock[];
  point: number;
  type: string;
  question_type: string;
}

export interface SectionRaw {
  section_id: string;
  title: string;
  questions: QuestionRaw[];
}

export interface ExamRaw {
  exam_id: string;
  room_id: string;
  room_name?: string;
  title: string;
  type: string;
  capacity: number;
  duration: number;
  start_time?: string;
  total_questions?: number;
  participant_count?: number;
  sections?: SectionRaw[];
}

export interface ExamRoomListItemRaw {
  exam_id: string;
  room_id: string;
  title: string;
  type: string;
  duration: number;
  start_time?: string;
  has_completed?: boolean;
}


export interface ExamListItem {
  id: string;
  roomId: string;
  title: string;
  type: string;
  typeLabel: string;
  capacity: number;
  durationSeconds: number;
  durationMinutes: number;
  durationLabel: string;
  totalQuestions: number;
}

export interface ExamDetail extends ExamListItem {
  roomName: string;
  sections: SectionRaw[];
  startTime: string;
  participantCount: number;
}
