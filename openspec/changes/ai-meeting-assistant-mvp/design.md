## Context

全新项目，基于既定 PRD（v3）从零构建。技术栈：Next.js 15（App Router）+ Supabase（Auth + PostgreSQL）+ Claude API + Vercel。项目目标是演示 AI 工作流整合能力，优先「跑通 demo」而非高并发 / 企业级权限体系。

## Goals / Non-Goals

**Goals:**
- 完整实现 PRD 四个 Phase 的功能范围
- Next.js App Router + Server Components 作为数据获取层
- Supabase RLS 隔离用户数据，体现工程严谨度
- Claude API 服务端调用，JSON 校验 + 1 次自动重试
- 所有 AI 产出可在前端编辑并持久化

**Non-Goals:**
- 多用户协同、实时 WebSocket、企业 RBAC
- 音视频转写、PDF 解析
- tag 管理页、tag 颜色、多 tag、级联更新
- 生产级限流、成本控制、隐私合规

## Decisions

### 1. Next.js App Router + Server Actions 作为主要数据操作层

**选择**：使用 Server Actions 处理表单提交与数据库写操作；Server Components 处理初始数据读取；Client Components 仅用于交互状态（编辑、筛选、toggle）。

**原因**：App Router 原生支持流式渲染（loading.tsx skeleton），Server Actions 可直接访问 Supabase 服务端 client，无需额外 API 路由。Claude API 调用也在服务端，避免暴露 API Key。

**替代方案**：Pages Router + REST API routes — 更繁琐，无 Server Component 优势。

---

### 2. Claude API 调用放在 Next.js API Route（/api/analyze-meeting, /api/generate-report）

**选择**：单独的 Route Handler 处理 AI 调用，而非 Server Action。

**原因**：AI 调用耗时较长，Route Handler 便于前端展示 loading 状态；同时便于独立重试逻辑与错误边界处理。返回结构化 JSON，前端直接写入 Supabase（通过 Server Action）。

**JSON 校验与重试**：后端用 Zod schema 校验 Claude 输出；校验失败自动重试 1 次（相同 prompt）；仍失败则返回 `{ error: "AI_PARSE_FAILED" }`，前端展示友好提示 + 重试按钮。

---

### 3. Supabase 客户端拆分：服务端 client vs 浏览器 client

**选择**：
- 服务端（Server Components / Route Handlers）：`createServerClient`（使用 `SUPABASE_SERVICE_ROLE_KEY` 跳过 RLS，或使用 cookie-based session client）
- 客户端（Client Components）：`createBrowserClient`

**原因**：RLS 策略需要 `auth.uid()` 匹配 `user_id`；浏览器 client 通过 session cookie 自动携带 JWT，服务端 client 通过 `@supabase/ssr` 的 cookie helper 获取同一 session。

---

### 4. docx 解析：服务端 mammoth.js

**选择**：文件上传到 Next.js API Route，服务端用 `mammoth` 提取纯文本，不存储文件到 Supabase Storage（只存文本到 `meetings.content`）。

**原因**：MVP 不需要保留原始文件；服务端解析避免大文件传输到浏览器；mammoth 对标准 docx 兼容性好。

**替代方案**：存文件到 Supabase Storage 再异步解析 — 增加异步状态管理复杂度，MVP 不必要。

---

### 5. tag 实现：前端受控下拉 + meetings 表独立查询

**选择**：tag 列表通过 `SELECT DISTINCT tag FROM meetings WHERE user_id = $1` 动态获取；新建 tag 时直接以新值创建会议，下次自动出现在下拉中。不建独立 tags 表。

**原因**：PRD 明确「轻量 tag」，不需要 tag 管理页；DISTINCT 查询足够简单，避免额外表和同步逻辑。

---

### 6. 数据库表结构：关系表 + jsonb 混合

**选择**：todos / risks 为独立关系表（支持筛选聚合）；meetings.structured 为 jsonb 存 progress / conclusions / time_nodes（仅展示）。

**原因**：PRD 设计原则：需要查询的实体拆关系表，只用于展示的放 jsonb，平衡清晰度与开发复杂度。

---

### 7. 会前汇报：存 reports 表，content 为 Markdown 字符串

**选择**：生成后立即存为草稿（INSERT），前端提供 textarea 编辑，保存时 UPDATE。历史草稿列表按 `updated_at DESC` 展示。

**原因**：PRD 要求可编辑草稿 + 历史重新打开；Markdown 字符串存储便于直接导出，无需序列化。

## Risks / Trade-offs

- **Claude JSON 输出格式不稳定** → Zod 校验 + 1 次重试；仍失败给用户明确错误提示，保留已上传文本
- **大文本超出 Claude 上下文窗口** → 前端检测文本长度（>50,000 字符提示截断警告），API 端硬截断至安全长度后调用
- **RLS 配置出错导致数据隔离失效** → 每张表写明确的 policy（`user_id = auth.uid()`），建库后手动验证跨用户访问被拒
- **mammoth 解析复杂 docx（含图表 / 嵌套表格）效果差** → MVP 只提取文本，告知用户「复杂格式文档建议粘贴纯文本」
- **Vercel Serverless 函数超时（默认 10s）** → Claude API 调用设置合理 timeout，会前汇报上下文数据量控制在合理范围

## Migration Plan

1. 在 Supabase Dashboard 执行建表 SQL（含 RLS policies）
2. 配置 Vercel 环境变量
3. `git push` 触发 Vercel 自动部署
4. 回滚：Vercel 一键回滚到上一个部署版本

## Open Questions

- 无，PRD 决策记录已覆盖所有关键分支
