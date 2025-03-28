// types.ts

export interface ResponseData {
  timeOfSubmission: string; // or Date if you convert it
  studentId: string;
  taskId: string;
  questionId: string;
  timeTaken: string; // or number if converted
  answer: string;
  chatLogs: string;
  gradingStatus: string;
  comments: string;
  correct: boolean;
  grade: number;
}

export interface Question {
  id: string;
  text: string;
  responses?: ResponseData[];
}

export interface Task {
  id: string;
  title: string;
  description: string;
  questions: Question[];
}
