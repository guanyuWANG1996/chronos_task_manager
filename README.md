# Chronos 任务管理器（前后端一体化）

Chronos 是一款轻量、现代的任务管理应用，提供「日历视图 + 任务清单 + 子任务」的高效工作流，并支持通过 AI 智能解析自然语言快速创建任务。前端使用 React + Vite，后端采用 Vercel Serverless（Go）提供认证与任务数据的 CRUD 服务，数据库为 PostgreSQL。

功能与技术栈均已最小化实现、易于部署和扩展，适合作为个人或团队的任务管理基础模板。

## 主要功能

- 账号注册与登录，基于 JWT 的鉴权
- 按日期管理任务，支持时间、分组、描述
- 子任务管理：勾选完成、增删子任务
- 日历统计：按月聚合展示待办/已完成数量
- 智能输入：通过 AI 解析自然语言为结构化任务
- 现代化 UI：Tailwind（CDN）+ Lucide 图标 + Motion 动效

## 技术栈

- 前端：`React 19`、`Vite 6`、`Tailwind（CDN 模式）`、`Lucide`、`Framer Motion`
- 后端：`Go 1.21+`、`Vercel Serverless`、`pgx`、`golang-jwt`
- 数据库：`PostgreSQL`
- AI 能力：`OpenAI SDK`（已适配火山引擎方舟 `ARK_API_KEY` 与 `baseURL`）

## 目录结构

- `App.tsx`：应用入口与页面框架
- `components/`：功能组件（`Calendar`、`TaskList`、`AddTaskForm`、`AuthForm`、`TaskDetailModal`、`SmartTaskInput`、`Toast`）
- `services/api.ts`：前端调用后端 API 的封装
- `api/`：后端 Serverless 路由
  - `auth/login/handler.go`：登录，返回 JWT
  - `auth/register/handler.go`：注册账号
  - `todos/handler.go`：任务的增删改查
  - `subtasks/handler.go`：子任务的增删改查
  - `calendar/handler.go`：按月聚合统计
  - `ai/ask.ts`：AI 解析自然语言为任务
- `pkg/auth/jwt.go`：JWT 生成与解析
- `pkg/db/db.go`：数据库连接池与环境变量选择逻辑
- `constants.ts`、`types.ts`、`lib/utils.ts`：常量、类型与工具函数
- `vercel.json`：部署与 API 重写配置

## 快速开始（本地前端预览）

此仓库的本地开发默认仅运行前端；后端 API 需部署到 Vercel 并连通数据库后才可使用。你可以先进行 UI 与交互的本地预览：

1. 安装依赖：
   `npm install`
2. 启动开发服务器：
   `npm run dev`

提示：在未部署后端的情况下，登录/注册/任务操作会提示后端未运行（见 `components/AuthForm.tsx` 中的文案）。

## 完整部署（推荐）

通过 Vercel 部署前后端一体化服务：

1. 准备 PostgreSQL 数据库，并执行本文后续的「数据库初始化」SQL
2. 在 Vercel 项目设置 Environment Variables 中配置：
   - `DATABASE_URL` 或 `POSTGRES_URL`（任选其一，支持多种变量名，详见下文）
   - `JWT_SECRET`（用于签发/验证 JWT）
   - `ARK_API_KEY`（火山引擎方舟 API Key，用于 AI 能力）
3. 连接 GitHub 仓库，一键导入并部署
4. Vercel 将依据 `vercel.json` 完成构建与路由重写

部署完成后，即可使用登录、任务管理、AI 解析等完整功能。

## 环境变量说明

后端根据以下变量依次检测并选取数据库连接字符串（第一个非空即为有效）：

- `POSTGRES_URL`
- `DATABASE_URL`
- `POSTGRES_URL_NON_POOLING`
- `DATABASE_URL_UNPOOLED`
- `POSTGRES_PRISMA_URL`
- `POSTGRES_URL_NO_SSL`

如未包含 `sslmode=` 参数，后端会自动追加 `sslmode=require`。

其余关键变量：

- `JWT_SECRET`：JWT 签名密钥，必填，否则后端会报错 `jwt secret not configured`（见 `pkg/auth/jwt.go:17-31`）
- `ARK_API_KEY`：用于 `api/ai/ask.ts` 调用火山引擎方舟 Chat Completions（见 `api/ai/ask.ts:5-8`）

## 数据库初始化

根据后端查询语句整理出的最小表结构如下（如需扩展可自行添加字段与索引）。

```sql
-- 用户表
CREATE TABLE IF NOT EXISTS users (
  id BIGSERIAL PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 任务表
CREATE TABLE IF NOT EXISTS todos (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  date DATE NOT NULL,
  time TEXT,
  group_id TEXT NOT NULL,
  completed BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_todos_user_date ON todos(user_id, date);

-- 子任务表
CREATE TABLE IF NOT EXISTS subtasks (
  id BIGSERIAL PRIMARY KEY,
  todo_id BIGINT NOT NULL REFERENCES todos(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  completed BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

## API 文档（Serverless 路由）

所有需要鉴权的接口使用 `Authorization: Bearer <token>` 传递 JWT。登录后端点返回 `token`。

- `POST /api/auth/register`
  - 请求体：`{ "email": string, "password": string }`
  - 响应：`{ ok: true, data: { id, email } }` 或 `HTTP 409 { ok: false, error }`
  - 源码：`api/auth/register/handler.go`

- `POST /api/auth/login`
  - 请求体：`{ "email": string, "password": string }`
  - 响应：`{ ok: true, token }` 或 `HTTP 401 { ok: false, error: "invalid credentials" }`
  - 源码：`api/auth/login/handler.go`

- `GET /api/todos?date=YYYY-MM-DD`
  - 响应：`{ ok: true, data: Todo[] }`（包含当日任务与子任务）
  - 源码：`api/todos/handler.go`

- `POST /api/todos`
  - 创建任务。请求体示例：
    ```json
    {
      "title": "写周报",
      "description": "包含项目进度",
      "date": "2025-11-24",
      "time": "15:00",
      "groupId": "work",
      "subtasks": [{ "title": "整理数据" }, { "title": "撰写正文" }]
    }
    ```
  - 响应：`{ ok: true, data: Todo }`

- `PUT /api/todos`
  - 更新任务的部分字段。请求体：`{ id, title?, description?, date?, time?, groupId? }`
  - 响应：`{ ok: true }`

- `PATCH /api/todos`
  - 切换任务完成状态。请求体：`{ id }`
  - 响应：`{ ok: true }`

- `DELETE /api/todos?id=<todoId>`
  - 删除任务
  - 响应：`{ ok: true }`

- `POST /api/subtasks`
  - 为任务添加子任务。请求体：`{ todoId, title }`
  - 响应：`{ ok: true, data: { id, title, completed:false } }`

- `PATCH /api/subtasks`
  - 切换子任务完成状态。请求体：`{ id }`
  - 响应：`{ ok: true }`

- `DELETE /api/subtasks`
  - 删除子任务。请求体：`{ id }`
  - 响应：`{ ok: true }`

- `GET /api/calendar?month=YYYY-MM`
  - 返回当月每天的统计：`{ date, hasTasks, pending, completed }[]`
  - 源码：`api/calendar/handler.go`

- `POST /api/ai/ask`
  - 基于参考日期与自然语言文本生成结构化任务，返回 JSON 字符串。
  - 请求体：`{ text: string, referenceDate: "YYYY-MM-DD" }`
  - 响应：`{ ok: true, data: string }`（`data` 为 JSON 字符串，需要前端 `JSON.parse`）
  - 源码：`api/ai/ask.ts`

> 说明：Go 路由通过 `vercel.json` 的 `rewrites` 暴露到 `/api/**`；`api/ai/ask.ts` 为 Node 路由，默认路径为 `/api/ai/ask`。

## 前端使用与交互

- 登录后，前端会将 `token` 与 `email` 存入 `localStorage`（`App.tsx:227-232`），下次自动登录
- 任务列表按所选日期展示，并优先按时间排序（`App.tsx:33-49`）
- 右上角头像菜单支持登出（清理本地存储）
- 智能输入框会调用 `/api/ai/ask`，解析成功后自动创建任务（`App.tsx:86-151`）

## 构建与预览

- 构建生产包：
  `npm run build`
- 本地预览构建产物：
  `npm run preview`

## 安全与配置建议

- `JWT_SECRET` 必须配置为强随机密钥
- 数据库连接字符串建议使用 Vercel 的加密环境变量管理
- 生产环境下为数据库开启专属网络与访问白名单
- 如需关闭数据库 SSL，可在连接串中明确设置 `sslmode=disable`（不推荐）

## 常见问题

- 本地开发无法调用后端接口？请先在 Vercel 配置数据库与环境变量并部署，或使用 `vercel dev` 在本地模拟 Serverless 环境（需要安装 Vercel CLI）。
- AI 返回格式错误？`/api/ai/ask` 的 `data` 为字符串，前端需 `JSON.parse` 并进行字段校验，失败时会在页面弹出提示。

## 许可证

默认未附带许可证，如需开源请自行添加合适的开源协议文件。
