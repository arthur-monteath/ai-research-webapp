// types.ts

export interface Question {
  id: string;
  text: string;
}

export interface Task {
  id: string;
  title: string;
  description: string;
  questions: Question[];
  grade?: number;
}
