export interface AuthResult {
  ok: boolean;
  token?: string;
  error?: string;
}

const json = (resp: Response) => resp.json();

export async function register(email: string, password: string) {
  const res = await fetch('/api/auth/register/main', {
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
  const res = await fetch('/api/auth/login/main', {
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
  const res = await fetch(`/api/todos/main?date=${encodeURIComponent(date)}`, {
    headers: authHeaders(token)
  });
  let data: any = null;
  try { data = await res.json(); } catch {}
  if (!res.ok) return { ok: false, error: data?.error || `HTTP ${res.status}` };
  return data;
}

export async function createTodo(payload: { title: string; description?: string; date: string; groupId: string }, token: string) {
  const res = await fetch('/api/todos/main', {
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
  const res = await fetch('/api/todos/main', {
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
  const res = await fetch(`/api/todos/main?id=${encodeURIComponent(id)}`, {
    method: 'DELETE',
    headers: authHeaders(token)
  });
  let data: any = null;
  try { data = await res.json(); } catch {}
  if (!res.ok) return { ok: false, error: data?.error || `HTTP ${res.status}` };
  return data;
}

export async function getCalendar(month: string, token: string) {
  const res = await fetch(`/api/calendar/main?month=${encodeURIComponent(month)}`, {
    headers: authHeaders(token)
  });
  let data: any = null;
  try { data = await res.json(); } catch {}
  if (!res.ok) return { ok: false, error: data?.error || `HTTP ${res.status}` };
  return data;
}