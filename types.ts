export interface Group {
  id: string;
  name: string;
  color: string; // Tailwind class for text color, e.g., "text-blue-400"
  bgColor: string; // Tailwind class for bg, e.g., "bg-blue-400/20"
}

export interface SubTask {
  id: string;
  title: string;
  completed: boolean;
}

export interface Task {
  id: string;
  title: string;
  description?: string;
  date: string; // YYYY-MM-DD
  groupId: string;
  completed: boolean;
  subtasks?: SubTask[];
}

export type ViewMode = 'calendar' | 'list';

// Utility type for Calendar generation
export interface CalendarDay {
  date: string; // YYYY-MM-DD
  dayOfMonth: number;
  isCurrentMonth: boolean;
  isToday: boolean;
  hasTasks: boolean;
}