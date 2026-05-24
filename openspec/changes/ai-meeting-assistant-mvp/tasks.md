## 1. Phase 1 — 项目初始化与基础设施

- [ ] 1.1 创建 Next.js 15 项目（App Router，TypeScript，TailwindCSS）
- [ ] 1.2 安装并配置 shadcn/ui 组件库和 lucide-react 图标
- [ ] 1.3 配置 .env.local：NEXT_PUBLIC_SUPABASE_URL、NEXT_PUBLIC_SUPABASE_ANON_KEY、ANTHROPIC_API_KEY
- [ ] 1.4 安装 @supabase/supabase-js、@supabase/ssr，创建服务端与浏览器 client 工具函数
- [ ] 1.5 在 Supabase 执行建表 SQL：meetings、todos、risks、reports（含所有字段与 FK）
- [ ] 1.6 为四张表开启 RLS，写 `user_id = auth.uid()` 策略（SELECT / INSERT / UPDATE / DELETE）
- [ ] 1.7 在 Supabase Auth 设置中关闭「需要邮件确认」，允许即时登录

## 2. Phase 1 — 登录与鉴权

- [ ] 2.1 创建登录页 `/login`（邮箱 + 密码输入，登录 / 注册切换，飞书蓝色主按钮，居中布局）
- [ ] 2.2 实现邮箱注册 Server Action（Supabase Auth signUp）
- [ ] 2.3 实现邮箱登录 Server Action（Supabase Auth signInWithPassword）
- [ ] 2.4 实现退出登录 Server Action（signOut，重定向到 /login）
- [ ] 2.5 配置 Next.js middleware：未登录访问受保护路由时重定向到 /login
- [ ] 2.6 创建左侧导航 Layout（Dashboard / 上传会议 / 会前汇报 / 设置链接 + 用户信息 + 退出按钮）
- [ ] 2.7 验收：注册→登录→刷新保持登录→退出→访问受保护页重定向全部正常

## 3. Phase 2 — 上传会议页

- [ ] 3.1 创建上传会议页 `/upload`：拖拽区域、点击上传、文本粘贴区三种输入模式
- [ ] 3.2 实现文件类型校验：仅接受 .txt / .md / .docx，其他类型显示错误
- [ ] 3.3 服务端 API route 解析文件：txt/md 直接读文本，docx 用 mammoth 提取纯文本
- [ ] 3.4 实现 tag 受控下拉：查询 `SELECT DISTINCT tag FROM meetings WHERE user_id = $1`，列出已有 tag + 新建选项，默认"未分类"
- [ ] 3.5 实现新建 tag 交互：选"新建 tag"后弹出输入框，输入后立即应用
- [ ] 3.6 添加可选会议日期 DatePicker，未选默认今日
- [ ] 3.7 实现内容长度校验：少于 20 字符显示「内容过短，无法分析」，超过 50000 字符显示截断警告
- [ ] 3.8 表单提交：将会议内容、tag、meeting_date 保存到 meetings 表，跳转到 AI 处理中状态页

## 4. Phase 2 — Claude API 接入与会议分析

- [ ] 4.1 创建 `/api/analyze-meeting` Route Handler，接收 `meeting_id`，从 DB 读取 content 和 meeting_date
- [ ] 4.2 实现会议总结 Prompt（按 PRD 第十一节），将 meeting_date 和 content 注入 prompt
- [ ] 4.3 调用 Anthropic SDK（claude-sonnet-4-6），接收响应
- [ ] 4.4 用 Zod schema 校验 Claude 输出（六个顶级字段 + 每个字段的结构）
- [ ] 4.5 校验失败时自动重试 1 次；重试失败返回 `{ error: "AI_PARSE_FAILED" }`
- [ ] 4.6 解析成功后更新 meetings 表（summary + structured jsonb）
- [ ] 4.7 批量插入 todos 表（继承 meeting_id、user_id、tag，含 owner、双 deadline、risk_level、status="open"）
- [ ] 4.8 批量插入 risks 表（继承 meeting_id、user_id、tag，含 content、level）
- [ ] 4.9 创建 AI 处理中状态页，轮询分析状态，完成后跳转结果页

## 5. Phase 2 — AI 分析结果页

- [ ] 5.1 创建结果页 `/meetings/[id]`：六张卡片布局（摘要 / 进展 / 结论 / 待办 / 风险 / 时间节点）
- [ ] 5.2 会议摘要卡片：点击编辑 → 更新 meetings.summary
- [ ] 5.3 进展列表卡片：行内编辑、删除、新增条目 → 更新 meetings.structured.progress
- [ ] 5.4 结论列表卡片：行内编辑、删除、新增条目 → 更新 meetings.structured.conclusions
- [ ] 5.5 待办列表卡片：每条显示 task / owner / deadline_text / risk_level / status，支持行内编辑
- [ ] 5.6 待办删除功能 → 删除 todos 表对应行
- [ ] 5.7 手动新增待办功能 → 插入 todos 表（继承当前 meeting_id 和 tag）
- [ ] 5.8 风险列表卡片：显示 content / level，支持编辑 level 和内容
- [ ] 5.9 风险删除功能 → 删除 risks 表对应行
- [ ] 5.10 手动新增风险功能 → 插入 risks 表
- [ ] 5.11 AI 调用失败时展示「AI 分析失败，请重试」提示 + 重试按钮，保留会议原文

## 6. Phase 3 — Todo 落库与 Dashboard

- [ ] 6.1 创建 Dashboard 页 `/dashboard`，左右布局，右侧主区含顶部统计 + 三个内容块
- [ ] 6.2 实现 tag 筛选器组件（全部 + 用户所有 tag），选择后 URL 参数更新
- [ ] 6.3 Todo 列表块：按当前 tag 过滤，显示 task / owner / deadline_text / deadline_date / risk_level / status
- [ ] 6.4 实现逾期 / 即将延期分组逻辑：deadline_date < today → 逾期（红色）；deadline_date ≤ today+3 → 即将延期（黄色）；null → 无明确时间
- [ ] 6.5 实现 Todo 排序：按状态（open 在前）/ 按截止日期（asc，null 排最后）
- [ ] 6.6 Dashboard Todo 卡片状态切换（open ↔ done），Server Action 更新 todos.status
- [ ] 6.7 风险卡片块：按 tag 过滤，high 级别用红色样式高亮
- [ ] 6.8 最近会议块：按 tag 过滤，展示最近 5 条（title / meeting_date / tag / summary 预览）
- [ ] 6.9 三块内容 tag 筛选联动（切换 tag 同时更新三块）
- [ ] 6.10 Dashboard 空状态：无数据时显示引导 UI 和「去上传会议」按钮

## 7. Phase 4 — 会前汇报

- [ ] 7.1 创建会前汇报页 `/report`：顶部 tag 选择器（含"全部"）+ 生成按钮 + 历史草稿列表
- [ ] 7.2 生成汇报时，按 tag 查询上下文：未完成 todos、未关闭 risks、最近 3 次 meetings.summary
- [ ] 7.3 创建 `/api/generate-report` Route Handler，组装 prompt（按 PRD 第十一节）并调用 Claude
- [ ] 7.4 Zod 校验五字段 JSON 输出；失败重试 1 次；仍失败返回错误
- [ ] 7.5 生成成功后立即插入 reports 表（user_id / tag / title / content / created_at / updated_at）
- [ ] 7.6 五段式汇报卡展示（weekly_progress / current_risks / blockers / suggested_sync / next_plan）
- [ ] 7.7 汇报内容 textarea 可编辑，点击「保存草稿」更新 reports.content 和 updated_at
- [ ] 7.8 历史草稿列表按 updated_at DESC 排序，点击加载到编辑区
- [ ] 7.9 实现「一键复制」：复制 Markdown 内容到剪贴板 + toast 提示
- [ ] 7.10 实现「导出 Markdown」：下载 report-<date>.md 文件
- [ ] 7.11 实现「导出纯文本」：去除 Markdown 格式后下载 report-<date>.txt 文件
- [ ] 7.12 会前页空状态：无数据时展示引导文案

## 8. Phase 4 — 收尾与 UI Polish

- [ ] 8.1 全局错误边界：AI 调用失败时统一展示友好错误 + 重试入口，不白屏
- [ ] 8.2 loading skeleton：Dashboard、结果页、会前汇报页均有骨架屏
- [ ] 8.3 统一色彩变量：主色 #3370FF，背景 #F7F8FA，风险红 #FF4D4F，成功绿 #52C41A
- [ ] 8.4 统一圆角（12-16px）和轻阴影，hover 反馈动效
- [ ] 8.5 响应式布局检查：左侧导航在小屏可折叠
- [ ] 8.6 配置 Vercel 项目，绑定 GitHub repo，设置三个环境变量
- [ ] 8.7 端到端验收：完整跑通「注册 → 上传会议 → 查看结果 → Dashboard → 生成汇报 → 导出」全闭环
