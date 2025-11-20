import { Group, Task } from './types';

export const GROUPS: Group[] = [
  { id: 'personal', name: 'Personal', color: 'text-rose-400', bgColor: 'bg-rose-400/10' },
  { id: 'work', name: 'Work', color: 'text-blue-400', bgColor: 'bg-blue-400/10' },
  { id: 'learning', name: 'Learning', color: 'text-amber-400', bgColor: 'bg-amber-400/10' },
  { id: 'health', name: 'Health', color: 'text-emerald-400', bgColor: 'bg-emerald-400/10' },
];

export const INITIAL_TASKS: Task[] = [];