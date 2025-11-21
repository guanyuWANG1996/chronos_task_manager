export const generateSubtasks = async (taskTitle: string): Promise<{ title: string }[]> => {
  return []
}

export interface ParsedTask {
  title: string
  description?: string
  date: string
  time?: string
  groupId?: string
  subtasks?: { title: string }[]
}

export const parseTaskCommand = async (input: string, defaults: { date: string; groupId?: string }): Promise<ParsedTask> => {
  console.log('ai parse request:', { input, defaults })
  const resp = await fetch('/api/ai/parse', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text: input, defaults })
  })
  let data: any = null
  try { data = await resp.json() } catch (e: any) { console.log('ai parse response json error:', e?.message || String(e)) }
  console.log('ai parse response:', { status: resp.status, ok: resp.ok, data })
  if (!resp.ok) throw new Error(data?.error || `HTTP ${resp.status}`)
  return data?.data as ParsedTask
}