export interface Task {
  id: string;
  title: string;
  status: 'backlog' | 'recording' | 'completed';
  createdAt: string;
  updatedAt: string;
  audioPath?: string;
  duration?: number;
} 