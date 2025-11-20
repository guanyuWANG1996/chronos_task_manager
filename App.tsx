import React, { useState, useEffect } from 'react';
import { Calendar } from './components/Calendar';
import { TaskList } from './components/TaskList';
import { AddTaskForm } from './components/AddTaskForm';
import { AuthForm } from './components/AuthForm';
import { GROUPS, INITIAL_TASKS } from './constants';
import { Task } from './types';
import { Plus, Calendar as CalendarIcon, Layout, Github } from 'lucide-react';
import { formatDate } from './lib/utils';
import { generateSubtasks } from './services/geminiService';
import { getTodos, createTodo, toggleTodo, deleteTodo as apiDeleteTodo, getCalendar } from './services/api';

const App: React.FC = () => {
  // Initialize with today's date
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [tasks, setTasks] = useState<Task[]>(INITIAL_TASKS);
  const [allMonthTasks, setAllMonthTasks] = useState<Task[]>(INITIAL_TASKS);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [loadingAiId, setLoadingAiId] = useState<string | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [email, setEmail] = useState<string | null>(null);

  // Filter tasks for the selected date
  const dailyTasks = React.useMemo(() => {
    return tasks.filter(t => t.date === selectedDate);
  }, [tasks, selectedDate]);

  // Handlers
  const addTask = async (title: string, description: string, groupId: string) => {
    if (!token) return;
    const res = await createTodo({ title, description, date: selectedDate, groupId }, token);
    if (res.ok) {
      const t = res.data as any;
      const newTask: Task = { id: String(t.id), title: t.title, description: t.description, date: t.date, groupId: t.groupId, completed: t.completed, subtasks: [] };
      setTasks(prev => [newTask, ...prev]);
      setAllMonthTasks(prev => [newTask, ...prev]);
      setIsAddModalOpen(false);
    }
  };

  const toggleTask = async (id: string) => {
    if (!token) return;
    const res = await toggleTodo(id, token);
    if (res.ok) {
      setTasks(prev => prev.map(t => t.id === id ? { ...t, completed: !t.completed } : t));
      setAllMonthTasks(prev => prev.map(t => t.id === id ? { ...t, completed: !t.completed } : t));
    }
  };

  const deleteTask = async (id: string) => {
    if (!token) return;
    const res = await apiDeleteTodo(id, token);
    if (res.ok) {
      setTasks(prev => prev.filter(t => t.id !== id));
      setAllMonthTasks(prev => prev.filter(t => t.id !== id));
    }
  };

  const handleAiSubtasks = async (taskId: string) => {
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;

    setLoadingAiId(taskId);
    
    try {
      const subtasksData = await generateSubtasks(task.title);
      const newSubtasks = subtasksData.map((st, idx) => ({
        id: `${taskId}-sub-${idx}`,
        title: st.title,
        completed: false
      }));

      setTasks(prev => prev.map(t => 
        t.id === taskId ? { ...t, subtasks: [...(t.subtasks || []), ...newSubtasks] } : t
      ));
    } catch (e) {
      console.error("Failed to generate subtasks", e);
    } finally {
      setLoadingAiId(null);
    }
  };

  useEffect(() => {
    const saved = localStorage.getItem('chronos_token');
    const savedEmail = localStorage.getItem('chronos_email');
    if (saved) {
      setToken(saved);
      setEmail(savedEmail);
    }
  }, []);

  useEffect(() => {
    if (!token) return;
    (async () => {
      const tasksRes = await getTodos(selectedDate, token);
      if (tasksRes.ok) {
        const list = (tasksRes.data as any[]).map(t => ({ id: String(t.id), title: t.title, description: t.description, date: t.date, groupId: t.groupId, completed: t.completed } as Task));
        setTasks(list);
      }
    })();
  }, [selectedDate, token]);

  useEffect(() => {
    if (!token) return;
    const month = selectedDate.slice(0, 7);
    (async () => {
      const res = await getCalendar(month, token);
      if (res.ok) {
        const days = (res.data as any[]) as { date: string; hasTasks: boolean; pending: number; completed: number }[];
        const placeholders: Task[] = [];
        for (const d of days) {
          if (d.hasTasks) {
            placeholders.push({ id: `${d.date}-placeholder`, title: '', date: d.date, groupId: 'personal', completed: d.completed > d.pending });
          }
        }
        setAllMonthTasks(placeholders);
      }
    })();
  }, [token, selectedDate]);

  const onAuthenticated = (tok: string, em: string) => {
    setToken(tok);
    setEmail(em);
    localStorage.setItem('chronos_token', tok);
    localStorage.setItem('chronos_email', em);
  };

  // Stats for Progress Bar
  const total = dailyTasks.length;
  const completed = dailyTasks.filter(t => t.completed).length;
  const progress = total === 0 ? 0 : (completed / total) * 100;

  if (!token) {
    return <AuthForm onAuthenticated={onAuthenticated} />;
  }
  return (
    <div className="min-h-screen bg-background text-foreground font-sans selection:bg-primary/30">
      
      {/* Mobile Header / Top Nav */}
      <header className="sticky top-0 z-40 border-b border-white/10 bg-background/80 backdrop-blur-xl">
        <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center text-white shadow-lg shadow-primary/20">
              <CalendarIcon className="w-5 h-5" />
            </div>
            <h1 className="font-bold text-lg tracking-tight">Chronos</h1>
          </div>
          
          <div className="flex items-center gap-4">
            <button className="text-sm text-zinc-400 hover:text-white transition-colors hidden sm:block">
              Today
            </button>
             <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-blue-500"></div>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* Left Column: Calendar & Summary */}
          <div className="lg:col-span-4 space-y-6">
            <Calendar 
              selectedDate={selectedDate} 
              onSelectDate={setSelectedDate} 
              tasks={allMonthTasks}
            />
            
            {/* Mini Stats Card */}
            <div className="p-5 rounded-2xl bg-secondary/30 border border-white/5">
              <h3 className="text-sm font-medium text-zinc-400 mb-4">Daily Progress</h3>
              <div className="flex items-end gap-2 mb-2">
                 <span className="text-3xl font-bold text-white">{Math.round(progress)}%</span>
                 <span className="text-sm text-zinc-500 mb-1">completed</span>
              </div>
              <div className="h-2 w-full bg-zinc-800 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-primary transition-all duration-500 ease-out"
                  style={{ width: `${progress}%` }}
                ></div>
              </div>
              <p className="text-xs text-zinc-500 mt-3">
                {completed} of {total} tasks finished
              </p>
            </div>
          </div>

          {/* Right Column: Task List */}
          <div className="lg:col-span-8">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-2xl font-bold text-white">{formatDate(selectedDate)}</h2>
                <p className="text-zinc-400 text-sm mt-1">
                  {dailyTasks.length === 0 
                    ? "No tasks scheduled for today." 
                    : `You have ${dailyTasks.length - completed} pending tasks.`}
                </p>
              </div>
              
              <button 
                onClick={() => setIsAddModalOpen(true)}
                className="flex items-center gap-2 bg-white text-black hover:bg-zinc-200 px-4 py-2.5 rounded-xl font-semibold text-sm transition-all active:scale-95 shadow-lg shadow-white/5"
              >
                <Plus className="w-4 h-4" />
                Add Task
              </button>
            </div>

            <TaskList 
              tasks={dailyTasks}
              groups={GROUPS}
              onToggleTask={toggleTask}
              onDeleteTask={deleteTask}
              onAddSubtasks={handleAiSubtasks}
              loadingAiId={loadingAiId}
            />
          </div>
        </div>
      </main>

      {/* Modals */}
      {isAddModalOpen && (
        <AddTaskForm 
          selectedDate={selectedDate} 
          groups={GROUPS}
          onAdd={addTask}
          onCancel={() => setIsAddModalOpen(false)}
        />
      )}
    </div>
  );
};

export default App;