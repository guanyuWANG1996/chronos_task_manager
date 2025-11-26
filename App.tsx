import React, { useState, useEffect } from 'react';
import { Calendar } from './components/Calendar';
import { TaskList } from './components/TaskList';
import { AddTaskForm } from './components/AddTaskForm';
import { AuthForm } from './components/AuthForm';
import { TaskDetailModal } from './components/TaskDetailModal';
import { Toast } from './components/Toast';
import { GROUPS, INITIAL_TASKS } from './constants';
import { Task } from './types';
import { Plus, Calendar as CalendarIcon, Layout, Github } from 'lucide-react';
import { formatDate, todayYMD } from './lib/utils';
// remove ai parse; use streaming chat
import { SmartTaskInput } from './components/SmartTaskInput';
 
import { getTodos, createTodo, toggleTodo, deleteTodo as apiDeleteTodo, getCalendar, toggleSubtask, updateTodo, addSubtask, deleteSubtask, updateSubtask } from './services/api';

const App: React.FC = () => {
  // Initialize with today's date
  const [selectedDate, setSelectedDate] = useState<string>(todayYMD());
  const [tasks, setTasks] = useState<Task[]>([]);
  const [allMonthTasks, setAllMonthTasks] = useState<Task[]>([]);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [toast, setToast] = useState<string>('');
  const [loadingAiId, setLoadingAiId] = useState<string | null>(null);
  const [aiStreaming, setAiStreaming] = useState<boolean>(false);
  const [smartCreating, setSmartCreating] = useState<boolean>(false);
  const [token, setToken] = useState<string | null>(null);
  const [email, setEmail] = useState<string | null>(null);
  const [profileOpen, setProfileOpen] = useState(false);

  // Filter tasks for the selected date
  const dailyTasks = React.useMemo(() => {
    const list = tasks.filter(t => t.date === selectedDate);
    const parseMinutes = (s?: string) => {
      const m = /^([0-1]\d|2[0-3]):([0-5]\d)$/.exec(String(s || ''));
      return m ? parseInt(m[1], 10) * 60 + parseInt(m[2], 10) : null;
    };
    return list.slice().sort((a, b) => {
      const ta = parseMinutes(a.time);
      const tb = parseMinutes(b.time);
      if (ta !== null && tb !== null) return ta - tb;
      if (ta !== null && tb === null) return -1;
      if (ta === null && tb !== null) return 1;
      const ai = Number(a.id) || 0;
      const bi = Number(b.id) || 0;
      return bi - ai;
    });
  }, [tasks, selectedDate]);

  // Handlers
  const addTask = async (title: string, description: string, groupId: string, time?: string, subtasks?: { title: string }[], dateOverride?: string) => {
    if (!token) return;
    const payload = { title, description, date: dateOverride || selectedDate, time, groupId, subtasks } as { title: string; description?: string; date: string; time?: string; groupId: string; subtasks?: { title: string }[] };
    console.log('addTask payload', payload);
    const res = await createTodo(payload, token);
    if (res.ok) {
      const t = res.data as any;
      const newTask: Task = { id: String(t.id), title: t.title, description: t.description, date: t.date, time: t.time, groupId: t.groupId, completed: t.completed, subtasks: t.subtasks?.map((st:any)=>({ id: String(st.id), title: st.title, completed: st.completed })) || [] };
      setTasks(prev => [newTask, ...prev]);
      setAllMonthTasks(prev => [newTask, ...prev]);
      setIsAddModalOpen(false);
    } else {
      setToast(res.error || 'Create task failed');
    }
  };

  const toggleTask = async (id: string) => {
    if (!token) return;
    const res = await toggleTodo(id, token);
    if (res.ok) {
      setTasks(prev => prev.map(t => t.id === id ? { ...t, completed: !t.completed } : t));
      setAllMonthTasks(prev => prev.map(t => t.id === id ? { ...t, completed: !t.completed } : t));
    } else { setToast(res.error || 'Toggle task failed'); }
  };

  const deleteTask = async (id: string) => {
    if (!token) return;
    const res = await apiDeleteTodo(id, token);
    if (res.ok) {
      setTasks(prev => prev.filter(t => t.id !== id));
      setAllMonthTasks(prev => prev.filter(t => t.id !== id));
    } else { setToast(res.error || 'Delete task failed'); }
  };

const askAi = async (text: string) => {
  setAiStreaming(true);
  try {
    const resp = await fetch('/api/ai/ask', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      // 新增传递 selectedDate（当前选中日期）
      body: JSON.stringify({ 
        text, 
        referenceDate: todayYMD()  // 格式：YYYY-MM-DD，作为相对时间的基准
      })
    });
    let data: any = null;
    try { data = await resp.json(); } catch {}
    if (!resp.ok || !data?.ok) throw new Error(data?.error || `HTTP ${resp.status}`);
    
    // 解析 AI 返回的任务数据并自动创建任务（后续步骤见 2.）
    let taskData;
    try {
      taskData = JSON.parse(data.data);
    } catch (e) {
      setToast('AI 响应格式错误，无法创建任务');
      setToast(String(data.data));
      return;
    }

    // 验证并处理任务数据（补充之前实现的子任务状态、分组校验等逻辑）
    if (!taskData.title) {
      setToast('未解析到任务标题');
      setToast(JSON.stringify(taskData, null, 2));
      return;
    }

    // 处理子任务：强制 completed 为 false
    const processedSubtasks = (taskData.subtasks || []).map((st: any) => ({
      title: st.title || '',
      completed: false
    }));

    // 验证 groupId 合法性
    const validGroups = ['personal', 'work', 'learning', 'health'];
    const finalGroupId = validGroups.includes(taskData.groupId) 
      ? taskData.groupId 
      : 'personal';

    // 使用 AI 返回的日期（若未返回则使用参考日期）
    const finalDate = taskData.date || selectedDate;
    console.log('askAi parsed', { taskData, selectedDate, finalDate });

    // 自动创建任务
    await addTask(
      taskData.title,
      taskData.description || '',
      finalGroupId,
      taskData.time,
      processedSubtasks,
      finalDate
    );

    setToast(`已创建任务：${taskData.title}｜日期：${finalDate}｜时间：${taskData.time || '未设置'}｜分组：${finalGroupId}`);

    } catch (e: any) {
      setToast(e?.message || 'AI 请求失败');
    } finally {
      setAiStreaming(false);
    }
  };

  const cancelAi = () => { /* no-op after removing stream */ }

  const toggleSubtaskLocal = async (taskId: string, subtaskId: string) => {
    if (!token) return;
    try {
      const res = await toggleSubtask(subtaskId, token);
      if (res.ok) {
        setTasks(prev => prev.map(t => t.id === taskId ? { ...t, subtasks: (t.subtasks||[]).map(st => st.id === subtaskId ? { ...st, completed: !st.completed } : st) } : t));
        setEditingTask(prev => prev && prev.id === taskId ? { ...prev, subtasks: (prev.subtasks||[]).map(st => st.id === subtaskId ? { ...st, completed: !st.completed } : st) } : prev);
      } else { setToast(res.error || 'Toggle subtask failed'); }
    } catch (e:any) { setToast(e?.message || 'Toggle subtask error'); }
  };

  const addSubtaskLocal = async (taskId: string, title: string) => {
    if (!token) return;
    try {
      const res = await addSubtask(taskId, title, token);
      if (res.ok) {
        const st = res.data as any;
        const newSt = { id: String(st?.id ?? st?.data?.id ?? Date.now()), title: String(st?.title ?? st?.data?.title ?? title), completed: false };
        setTasks(prev => prev.map(t => t.id === taskId ? { ...t, subtasks: [...(t.subtasks||[]), newSt] } : t));
        setEditingTask(prev => prev && prev.id === taskId ? { ...prev, subtasks: [...(prev.subtasks||[]), newSt] } : prev);
      } else { setToast(res.error || 'Add subtask failed'); }
    } catch (e:any) { setToast(e?.message || 'Add subtask error'); }
  };

  const deleteSubtaskLocal = async (taskId: string, subtaskId: string) => {
    if (!token) return;
    try {
      const res = await deleteSubtask(subtaskId, token);
      if (res.ok) {
        setTasks(prev => prev.map(t => t.id === taskId ? { ...t, subtasks: (t.subtasks||[]).filter(st => st.id !== subtaskId) } : t));
        setEditingTask(prev => prev && prev.id === taskId ? { ...prev, subtasks: (prev.subtasks||[]).filter(st => st.id !== subtaskId) } : prev);
      } else { setToast(res.error || 'Delete subtask failed'); }
    } catch (e:any) { setToast(e?.message || 'Delete subtask error'); }
  };

  const updateSubtaskLocal = async (taskId: string, subtaskId: string, title: string) => {
    if (!token) return;
    try {
      const res = await updateSubtask(subtaskId, title, token);
      if (res.ok) {
        setTasks(prev => prev.map(t => t.id === taskId ? { ...t, subtasks: (t.subtasks||[]).map(st => st.id === subtaskId ? { ...st, title } : st) } : t));
        setEditingTask(prev => prev && prev.id === taskId ? { ...prev, subtasks: (prev.subtasks||[]).map(st => st.id === subtaskId ? { ...st, title } : st) } : prev);
      } else { setToast(res.error || 'Update subtask failed'); }
    } catch (e:any) { setToast(e?.message || 'Update subtask error'); }
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
        const list = (tasksRes.data as any[]).map(t => ({ 
          id: String(t.id), 
          title: t.title, 
          description: t.description, 
          date: t.date, 
          time: t.time,
          groupId: t.groupId, 
          completed: t.completed,
          subtasks: (t.subtasks || []).map((st:any) => ({ id: String(st.id), title: st.title, completed: !!st.completed }))
        } as Task));
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

  const logout = () => {
    localStorage.removeItem('chronos_token');
    localStorage.removeItem('chronos_email');
    setToken(null);
    setEmail(null);
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
          
          <div className="flex items-center gap-4 relative">
            <span className="text-sm text-zinc-400 hidden sm:block">
              {(email || '').split('@')[0] || 'Guest'}
            </span>
            <button onClick={() => setProfileOpen(v => !v)} className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-blue-500"></button>
            {profileOpen && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setProfileOpen(false)}></div>
                <div className="absolute right-0 top-10 z-20 w-40 bg-[#18181b] border border-zinc-800 rounded-xl shadow-xl py-2">
                  <div className="px-3 py-2 text-xs text-zinc-400">{email || ''}</div>
                  <button onClick={() => { setProfileOpen(false); logout(); }} className="w-full text-left px-3 py-2 text-sm text-white hover:bg-zinc-800">Log out</button>
                </div>
              </>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-8">
        <SmartTaskInput onSubmit={askAi} loading={aiStreaming} />
        
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
              <div className="flex-1">
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
              onToggleSubtask={(taskId, subtaskId) => toggleSubtaskLocal(taskId, subtaskId)}
              onAddSubtask={(taskId, title) => { /* 添加子任务移动到编辑弹窗 */ }}
              onOpenEdit={(task) => setEditingTask(task)}
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
      {editingTask && (
        <TaskDetailModal 
          task={editingTask}
          groups={GROUPS}
          onClose={() => setEditingTask(null)}
          onSave={async (u) => {
            if (!token || !editingTask) return;
            const res = await updateTodo({ id: editingTask.id, title: u.title, description: u.description, time: u.time, groupId: u.groupId }, token);
            if (!res.ok) { setToast(res.error || 'Update task failed'); return; }

            const before: import('./types').SubTask[] = editingTask.subtasks || [];
            const after: import('./types').SubTask[] = (u.subtasks ?? before);
            const beforeMap = new Map<string, import('./types').SubTask>(before.map(st => [st.id, st]));
            const afterMap = new Map<string, import('./types').SubTask>(after.map(st => [st.id, st]));

            for (const st of before) {
              if (!afterMap.has(st.id)) {
                try { await deleteSubtask(st.id, token); } catch (e:any) { setToast(e?.message || 'Delete subtask error'); }
              }
            }
            for (const st of after) {
              const prev = beforeMap.get(st.id);
              if (prev && prev.title !== st.title) {
                try { await updateSubtask(st.id, st.title, token); } catch (e:any) { setToast(e?.message || 'Update subtask error'); }
              }
            }

            setTasks(prev => prev.map(t => t.id === editingTask.id ? { ...t, title: u.title ?? t.title, description: u.description ?? t.description, time: u.time ?? t.time, groupId: u.groupId ?? t.groupId, subtasks: after } : t));
            setEditingTask(null);
          }}
          onToggleSubtask={(sid) => { if (!editingTask) return; toggleSubtaskLocal(editingTask.id, sid) }}
          onAddSubtask={(title) => { if (!editingTask) return; addSubtaskLocal(editingTask.id, title) }}
        />
      )}
      {toast && <Toast message={toast} onClose={() => setToast('')} />}
    </div>
  );
};

export default App;
