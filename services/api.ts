export interface AuthResult {
  ok: boolean;
  token?: string;
  error?: string;
}

const json = (resp: Response) => resp.json();

export async function register(email: string, password: string) {
  const res = await fetch('/api/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  });
  let data: any = null;
  try { data = await res.json(); } catch {}
  if (!res.ok) return { ok: false, error: data?.error || `HTTP ${res.status}` };
  return data;
}

export async function login(email: string, password: string): Promise<AuthResult> {
  const res = await fetch('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  });
  let data: any = null;
  try { data = await res.json(); } catch {}
  if (!res.ok) return { ok: false, error: data?.error || `HTTP ${res.status}` };
  return data as AuthResult;
}

function authHeaders(token: string) {
  return { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' };
}

export async function getTodos(date: string, token: string) {
  const res = await fetch(`/api/todos?date=${encodeURIComponent(date)}`, {
    headers: authHeaders(token)
  });
  let data: any = null;
  try { data = await res.json(); } catch {}
  if (!res.ok) return { ok: false, error: data?.error || `HTTP ${res.status}` };
  return data;
}

export async function createTodo(payload: { title: string; description?: string; date: string; time?: string; groupId: string; subtasks?: { title: string; completed?: boolean }[] }, token: string) {
  const res = await fetch('/api/todos', {
    method: 'POST',
    headers: authHeaders(token),
    body: JSON.stringify(payload)
  });
  let data: any = null;
  try { data = await res.json(); } catch {}
  if (!res.ok) return { ok: false, error: data?.error || `HTTP ${res.status}` };
  return data;
}

export async function toggleTodo(id: string, token: string) {
  const res = await fetch('/api/todos', {
    method: 'PATCH',
    headers: authHeaders(token),
    body: JSON.stringify({ id })
  });
  let data: any = null;
  try { data = await res.json(); } catch {}
  if (!res.ok) return { ok: false, error: data?.error || `HTTP ${res.status}` };
  return data;
}

export async function deleteTodo(id: string, token: string) {
  const res = await fetch(`/api/todos?id=${encodeURIComponent(id)}`, {
    method: 'DELETE',
    headers: authHeaders(token)
  });
  let data: any = null;
  try { data = await res.json(); } catch {}
  if (!res.ok) return { ok: false, error: data?.error || `HTTP ${res.status}` };
  return data;
}

export async function getCalendar(month: string, token: string) {
  const res = await fetch(`/api/calendar?month=${encodeURIComponent(month)}`, {
    headers: authHeaders(token)
  });
  let data: any = null;
  try { data = await res.json(); } catch {}
  if (!res.ok) return { ok: false, error: data?.error || `HTTP ${res.status}` };
  return data;
}
export async function updateTodo(payload: { id: string; title?: string; description?: string; date?: string; time?: string; groupId?: string }, token: string) {
  const res = await fetch('/api/todos', {
    method: 'PUT',
    headers: authHeaders(token),
    body: JSON.stringify(payload)
  });
  let data: any = null;
  try { data = await res.json(); } catch {}
  if (!res.ok) return { ok: false, error: data?.error || `HTTP ${res.status}` };
  return data;
}

export async function toggleSubtask(id: string, token: string) {
  const res = await fetch('/api/subtasks', {
    method: 'PATCH',
    headers: authHeaders(token),
    body: JSON.stringify({ id })
  });
  let data: any = null;
  try { data = await res.json(); } catch {}
  if (!res.ok) return { ok: false, error: data?.error || `HTTP ${res.status}` };
  return data;
}

export async function addSubtask(todoId: string, title: string, token: string) {
  const res = await fetch('/api/subtasks', {
    method: 'POST',
    headers: authHeaders(token),
    body: JSON.stringify({ todoId, title })
  });
  let data: any = null;
  try { data = await res.json(); } catch {}
  if (!res.ok) return { ok: false, error: data?.error || `HTTP ${res.status}` };
  return data;
}

export async function deleteSubtask(id: string, token: string) {
  const res = await fetch('/api/subtasks', {
    method: 'DELETE',
    headers: authHeaders(token),
    body: JSON.stringify({ id })
  });
  let data: any = null;
  try { data = await res.json(); } catch {}
  if (!res.ok) return { ok: false, error: data?.error || `HTTP ${res.status}` };
  return data;
}

export async function updateSubtask(id: string, title: string, token: string) {
  const res = await fetch('/api/subtasks', {
    method: 'PUT',
    headers: authHeaders(token),
    body: JSON.stringify({ id, title })
  });
  let data: any = null;
  try { data = await res.json(); } catch {}
  if (!res.ok) return { ok: false, error: data?.error || `HTTP ${res.status}` };
  return data;
}
