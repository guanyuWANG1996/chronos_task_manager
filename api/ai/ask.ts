export default async function handler(req: any, res: any) {
  console.log('askAi handler invoked', { method: req.method, url: req.url })
  if (req.method !== 'POST') {
    res.status(405).json({ ok: false, error: 'method not allowed' })
    return
  }
  let body: any = req.body
  if (!body || typeof body !== 'object') {
    try { body = JSON.parse(req.body || '{}') } catch { body = {} }
  }
  const text = String(body?.text ?? '')
  console.log('askAi input', text)
  await new Promise(r => setTimeout(r, 3000))
  res.status(200).json({ ok: true, data: text })
}