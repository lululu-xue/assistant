// To swap in the real Claude API: replace the function body only.
// Input/output types and the calling convention must not change.

export interface TodoItem {
  task: string
  owner: string | null
  deadline_text: string | null
  deadline_date: string | null
  risk_level: 'low' | 'medium' | 'high'
}

export interface RiskItem {
  content: string
  level: 'low' | 'medium' | 'high'
}

export interface TimeNode {
  text: string
  date: string | null
}

export interface AnalyzeResult {
  summary: string
  progress: string[]
  conclusions: string[]
  time_nodes: TimeNode[]
  todos: TodoItem[]
  risks: RiskItem[]
}

function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr)
  d.setDate(d.getDate() + days)
  return d.toISOString().split('T')[0]
}

function nextWeekdayFromDate(dateStr: string, targetWeekday: number): string {
  const d = new Date(dateStr)
  const diff = ((targetWeekday - d.getDay() + 7) % 7) || 7
  return addDays(dateStr, diff)
}

export async function analyzeMeeting(
  _content: string,
  meetingDate: string
): Promise<AnalyzeResult> {
  // STUB — replace body with real Claude API call when ANTHROPIC_API_KEY is set
  await new Promise((r) => setTimeout(r, 1200))

  const thisFriday = nextWeekdayFromDate(meetingDate, 5)
  const nextMonday = addDays(thisFriday, 3)
  const nextFriday = addDays(thisFriday, 7)
  const inTwoDays = addDays(meetingDate, 2)

  return {
    summary:
      '支付功能联调已完成，即将进入测试阶段。当前主要风险为测试资源尚未落实，需本周内确认。API 接口文档需在周五前完成更新。',
    progress: [
      '支付接口前后端联调完成，接口对齐',
      '登录页开发完成，通过需求评审',
      '数据库表结构设计确认',
    ],
    conclusions: [
      '下周正式开始支付功能测试',
      '测试资源由张三本周内确认并同步',
      'API 接口文档周五前完成更新',
    ],
    time_nodes: [
      { text: '本周五', date: thisFriday },
      { text: '下周一', date: nextMonday },
      { text: '下周开始测试', date: nextFriday },
      { text: '后天前', date: inTwoDays },
    ],
    todos: [
      {
        task: '确认测试资源和测试人员安排',
        owner: '张三',
        deadline_text: '本周五',
        deadline_date: thisFriday,
        risk_level: 'high',
      },
      {
        task: '更新支付接口 API 文档',
        owner: '李四',
        deadline_text: '本周五',
        deadline_date: thisFriday,
        risk_level: 'medium',
      },
      {
        task: '编写支付功能测试用例',
        owner: '张三',
        deadline_text: '下周一前',
        deadline_date: nextMonday,
        risk_level: 'medium',
      },
      {
        task: '与第三方 API 团队对接，确认接口时间节点',
        owner: null,
        deadline_text: '后天前',
        deadline_date: inTwoDays,
        risk_level: 'high',
      },
    ],
    risks: [
      { content: '测试资源尚未确认，可能导致测试计划延期', level: 'high' },
      { content: 'API 接口依赖第三方，存在延期风险', level: 'medium' },
      { content: '支付功能安全审查时间未纳入计划', level: 'low' },
    ],
  }
}
