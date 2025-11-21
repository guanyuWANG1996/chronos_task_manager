import React, { useState } from 'react';
import { Task } from '../types';
import { TimePicker } from './TimePicker';
import { cn } from '../lib/utils';
import { X, Type, FileText, Clock, ListChecks, Check } from 'lucide-react';
import { Group } from '../types';

interface TaskDetailModalProps {
  task: Task;
  groups: Group[];
  onClose: () => void;
  onSave: (updates: Partial<Task>) => void;
  onToggleSubtask?: (id: string) => void;
  onAddSubtask?: (title: string) => void;
}

export const TaskDetailModal: React.FC<TaskDetailModalProps> = ({ task, groups, onClose, onSave, onToggleSubtask, onAddSubtask }) => {
  const [title, setTitle] = useState(task.title);
  const [description, setDescription] = useState(task.description || '');
  const [time, setTime] = useState(task.time || '');
  const [newSubtask, setNewSubtask] = useState('');
  const [groupId, setGroupId] = useState<string>(task.groupId);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({ id: task.id, title, description, time, groupId });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60">
      <div className="w-full max-w-md bg-[#18181b] border border-zinc-800 rounded-2xl p-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold text-white">Edit Task</h3>
          <button onClick={onClose} className="text-zinc-400 hover:text-white"><X className="w-5 h-5" /></button>
        </div>
        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="flex items-center gap-2 text-xs font-medium text-zinc-400 mb-1.5"><Type className="w-3 h-3" /> Task Title</label>
            <input value={title} onChange={(e)=>setTitle(e.target.value)} className="w-full bg-zinc-900/50 border border-zinc-800 rounded-xl px-4 py-3 text-sm text-white" />
          </div>
          <div>
            <label className="flex items-center gap-2 text-xs font-medium text-zinc-400 mb-1.5"><FileText className="w-3 h-3" /> Description</label>
            <textarea value={description} onChange={(e)=>setDescription(e.target.value)} rows={3} className="w-full bg-zinc-900/50 border border-zinc-800 rounded-xl px-4 py-3 text-sm text-white" />
          </div>
          <div>
            <label className="flex items-center gap-2 text-xs font-medium text-zinc-400 mb-1.5"><Clock className="w-3 h-3" /> Time</label>
            <TimePicker value={time} onChange={setTime} />
          </div>
          <div>
            <label className="flex items-center gap-2 text-xs font-medium text-zinc-400 mb-1.5"><ListChecks className="w-3 h-3" /> Subtasks</label>
            <div className="space-y-2">
              {(task.subtasks || []).map(st => (
                <div key={st.id} className="flex items-center gap-2 text-xs text-zinc-400">
                  <button type="button" onClick={() => onToggleSubtask && onToggleSubtask(st.id)} className={cn("w-4 h-4 rounded-full border flex items-center justify-center", st.completed ? "bg-emerald-500 border-emerald-500 text-white" : "border-zinc-600")}>{st.completed && <Check className="w-3 h-3" />}</button>
                  <span className={cn(st.completed && "line-through text-zinc-500")}>{st.title}</span>
                </div>
              ))}
              <div className="flex gap-2">
                <input value={newSubtask} onChange={(e)=>setNewSubtask(e.target.value)} placeholder="Add a subtask" className="flex-1 bg-zinc-900/50 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white" />
                <button type="button" onClick={() => { if (newSubtask.trim()) { onAddSubtask && onAddSubtask(newSubtask.trim()); setNewSubtask('') } }} className="px-3 py-2 rounded-xl bg-white text-black text-sm">Add</button>
              </div>
            </div>
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
          <button type="submit" className="w-full bg-white text-black py-3 rounded-xl">Save</button>
        </form>
      </div>
    </div>
  );
};