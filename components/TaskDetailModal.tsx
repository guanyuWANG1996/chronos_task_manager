import React, { useState } from 'react';
import { Task } from '../types';

interface TaskDetailModalProps {
  task: Task;
  onClose: () => void;
  onSave: (updates: Partial<Task>) => void;
}

export const TaskDetailModal: React.FC<TaskDetailModalProps> = ({ task, onClose, onSave }) => {
  const [title, setTitle] = useState(task.title);
  const [description, setDescription] = useState(task.description || '');
  const [time, setTime] = useState(task.time || '');

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({ id: task.id, title, description, time });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60">
      <div className="w-full max-w-md bg-[#18181b] border border-zinc-800 rounded-2xl p-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold text-white">Edit Task</h3>
          <button onClick={onClose} className="text-zinc-400 hover:text-white">Close</button>
        </div>
        <form onSubmit={submit} className="space-y-4">
          <input value={title} onChange={(e)=>setTitle(e.target.value)} className="w-full bg-zinc-900/50 border border-zinc-800 rounded-xl px-4 py-3 text-sm text-white" />
          <textarea value={description} onChange={(e)=>setDescription(e.target.value)} rows={3} className="w-full bg-zinc-900/50 border border-zinc-800 rounded-xl px-4 py-3 text-sm text-white" />
          <input type="time" value={time} onChange={(e)=>setTime(e.target.value)} className="w-full bg-zinc-900/50 border border-zinc-800 rounded-xl px-4 py-3 text-sm text-white" />
          <button type="submit" className="w-full bg-white text-black py-3 rounded-xl">Save</button>
        </form>
      </div>
    </div>
  );
};