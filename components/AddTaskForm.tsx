import React, { useState } from 'react';
import { Plus, X, FileText, Clock, ListChecks, Type, Layers as LayersIcon } from 'lucide-react';
import { Group } from '../types';
import { cn } from '../lib/utils';
import { TimePicker } from './TimePicker';

interface AddTaskFormProps {
  selectedDate: string;
  groups: Group[];
  onAdd: (title: string, description: string, groupId: string, time?: string, subtasks?: { title: string }[]) => void;
  onCancel: () => void;
}

export const AddTaskForm: React.FC<AddTaskFormProps> = ({ selectedDate, groups, onAdd, onCancel }) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [groupId, setGroupId] = useState(groups[0].id);
  const [time, setTime] = useState<string>('');
  const [subtaskInput, setSubtaskInput] = useState<string>('');
  const [subtasks, setSubtasks] = useState<{ title: string }[]>([]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    onAdd(title, description, groupId, time || undefined, subtasks);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-md bg-[#18181b] border border-zinc-800 rounded-2xl shadow-2xl overflow-hidden animate-in slide-in-from-bottom-4 fade-in zoom-in-95 duration-300">
        <div className="p-6">
          <div className="flex items-center justify-between mb-5">
            <h3 className="text-lg font-semibold text-white">New Task</h3>
            <button onClick={onCancel} className="text-zinc-500 hover:text-white transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="flex items-center gap-2 text-xs font-medium text-zinc-400 mb-1.5"><Type className="w-3 h-3" /> Task Title</label>
              <input
                type="text"
                autoFocus
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="What needs to be done?"
                className="w-full bg-zinc-900/50 border border-zinc-800 rounded-xl px-4 py-3 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
              />
            </div>

            <div>
              <label className="flex items-center gap-2 text-xs font-medium text-zinc-400 mb-1.5"><FileText className="w-3 h-3" /> Description (Optional)</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={2}
                placeholder="Add some details..."
                className="w-full bg-zinc-900/50 border border-zinc-800 rounded-xl px-4 py-3 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all resize-none"
              />
            </div>

            <div>
              <label className="flex items-center gap-2 text-xs font-medium text-zinc-400 mb-1.5"><Clock className="w-3 h-3" /> Time (Optional)</label>
              <TimePicker value={time} onChange={setTime} />
            </div>

            <div>
              <label className="flex items-center gap-2 text-xs font-medium text-zinc-400 mb-1.5"><ListChecks className="w-3 h-3" /> Subtasks</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={subtaskInput}
                  onChange={(e) => setSubtaskInput(e.target.value)}
                  placeholder="Add a subtask"
                  className="flex-1 bg-zinc-900/50 border border-zinc-800 rounded-xl px-4 py-3 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
                <button
                  type="button"
                  onClick={() => { if (subtaskInput.trim()) { setSubtasks(prev => [...prev, { title: subtaskInput.trim() }]); setSubtaskInput(''); } }}
                  className="px-3 py-2 rounded-xl bg-white text-black hover:bg-zinc-200 text-sm"
                >Add</button>
              </div>
              {subtasks.length > 0 && (
                <div className="mt-2 space-y-1">
                  {subtasks.map((st, i) => (
                    <div key={i} className="flex items-center justify-between text-xs text-zinc-300 bg-zinc-900/30 border border-zinc-800 rounded-lg px-3 py-2">
                      <span>{st.title}</span>
                      <button type="button" onClick={() => setSubtasks(prev => prev.filter((_, idx) => idx !== i))} className="text-zinc-500 hover:text-red-400">Remove</button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div>
              <label className="flex items-center gap-2 text-xs font-medium text-zinc-400 mb-1.5"><ListChecks className="w-3 h-3" /> Group</label>
              <div className="grid grid-cols-2 gap-2">
                {groups.map(group => (
                  <button
                    key={group.id}
                    type="button"
                    onClick={() => setGroupId(group.id)}
                    className={cn(
                      "px-3 py-2 rounded-lg text-sm font-medium transition-all border",
                      groupId === group.id
                        ? `bg-zinc-800 border-zinc-600 text-white`
                        : "bg-transparent border-zinc-800 text-zinc-500 hover:bg-zinc-900 hover:text-zinc-300"
                    )}
                  >
                    {group.name}
                  </button>
                ))}
              </div>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                className="w-full bg-primary hover:bg-primary/90 text-white font-medium py-3 rounded-xl transition-all active:scale-[0.98]"
              >
                Create Task
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};