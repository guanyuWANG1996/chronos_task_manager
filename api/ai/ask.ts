// 引入必要的模块
import { OpenAI } from "openai";

// 初始化 OpenAI 客户端 (适配火山引擎方舟平台)
const openai = new OpenAI({
  apiKey: process.env.ARK_API_KEY, // 从环境变量读取 火山引擎 API Key
  baseURL: "https://ark.cn-beijing.volces.com/api/v3", // 火山引擎方舟 API 地址
});

export default async function handler(req: any, res: any) {
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
  const referenceDate = String(body?.referenceDate ?? '');

  // 打印请求体内容（调试用）
  console.log('askAi request body:', { text: userInputText, referenceDate });

  // 检查输入文本是否为空
  if (!userInputText.trim()) {
    return res.status(400).json({ ok: false, error: 'Input text is required' });
  }
  // 检查参考日期是否为空
  if (!referenceDate.trim()) {
    return res.status(400).json({ ok: false, error: 'Reference date is required' });
  }

  try {
    // 3. 调用 火山引擎豆包模型 API
    const completion = await openai.chat.completions.create({
      model: "doubao-seed-1-6-lite-251015",
      messages: [
        { role: "system", content: `你是一个任务解析助手，需要将用户输入的文本解析为结构化的任务信息。
重要说明：
- 用户会提供一个参考日期（格式 YYYY-MM-DD），所有相对时间（如"明天"、"后天"、"下周一"）均需基于该日期解析。
- 若未提及具体日期，默认使用参考日期作为任务日期。

输出格式必须是 JSON 对象，包含以下字段：
- title: 任务标题（必填，字符串）
- description: 任务描述（可选，字符串）
- date: 任务日期（必填，格式 YYYY-MM-DD，基于参考日期解析相对时间）
- time: 任务时间（可选，格式 HH:MM，如"14:30"）
- groupId: 任务分组（必填，字符串，只能是 "personal"、"work"、"learning"、"health" 之一，匹配失败默认 "personal"）
- subtasks: 子任务列表（可选，数组，每个元素包含 title 和 completed: false）

示例（参考日期为 2024-05-20）：
用户输入："明天下午3点完成项目报告"
输出：{
  "title": "完成项目报告",
  "description": "",
  "date": "2024-05-21",  // 基于参考日期解析"明天"
  "time": "15:00",
  "groupId": "work",
  "subtasks": []
}

示例（参考日期为 2024-05-20，用户未提日期）：
用户输入："晚上8点健身"
输出：{
  "title": "健身",
  "description": "",
  "date": "2024-05-20",  // 默认使用参考日期
  "time": "20:00",
  "groupId": "health",
  "subtasks": []
}

如果无法解析，输出空对象 {}` }, // 系统角色设定
        { role: "user", content: `参考日期：${referenceDate}\n用户输入：${userInputText}`  } // 用户输入
      ],
      temperature: 0.3, // 可调整创造性（0-1 之间）
      max_tokens: 1000, // 限制最大生成长度（根据需求调整）
    });

    // 4. 处理 API 响应并返回结果
    const aiResponseText = completion.choices[0].message.content?.trim() || '';
    // 打印 API 响应内容（调试用）
    console.log('askAi API response:', aiResponseText);
    
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