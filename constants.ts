import { Group, Task } from './types';

export const GROUPS: Group[] = [
  { id: 'personal', name: 'Personal', color: 'text-rose-400', bgColor: 'bg-rose-400/10' },
  { id: 'work', name: 'Work', color: 'text-blue-400', bgColor: 'bg-blue-400/10' },
  { id: 'learning', name: 'Learning', color: 'text-amber-400', bgColor: 'bg-amber-400/10' },
  { id: 'health', name: 'Health', color: 'text-emerald-400', bgColor: 'bg-emerald-400/10' },
];

const today = new Date().toISOString().split('T')[0];

export const INITIAL_TASKS: Task[] = [
  {
    id: '1',
    title: 'Complete Project Proposal',
    description: 'Draft the initial scope and timeline for the client.',
    date: today,
    groupId: 'work',
    completed: false,
    subtasks: []
  },
  {
    id: '2',
    title: 'Morning Jog',
    description: '5km run around the park.',
    date: today,
    groupId: 'health',
    completed: true,
    subtasks: []
  },
  {
    id: '3',
    title: 'Learn React 19 Features',
    description: 'Check out the new compiler and hooks.',
    date: today,
    groupId: 'learning',
    completed: false,
    subtasks: []
  }
];