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

export interface AnalyzeResult {
  meeting_summary: MeetingSummaryItem[]
  my_tasks: MyTask[]
  related_to_me: RelatedTask[]
  other_reminders: OtherReminder[]
  _failed?: boolean
}

// ── Prompt ────────────────────────────────────────────────────────

const SYSTEM_PROMPT = `你是一个专业的会议记录分析助手。
用户会提供一段会议记录，以及用户本人在会议中的称呼列表。
你需要仔细阅读会议内容，严格按照以下 JSON 结构输出分析结果，不要输出任何额外文字，不要用 Markdown 代码块包裹。

输出结构：
{
  "meeting_summary": [          // 全局重点：部门/公司级大事、整体进展、重大风险
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
  "related_to_me": [            // 其他人负责、但需要用户配合/关注的事项
    {
      "task": "string",
      "owner": "string|null",
      "time_range": "string|null",
      "my_part": "string|null", // 用户需要做什么
      "risk_level": "low|medium|high"
    }
  ],
  "other_reminders": [          // 非项目类提醒：团建、述职、行政通知等
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
4. 分类原则：my_tasks = 用户主责；related_to_me = 别人负责但用户需配合；other_reminders = 非项目提醒；meeting_summary = 全局重点。
5. 字段为空时一律填 null，不要填空字符串。
6. 严格输出合法 JSON，不含注释，不含 Markdown 包裹。
7. my_tasks 每条任务，请尽量从会议内容中提取 progress / completed_time / next_milestone / blocker / need_help，确实没有相关信息才填 null，不要轻易留空。
8. related_to_me 的准入门槛：只有当事项中明确出现"我的称呼"或"我负责的项目名"，或会议内容明确要求"我"参与/配合时，才可以放入 related_to_me。
   - 禁止替我编造 my_part：若会议未说明我需要做什么，my_part 填 null，绝不自行推断。
   - 纯属其他项目内部、全程未提到我或我的项目的事项，归入 meeting_summary（作为其他项目动态），不得放入 related_to_me。
   - 反例（不应进 related_to_me）："A 项目要求 B 与 C 对接工作计划"——全程未提到我，应进 meeting_summary。
9. meeting_summary 与 other_reminders 的边界：
   - 凡业务/项目相关的制度规定、共性要求、管理红线（如"图纸时间原则""新项目须与总工办协调""立项材料严禁签字作假"），一律归入 meeting_summary，不得放入 other_reminders。
   - other_reminders 只放与业务/项目完全无关的纯行政杂事，例如：团建、述职、绩效考核、报销通知。
   - 反例（不应进 other_reminders）："立项材料严禁签字作假"→ 进 meeting_summary。
10. 不得遗漏与我相关的事项：凡事项描述中出现"我的称呼"或"我负责的项目名"，必须提取，按主责判断放入 my_tasks 或 related_to_me，不可归入 meeting_summary 了事。
    - 正例：一条跨部门讨论同时涉及"我的项目"与其他项目 → 必须出现在 my_tasks 或 related_to_me，不能只放进 meeting_summary 而漏掉。`

function buildUserMessage(
  content: string,
  meetingDate: string,
  myAliases: string
): string {
  return `会议日期：${meetingDate}
我的称呼：${myAliases || '（未提供）'}

会议内容：
${content}`
}

// ── Validation ────────────────────────────────────────────────────

function emptyResult(): AnalyzeResult {
  return {
    meeting_summary: [],
    my_tasks: [],
    related_to_me: [],
    other_reminders: [],
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

  return { meeting_summary, my_tasks, related_to_me, other_reminders }
}

// ── API call ──────────────────────────────────────────────────────

const client = new OpenAI({
  apiKey: process.env.DEEPSEEK_API_KEY ?? '',
  baseURL: 'https://api.deepseek.com',
})

async function callOnce(
  content: string,
  meetingDate: string,
  myAliases: string
): Promise<AnalyzeResult> {
  const completion = await client.chat.completions.create({
    model: 'deepseek-chat',
    response_format: { type: 'json_object' },
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: buildUserMessage(content, meetingDate, myAliases) },
    ],
    temperature: 0.2,
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
  // First attempt
  try {
    return await callOnce(content, meetingDate, myAliases)
  } catch (err) {
    console.error('[analyzeMeeting] first attempt failed:', err)
  }

  // One retry
  try {
    return await callOnce(content, meetingDate, myAliases)
  } catch (err) {
    console.error('[analyzeMeeting] retry failed, returning empty result:', err)
    return emptyResult()
  }
}
