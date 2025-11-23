import OpenAI from 'openai'

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    res.status(405).json({ ok: false, error: 'method not allowed' })
    return
  }
  let body: any = req.body
  if (!body || typeof body !== 'object') {
    try { body = JSON.parse(req.body || '{}') } catch { body = {} }
  }
  const text = String(body?.text ?? '')
  const model = String(body?.model ?? 'gpt-4o-mini')
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) {
    res.status(500).json({ ok: false, error: 'missing OPENAI_API_KEY' })
    return
  }
  if (!text) {
    res.status(400).json({ ok: false, error: 'text is required' })
    return
  }
  const client = new OpenAI({ apiKey })
  try {
    const completion = await client.chat.completions.create({
      model,
      messages: [{ role: 'user', content: text }],
    })
    res.status(200).json({ ok: true, data: completion })
  } catch (err: any) {
    const message = err?.message || 'openai request failed'
    res.status(502).json({ ok: false, error: message })
  }
}