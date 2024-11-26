export interface Question {
  id: string;
  text: string;
}

export interface Task {
  id: string;
  title: string;
  description: string;
  assignedTo: ('Group A' | 'Group B' | 'Group C')[];
  questions: Question[];
}