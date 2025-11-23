// 引入必要的模块
import { OpenAI } from "openai";

// 初始化 OpenAI 客户端 (适配火山引擎方舟平台)
const openai = new OpenAI({
  apiKey: process.env.ARK_API_KEY, // 从环境变量读取 火山引擎 API Key
  baseURL: "https://ark.cn-beijing.volces.com/api/v3", // 火山引擎方舟 API 地址
});

export default async function handler(req, res) {
  console.log('askAi handler invoked', { method: req.method, url: req.url })
  
  // 1. 验证请求方法
  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }

  // 2. 解析和验证请求体
  let body = req.body;
  if (!body || typeof body !== 'object') {
    try {
      body = JSON.parse(req.body || '{}');
    } catch (error) {
      return res.status(400).json({ ok: false, error: 'Invalid request body' });
    }
  }
  
  const userInputText = String(body?.text ?? '');
  console.log('askAi input:', userInputText);

  // 检查输入文本是否为空
  if (!userInputText.trim()) {
    return res.status(400).json({ ok: false, error: 'Input text is required' });
  }

  try {
    // 3. 调用 火山引擎豆包模型 API
    const completion = await openai.chat.completions.create({
      model: "ep-xxxxxxxxx", // 【重要】替换成你的火山引擎模型接入点 ID
      messages: [
        { role: "system", content: "You are a helpful assistant." }, // 系统角色设定
        { role: "user", content: userInputText } // 用户输入
      ],
      temperature: 0.7, // 可调整创造性（0-1 之间）
      max_tokens: 1000, // 限制最大生成长度（根据需求调整）
    });

    // 4. 处理 API 响应并返回结果
    const aiResponseText = completion.choices[0].message.content?.trim() || '';
    
    return res.status(200).json({
      ok: true,
      data: aiResponseText, // 返回 AI 生成的内容
    });

  } catch (error) {
    // 5. 错误处理
    console.error('Error calling Volcengine API:', error);
    
    let errorMessage = 'Failed to get response from AI';
    if (error instanceof Error) {
      errorMessage = error.message;
    }

    return res.status(500).json({
      ok: false,
      error: errorMessage,
    });
  }
}