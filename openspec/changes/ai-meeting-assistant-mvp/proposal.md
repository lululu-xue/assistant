## Why

个人工作者在高频会议场景中面临两大痛点：会后整理耗时且 Todo 容易遗漏，会前不知道如何高效汇报。现有工具（笔记软件、任务管理器）无法自动打通"会议内容 → 结构化待办 → 下次汇报上下文"这条工作流链路，导致会议价值大量流失。

## What Changes

这是全新项目，从零构建 AI Meeting Assistant MVP：

- **新增** 邮箱 + 密码登录 / 注册系统（基于 Supabase Auth）
- **新增** 会议纪要上传页（支持 txt / md / docx 文件及粘贴文本，含 tag 选择与会议日期）
- **新增** Claude API 接入：自动提取会议摘要、进展、结论、待办（含责任人与双 deadline 字段）、风险、时间节点
- **新增** AI 分析结果页，所有 AI 产出均可编辑 / 删除 / 手动新增
- **新增** Todo Dashboard：按 tag 筛选 Todo、风险卡片（含逾期 / 即将延期真实计算）、最近会议摘要
- **新增** 会前汇报生成：按 tag 拉取历史上下文，Claude 生成五段式汇报草稿，可编辑并导出
- **新增** Supabase 数据库（meetings / todos / risks / reports 四张表），开启行级安全（RLS）

## Capabilities

### New Capabilities

- `user-auth`: 邮箱 + 密码注册与登录，Supabase Auth，登录态守卫，退出登录
- `meeting-upload`: 会议纪要上传页，支持三种文件格式与粘贴，tag 受控下拉（选已有 / 新建，默认「未分类」），可选会议日期
- `ai-meeting-analysis`: Claude API 调用（会议总结 Prompt），结构化 JSON 输出，JSON 校验 + 1 次自动重试，结果写入 meetings / todos / risks 表
- `ai-result-editing`: AI 分析结果页，卡片化展示六块内容（摘要 / 进展 / 结论 / Todo / 风险 / 时间节点），全部支持编辑 / 删除 / 新增
- `todo-management`: Todo 落库（继承 tag 与 meeting_id，双 deadline 字段，owner，risk_level），状态切换（open / done），CRUD
- `dashboard`: 主视图，tag 筛选器联动三块内容，逾期 / 即将延期真实日期计算，风险等级高亮
- `pre-meeting-report`: 会前汇报页，按 tag 拉取上下文，Claude 生成五段式汇报卡，可编辑草稿存 reports 表，支持复制 / 导出 Markdown / 导出纯文本

### Modified Capabilities

（无，全新项目）

## Impact

- **新依赖**：`next` / `react` / `tailwindcss` / `shadcn-ui` / `@supabase/supabase-js` / `@anthropic-ai/sdk` / `mammoth`（docx 解析）/ `lucide-react`
- **环境变量**：`NEXT_PUBLIC_SUPABASE_URL`、`NEXT_PUBLIC_SUPABASE_ANON_KEY`、`ANTHROPIC_API_KEY`
- **数据库**：Supabase PostgreSQL，四张新表，全部开启 RLS
- **部署**：Vercel（前端）+ Supabase（数据库与 Auth）
- **外部 API**：Anthropic Claude API（`claude-sonnet-4-6`），每次会议上传触发 1 次调用，会前汇报生成触发 1 次调用
