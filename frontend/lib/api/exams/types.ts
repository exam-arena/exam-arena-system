

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
  correct_answer: string;
  explanation: string;
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
  title: string;
  type: string;
  capacity: number;
  duration: number;
  start_time: string;
  sections: SectionRaw[];
}


export interface ExamListItem {
  id: string;
  roomId: string;
  title: string;
  type: string;
  typeLabel: string;
  capacity: number;
  durationMinutes: number;
  durationLabel: string;
  totalQuestions: number;
}

export interface ExamDetail extends ExamListItem {
  sections: SectionRaw[];
  startTime: string;
}
