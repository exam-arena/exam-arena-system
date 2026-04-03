

export interface SectionLogDetail {
  question_id: string;
  selected_ans: string;
  is_correct: boolean;
}

export interface SectionLog {
  section_id: string;
  details: SectionLogDetail[];
}

export interface AttemptRaw {
  attempt_id: string;
  user_id: string;
  exam_id: string;
  attempt_type: string;
  marks: number;
  status: string;
  started_at: string;
  end_at: string | null;
  section_logs: SectionLog[];
}


export interface AttemptUser {
  name: string;
  fullName: string;
  email: string;
  role: string;
}

export interface AttemptQuestionOption {
  id: string;
  text: string;
}

export interface AttemptQuestion {
  question_id: string;
  parent_id: string | null;
  content: string;
  image_url: string | null;
  options: AttemptQuestionOption[];
  type: string;
  question_type: string;
  explanation?: string;
  correct_answer?: string;
}

export interface AttemptData {
  attempt_id?: string;
  status?: string;
  started_at?: string;
  duration_seconds?: number;
  server_time?: string;
  user_answers?: Record<string, string>;
  title: string;
  durationMinutes: number;
  questions: AttemptQuestion[];
  user: AttemptUser;
}

export interface StartAttemptData {
  attempt_id: string;
  exam_id: string;
  status: string;
  started_at: string;
}

export interface SaveAttemptAnswerInput {
  question_id: string;
  selected_ans: string;
}

export interface SaveAttemptAnswersData {
  attempt_id: string;
  saved_at: string;
  saved_count: number;
  answers: SaveAttemptAnswerInput[];
}

export interface SubmitAttemptData {
  attempt_id: string;
  status: string;
  submitted_at: string | null;
}

export interface AttemptResultData {
  user: {
    username: string;
    fullname: string;
    email: string;
    role: string;
  };
  exam: {
    title: string;
    type: string;
  };
  room: {
    id: string;
    name: string;
  };
  result: {
    score: string;
    message: string;
    correct: number;
    wrong: number;
    skipped: number;
  };
}

export interface AttemptReviewData {
  title: string;
  questions: AttemptQuestion[];
  userAnswers: Record<string, string>;
  user: AttemptUser;
}
