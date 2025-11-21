import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Task, Group } from '../types';
import { Check, Trash2, ChevronDown, ChevronRight, MoreHorizontal, Sparkles } from 'lucide-react';
import { cn } from '../lib/utils';

interface TaskListProps {
  tasks: Task[];
  groups: Group[];
  onToggleTask: (taskId: string) => void;
  onDeleteTask: (taskId: string) => void;
  onAddSubtasks: (taskId: string) => void;
  onToggleSubtask?: (taskId: string, subtaskId: string) => void;
  onAddSubtask?: (taskId: string, title: string) => void;
  loadingAiId: string | null;
}

export const TaskList: React.FC<TaskListProps> = ({ 
  tasks, 
  groups, 
  onToggleTask, 
  onDeleteTask,
  onAddSubtasks,
  onToggleSubtask,
  onAddSubtask,
  loadingAiId
}) => {
  
  // Group tasks by their groupId
  const groupedTasks = React.useMemo(() => {
    const grouped: Record<string, Task[]> = {};
    groups.forEach(g => grouped[g.id] = []);
    tasks.forEach(task => {
      if (grouped[task.groupId]) {
        grouped[task.groupId].push(task);
      }
    });
    return grouped;
  }, [tasks, groups]);

  if (tasks.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
        <Sparkles className="w-12 h-12 mb-4 opacity-20" />
        <p>No tasks for this day. Enjoy your free time!</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-20">
      {groups.map(group => {
        const groupTasks = groupedTasks[group.id];
        if (groupTasks.length === 0) return null;

        return (
          <div key={group.id} className="space-y-3">
            <h3 className={cn("text-sm font-semibold uppercase tracking-wider flex items-center gap-2", group.color)}>
              <span className="w-2 h-2 rounded-full bg-current opacity-50"></span>
              {group.name}
              <span className="text-xs opacity-50 ml-auto">{groupTasks.length}</span>
            </h3>
            
            <AnimatePresence mode='popLayout'>
              {groupTasks.map(task => (
                <TaskItem 
                  key={task.id} 
                  task={task} 
                  group={group}
                  onToggle={() => onToggleTask(task.id)}
                  onDelete={() => onDeleteTask(task.id)}
                  onAiAssist={() => onAddSubtasks(task.id)}
                  isAiLoading={loadingAiId === task.id}
                  onToggleSubtask={(sid) => onToggleSubtask && onToggleSubtask(task.id, sid)}
                  onAddSubtask={(title) => onAddSubtask && onAddSubtask(task.id, title)}
                />
              ))}
            </AnimatePresence>
          </div>
        );
      })}
    </div>
  );
};

interface TaskItemProps {
  task: Task;
  group: Group;
  onToggle: () => void;
  onDelete: () => void;
  onAiAssist: () => void;
  isAiLoading: boolean;
  onToggleSubtask?: (id: string) => void;
  onAddSubtask?: (title: string) => void;
}

const TaskItem: React.FC<TaskItemProps> = ({ task, group, onToggle, onDelete, onAiAssist, isAiLoading, onToggleSubtask, onAddSubtask }) => {
  const [expanded, setExpanded] = React.useState(false);
  const [newSubtask, setNewSubtask] = React.useState('');

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className={cn(
        "group relative bg-secondary/40 hover:bg-secondary/60 border border-transparent hover:border-white/5 rounded-xl p-4 transition-all duration-200",
        task.completed && "opacity-60"
      )}
    >
      <div className="flex items-start gap-3">
        {/* Checkbox */}
        <button
          onClick={(e) => { e.stopPropagation(); onToggle(); }}
          className={cn(
            "mt-1 w-5 h-5 rounded-full border flex items-center justify-center transition-colors duration-200 shrink-0",
            task.completed 
              ? `bg-emerald-500 border-emerald-500 text-white` 
              : "border-zinc-600 hover:border-zinc-400"
          )}
        >
          {task.completed && <Check className="w-3 h-3" />}
        </button>

        {/* Content */}
        <div className="flex-1 min-w-0 cursor-pointer" onClick={() => setExpanded(!expanded)}>
          <div className="flex items-center justify-between">
            <span className={cn(
              "text-sm font-medium truncate transition-all",
              task.completed && "line-through text-muted-foreground"
            )}>
              {task.title}
            </span>
            {task.time && <span className="text-xs text-zinc-500 ml-2">{task.time}</span>}
          </div>
          
          {task.description && (
            <p className="text-xs text-muted-foreground mt-1 line-clamp-1">{task.description}</p>
          )}
          {task.time && (
            <p className="text-xs text-zinc-400 mt-1">{task.time}</p>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          {!task.completed && (
            <button 
               onClick={(e) => { e.stopPropagation(); onAiAssist(); }}
               disabled={isAiLoading}
               className={cn("p-1.5 rounded-md hover:bg-zinc-700 text-zinc-400 hover:text-purple-400 transition-colors", isAiLoading && "animate-pulse text-purple-400")}
               title="Generate Subtasks with AI"
            >
              <Sparkles className="w-4 h-4" />
            </button>
          )}
          <button 
             onClick={(e) => { e.stopPropagation(); onDelete(); }}
             className="p-1.5 rounded-md hover:bg-red-500/10 text-zinc-400 hover:text-red-400 transition-colors"
          >
            <Trash2 className="w-4 h-4" />
          </button>
          <button 
             onClick={(e) => { e.stopPropagation(); setExpanded(true); }}
             className="p-1.5 rounded-md hover:bg-zinc-700 text-zinc-400 hover:text-white transition-colors"
          >
            <ChevronDown className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Subtasks / AI Expansion */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="mt-3 pl-8 space-y-2 overflow-hidden"
          >
             <div className="w-full h-px bg-white/5 mb-2"></div>
             {(task.subtasks || []).map((st) => (
               <div key={st.id} className="flex items-center gap-2 text-xs text-zinc-400">
                 <button onClick={(e) => { e.stopPropagation(); onToggleSubtask && onToggleSubtask(st.id); }} className={cn("w-4 h-4 rounded-full border flex items-center justify-center", st.completed ? "bg-emerald-500 border-emerald-500" : "border-zinc-600")}></button>
                 <span className={cn(st.completed && "line-through text-zinc-500")}>{st.title}</span>
               </div>
             ))}
             <div className="flex items-center gap-2 mt-2">
               <input value={newSubtask} onChange={(e)=>setNewSubtask(e.target.value)} placeholder="Add subtask" className="flex-1 bg-zinc-900/50 border border-zinc-800 rounded-lg px-2 py-1 text-xs text-white" />
               <button onClick={(e)=>{ e.stopPropagation(); if(newSubtask.trim()){ onAddSubtask && onAddSubtask(newSubtask.trim()); setNewSubtask(''); }}} className="text-xs px-2 py-1 rounded bg-white text-black">Add</button>
             </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};