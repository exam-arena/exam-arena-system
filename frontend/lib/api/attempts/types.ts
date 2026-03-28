

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

export interface AttemptData {
  title: string;
  durationMinutes: number;
  questions: any[];
  user: AttemptUser;
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
  questions: any[];
  userAnswers: Record<string, string>;
  user: AttemptUser;
}
