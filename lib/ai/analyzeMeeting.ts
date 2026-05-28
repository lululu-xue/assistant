// To swap back to stub: comment out the real implementation and uncomment the stub block.
// The function signature and return type must never change.

import OpenAI from 'openai'

export interface MeetingSummaryItem {
  title: string
  owner: string | null
  time: string | null
  risk_level: 'low' | 'medium' | 'high'
}

export interface MyTask {
  project: string | null
  task: string
  progress: string | null
  completed_time: string | null
  next_milestone: string | null
  blocker: string | null
  need_help: string | null
  risk_level: 'low' | 'medium' | 'high'
}

export interface RelatedTask {
  task: string
  owner: string | null
  time_range: string | null
  my_part: string | null
  risk_level: 'low' | 'medium' | 'high'
}

export interface OtherReminder {
  item: string
  person: string | null
  time: string | null
  importance: 'low' | 'medium' | 'high'
}

export interface OtherProject {
  project: string | null
  item: string
  owner: string | null
  time: string | null
  risk_level: 'low' | 'medium' | 'high'
}

export interface AnalyzeResult {
  meeting_summary: MeetingSummaryItem[]
  my_tasks: MyTask[]
  related_to_me: RelatedTask[]
  other_reminders: OtherReminder[]
  other_projects: OtherProject[]
  _failed?: boolean
}

// ── Prompt ────────────────────────────────────────────────────────

const SYSTEM_PROMPT = `你是一个专业的会议记录分析助手。
用户会提供一段会议记录，以及用户本人在会议中的称呼列表。
你需要仔细阅读会议内容，严格按照以下 JSON 结构输出分析结果，不要输出任何额外文字，不要用 Markdown 代码块包裹。

输出结构：
{
  "meeting_summary": [          // 公司/部门级制度要求、共性规定、管理红线（不放具体项目进展）
    {
      "title": "string",        // 事项描述
      "owner": "string|null",   // 负责人，无则 null
      "time": "YYYY-MM-DD|null",// 具体日期，无则 null
      "risk_level": "low|medium|high"
    }
  ],
  "my_tasks": [                 // 用户主责事项（称呼列表中的人名对应的任务）
    {
      "project": "string|null", // 所属项目名，无法判断则 null
      "task": "string",
      "progress": "string|null",
      "completed_time": "YYYY-MM-DD|null",
      "next_milestone": "string|null",
      "blocker": "string|null",
      "need_help": "string|null",
      "risk_level": "low|medium|high"
    }
  ],
  "related_to_me": [            // 别人主责、但点到"我的称呼/我的项目"、需我配合的事项
    {
      "task": "string",
      "owner": "string|null",
      "time_range": "string|null",
      "my_part": "string|null", // 用户需要做什么，原文未说明则 null
      "risk_level": "low|medium|high"
    }
  ],
  "other_projects": [
    // ★★★ 必填板块，几乎不可能为空 ★★★
    // 凡原文出现的、不由用户主责的项目（固城/观澜/北龙湖/东韩里/沈庄/后河卢/胖庄等），
    // 每个项目的每条实质进展/节点/时间，都必须在此出现一条记录。
    // 示例：原文"观澜项目（王斌）：1#地计划9月26日完成内审施工图"
    //   → { "project":"观澜项目","item":"1#地计划完成内审施工图","owner":"王斌","time":"YYYY-09-26","risk_level":"medium" }
    {
      "project": "string|null", // 项目名，必填
      "item": "string",         // 事项描述，必填
      "owner": "string|null",   // 负责人
      "time": "YYYY-MM-DD|null",
      "risk_level": "low|medium|high"
    }
  ],
  "other_reminders": [          // 与项目完全无关的纯行政杂事（团建、述职、绩效、报销等）
    {
      "item": "string",
      "person": "string|null",
      "time": "YYYY-MM-DD|null",
      "importance": "low|medium|high"
    }
  ]
}

规则：
1. 日期换算：以 meetingDate 为基准，将"下周五""后天"等相对时间换算成 YYYY-MM-DD 格式。
2. 称呼归因：myAliases 列出的所有称呼都指同一个人（用户本人）。凡会议中提到这些称呼承担的任务，归入 my_tasks。
3. 项目分组：my_tasks 中每条任务必须填写 project 字段（所属项目名）；若无法从会议内容判断，填 null。
4. 五板块分工：
   - meeting_summary：只放公司/部门级制度规定、共性要求、管理红线（如"图纸时间原则""立项材料严禁签字作假""新项目须与总工办协调"）。不放任何具体项目的进展或动态。
   - my_tasks：用户主责的具体事项。
   - related_to_me：别人主责、但原文明确点到"我的称呼"或"我负责的项目名"、需要我配合的事项。
   - other_projects：见规则 11（★核心规则，必须严格执行）。
   - other_reminders：与项目/业务完全无关的纯行政杂事（团建、述职、绩效考核、报销通知等）。
5. 字段为空时一律填 null，不要填空字符串。
6. 严格输出合法 JSON，不含注释，不含 Markdown 包裹。
7. my_tasks 每条任务，请尽量从会议内容中提取 progress / completed_time / next_milestone / blocker / need_help，确实没有相关信息才填 null，不要轻易留空。
8. related_to_me 的准入门槛：只有当事项中明确出现"我的称呼"或"我负责的项目名"，或会议内容明确要求"我"参与/配合时，才可以放入 related_to_me。
   - 禁止替我编造 my_part：若会议未说明我需要做什么，my_part 填 null，绝不自行推断。
   - 纯属其他项目内部、全程未提到我或我的项目的事项，归入 other_projects，不得放入 related_to_me。
9. 不得遗漏与我相关的事项：凡事项描述中出现"我的称呼"或"我负责的项目名"，必须提取，按主责判断放入 my_tasks 或 related_to_me，不可归入 other_projects 或 meeting_summary 了事。
10. 跨板块去重：同一件事只能出现在一个板块。若有重复，按以下优先级保留：my_tasks > related_to_me > other_projects > meeting_summary > other_reminders。
11. ★★★ other_projects 硬性要求（不可省略）★★★
    - 步骤一：先从原文里扫描所有项目名（如固城、观澜、北龙湖、东韩里、沈庄、后河卢、胖庄，以及其他任何出现过的项目名）。
    - 步骤二：对每个不属于用户主责的项目，从原文中提取它的进展/关键节点/关键时间，在 other_projects 里写至少一条记录。
    - 步骤三：如果你发现自己的 other_projects 是空数组，必须重新检查原文——在包含多个项目的会议纪要里，other_projects 为空几乎必然是错的，说明漏提了大量信息。
    - 示例（原文）："观澜项目（负责人王斌）：1#地计划9月26日完成内审施工图"
      → other_projects 条目：{ "project":"观澜项目","item":"1#地计划完成内审施工图","owner":"王斌","time":"YYYY-09-26","risk_level":"medium" }
    - 绝对禁止：因为某项目"与我无关"就不提取它。与我无关恰恰是它进 other_projects 的原因。`

function buildUserMessage(
  content: string,
  meetingDate: string,
  myAliases: string,
  otherProjectList: string[]
): string {
  const base = `会议日期：${meetingDate}
我的称呼：${myAliases || '（未提供）'}

会议内容：
${content}`

  if (otherProjectList.length === 0) return base

  const listStr = otherProjectList.map((p, i) => `${i + 1}. ${p}`).join('\n')
  return `${base}

---
【强制要求——other_projects 项目覆盖清单】
以下项目是本次会议提到的、不属于用户的项目，你必须为清单中【每一个】项目，在 other_projects 里至少生成一条记录，提取该项目的关键事项/时间节点/负责人。一个都不能漏。如果某项目原文内容较少，也要按已有信息生成至少一条。

${listStr}`
}

// ── Review prompt ─────────────────────────────────────────────────

const REVIEW_SYSTEM_PROMPT = `你是一位严格的会议纪要审稿人。
你会收到：原始会议内容、用户的称呼列表、以及一份初步分析 JSON（含五个板块）。
你的任务是对照原文，逐条核查初步结果，修正以下问题，然后输出修正后的完整 JSON（结构与输入完全相同），不输出任何额外文字，不加 Markdown 包裹。

五板块分工（审稿时严格对照）：
- meeting_summary：只放公司/部门级制度规定、共性要求、管理红线，不放具体项目进展。
- my_tasks：用户主责事项（原文点到用户称呼/用户项目且用户为主责）。
- related_to_me：别人主责，但原文明确提到用户称呼/用户项目、需用户配合。
- other_projects：别人负责的项目动态/进展/节点，必须完整覆盖原文所有项目。
- other_reminders：与业务完全无关的纯行政杂事。

【检查项 E：other_projects 逐项核查】——最先执行，优先级最高，必须机械地按以下步骤完成

第一步——列出原文所有项目名：
  逐段阅读原始会议内容，把所有出现过的项目名（固城、观澜、北龙湖、东韩里、沈庄、后河卢、胖庄，以及其他任何项目名）全部列出来，形成一份"原文项目清单"。

第二步——逐项比对 other_projects：
  对"原文项目清单"里的每一个项目，判断它是否属于用户主责（用户称呼 = myAliases，用户项目 = 用户在 my_tasks/related_to_me 里出现的项目名）。
  - 属于用户主责 → 已在 my_tasks 或 related_to_me 里，跳过。
  - 不属于用户 → 检查 other_projects 里是否有 project 字段匹配该项目名的条目。
    - 有 → 继续核查该条目的 item/time/owner 字段是否与原文一致，若有明显缺失则补充。
    - 没有 → 立即从原文提取该项目的进展/节点/时间，新增一条到 other_projects。

第三步——兜底检查：
  如果经过第二步后 other_projects 仍为空数组，且原文里确实存在多个项目，说明第一步或第二步执行有误，必须重做第一步和第二步。
  other_projects 为空而原文有多个项目，是严重错误，必须修正。

第四步——完整性补漏（非项目类）：
  除项目以外，检查原文里的关键任务、时间节点、制度规定、风险提示是否都有对应条目；若有遗漏，补入最合适的板块（制度→meeting_summary，用户任务→my_tasks，纯行政→other_reminders）。

限制：只补原文真实存在的内容，不得凭空编造；补漏时不得误删其他正确的独立条目。

【检查项 A：漏提（我相关）】
遍历原文，找出所有出现"用户称呼"或"用户负责项目名"的句子。
若该事项未出现在 my_tasks 或 related_to_me 中，必须补入（用户主责→my_tasks，否则→related_to_me）。

【检查项 B：脑补】
检查 related_to_me 中每一条：若原文中根本没有提到用户需参与/配合，将该条移入 other_projects（保留事项内容，去掉 my_part）。
检查 related_to_me 中的 my_part 字段：若原文未明确说明用户需做什么，将 my_part 设为 null，绝不保留推断内容。

【检查项 C：放错】
检查 meeting_summary：若有具体项目进展（非制度/规定），将其移入 other_projects（若跟用户相关则移入 my_tasks 或 related_to_me）。
检查 other_reminders：若有业务/项目相关的内容，将其移入对应板块（制度→meeting_summary，项目进展→other_projects 或 my_tasks/related_to_me）。

【检查项 D：跨板块去重】
若同一件事（措辞略不同也算）出现在多个板块，按以下优先级只保留一条，其余删除：
优先级：my_tasks > related_to_me > other_projects > meeting_summary > other_reminders
- 含"用户称呼/用户项目"且用户主责 → 留在 my_tasks，从其他板块删除
- 含"用户称呼/用户项目"且用户非主责 → 留在 related_to_me，从其他板块删除
- 别人的项目进展 → 留在 other_projects，从其他板块删除
- 制度/规定 → 留在 meeting_summary，从 other_reminders 删除

重要：不得因为去重或修正而误删原本正确的、独立的条目。只删除真正重复的同一件事的多余拷贝。

输出与初步结果完全相同结构的 JSON，五个顶级数组键不变，字段类型不变，空值用 null。`

function buildReviewMessage(
  content: string,
  meetingDate: string,
  myAliases: string,
  firstResult: AnalyzeResult,
  otherProjectList: string[]
): string {
  const base = `会议日期：${meetingDate}
我的称呼：${myAliases || '（未提供）'}

会议内容：
${content}

---
初步分析结果（待审核）：
${JSON.stringify(firstResult, null, 2)}`

  if (otherProjectList.length === 0) return base

  const listStr = otherProjectList.map((p, i) => `${i + 1}. ${p}`).join('\n')
  const coverageBlock = `【最高优先级检查——other_projects 清单覆盖核对】（先于其他所有检查项执行）
逐一核对以下项目清单，每个项目是否都在 other_projects 里出现了（project 字段匹配）：

${listStr}

对清单中每一个未出现的项目：立即根据原文补上至少一条记录，再继续后续检查。
---
`

  return coverageBlock + base
}

// ── Project extraction ────────────────────────────────────────────

const GENERIC_PROJECT_TERMS = new Set([
  '其他项目', '各项目', '所有项目', '本次项目', '该项目', '此项目',
  '相关项目', '各个项目', '多个项目', '整个项目', '每个项目',
])

function extractProjectList(content: string): string[] {
  const found = new Set<string>()
  let m: RegExpExecArray | null

  // Pattern A: explicit "X项目" (2–8 Chinese chars before 项目)
  const patA = /[一-龥]{2,8}项目/g
  while ((m = patA.exec(content)) !== null) {
    if (!GENERIC_PROJECT_TERMS.has(m[0])) found.add(m[0])
  }

  // Pattern B: numbered section "数字、X（" for names without "项目" suffix
  const patB = /^\s*\d+[、，]\s*([一-龥]{2,5})\s*[（(]/gm
  while ((m = patB.exec(content)) !== null) {
    const name = m[1]
    if (!name.endsWith('项目') && !GENERIC_PROJECT_TERMS.has(name + '项目')) {
      found.add(name + '项目')
    }
  }

  return Array.from(found)
}

function filterOtherProjects(projects: string[], myAliases: string): string[] {
  return projects.filter((p) => {
    const base = p.replace(/项目$/, '')
    return !myAliases.includes(p) && !myAliases.includes(base)
  })
}

// ── Validation ────────────────────────────────────────────────────

function emptyResult(): AnalyzeResult {
  return {
    meeting_summary: [],
    my_tasks: [],
    related_to_me: [],
    other_reminders: [],
    other_projects: [],
    _failed: true,
  }
}

const RISK_VALUES = new Set(['low', 'medium', 'high'])

function toRisk(v: unknown): 'low' | 'medium' | 'high' {
  return RISK_VALUES.has(v as string) ? (v as 'low' | 'medium' | 'high') : 'medium'
}

function str(v: unknown): string | null {
  return typeof v === 'string' && v.trim() !== '' ? v.trim() : null
}

function validateResult(raw: unknown): AnalyzeResult {
  if (typeof raw !== 'object' || raw === null) throw new Error('not an object')

  const r = raw as Record<string, unknown>

  const ensureArray = (key: string) => {
    if (!Array.isArray(r[key])) throw new Error(`${key} is not an array`)
    return r[key] as unknown[]
  }

  const meeting_summary: MeetingSummaryItem[] = ensureArray('meeting_summary').map((x) => {
    const item = x as Record<string, unknown>
    if (!str(item.title)) throw new Error('meeting_summary item missing title')
    return {
      title: str(item.title)!,
      owner: str(item.owner),
      time: str(item.time),
      risk_level: toRisk(item.risk_level),
    }
  })

  const my_tasks: MyTask[] = ensureArray('my_tasks').map((x) => {
    const item = x as Record<string, unknown>
    if (!str(item.task)) throw new Error('my_tasks item missing task')
    return {
      project: str(item.project),
      task: str(item.task)!,
      progress: str(item.progress),
      completed_time: str(item.completed_time),
      next_milestone: str(item.next_milestone),
      blocker: str(item.blocker),
      need_help: str(item.need_help),
      risk_level: toRisk(item.risk_level),
    }
  })

  const related_to_me: RelatedTask[] = ensureArray('related_to_me').map((x) => {
    const item = x as Record<string, unknown>
    if (!str(item.task)) throw new Error('related_to_me item missing task')
    return {
      task: str(item.task)!,
      owner: str(item.owner),
      time_range: str(item.time_range),
      my_part: str(item.my_part),
      risk_level: toRisk(item.risk_level),
    }
  })

  const other_reminders: OtherReminder[] = ensureArray('other_reminders').map((x) => {
    const item = x as Record<string, unknown>
    if (!str(item.item)) throw new Error('other_reminders item missing item')
    return {
      item: str(item.item)!,
      person: str(item.person),
      time: str(item.time),
      importance: toRisk(item.importance),
    }
  })

  const other_projects: OtherProject[] = ensureArray('other_projects').map((x) => {
    const item = x as Record<string, unknown>
    if (!str(item.item)) throw new Error('other_projects item missing item')
    return {
      project: str(item.project),
      item: str(item.item)!,
      owner: str(item.owner),
      time: str(item.time),
      risk_level: toRisk(item.risk_level),
    }
  })

  return { meeting_summary, my_tasks, related_to_me, other_reminders, other_projects }
}

// ── API call ──────────────────────────────────────────────────────

const client = new OpenAI({
  apiKey: process.env.DEEPSEEK_API_KEY ?? '',
  baseURL: 'https://api.deepseek.com',
})

async function callOnce(
  content: string,
  meetingDate: string,
  myAliases: string,
  otherProjectList: string[]
): Promise<AnalyzeResult> {
  const completion = await client.chat.completions.create({
    model: 'deepseek-chat',
    response_format: { type: 'json_object' },
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: buildUserMessage(content, meetingDate, myAliases, otherProjectList) },
    ],
    temperature: 0.2,
  })

  const text = completion.choices[0]?.message?.content ?? ''
  const parsed: unknown = JSON.parse(text)
  return validateResult(parsed)
}

async function callReview(
  content: string,
  meetingDate: string,
  myAliases: string,
  firstResult: AnalyzeResult,
  otherProjectList: string[]
): Promise<AnalyzeResult> {
  const completion = await client.chat.completions.create({
    model: 'deepseek-chat',
    response_format: { type: 'json_object' },
    messages: [
      { role: 'system', content: REVIEW_SYSTEM_PROMPT },
      { role: 'user', content: buildReviewMessage(content, meetingDate, myAliases, firstResult, otherProjectList) },
    ],
    temperature: 0.1,
  })

  const text = completion.choices[0]?.message?.content ?? ''
  const parsed: unknown = JSON.parse(text)
  return validateResult(parsed)
}

// ── Public function ───────────────────────────────────────────────

export async function analyzeMeeting(
  content: string,
  meetingDate: string,
  myAliases: string
): Promise<AnalyzeResult> {
  // Extract other-projects list from content; fall back to [] on any error
  let otherProjectList: string[] = []
  try {
    const allProjects = extractProjectList(content)
    const filtered = filterOtherProjects(allProjects, myAliases)
    if (filtered.length > 0) otherProjectList = filtered
  } catch {
    // extraction failed — proceed without the list
  }

  // First pass (with one retry)
  let firstResult: AnalyzeResult | null = null
  try {
    firstResult = await callOnce(content, meetingDate, myAliases, otherProjectList)
  } catch (err) {
    console.error('[analyzeMeeting] first attempt failed:', err)
  }
  if (!firstResult) {
    try {
      firstResult = await callOnce(content, meetingDate, myAliases, otherProjectList)
    } catch (err) {
      console.error('[analyzeMeeting] retry failed, returning empty result:', err)
      return emptyResult()
    }
  }

  // Second pass: self-review — falls back to first result on any failure
  try {
    const reviewed = await callReview(content, meetingDate, myAliases, firstResult, otherProjectList)
    return reviewed
  } catch (err) {
    console.warn('[analyzeMeeting] review step failed, using first-pass result:', err)
    return firstResult
  }
}
