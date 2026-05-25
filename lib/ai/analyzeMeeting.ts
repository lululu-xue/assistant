// To swap in the real Claude API: replace the function body only.
// Input/output types and the calling convention must not change.

export interface MeetingSummaryItem {
  title: string
  owner: string | null
  time: string | null
  risk_level: 'low' | 'medium' | 'high'
}

export interface MyTask {
  project: string | null          // group key; null → "未分类项目"
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
}

function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr)
  d.setDate(d.getDate() + days)
  return d.toISOString().split('T')[0]
}

function nextWeekday(dateStr: string, target: number): string {
  const d = new Date(dateStr)
  const diff = ((target - d.getDay() + 7) % 7) || 7
  return addDays(dateStr, diff)
}

export async function analyzeMeeting(
  _content: string,
  meetingDate: string,
  _myAliases: string   // reserved — passed to real AI for alias-based attribution
): Promise<AnalyzeResult> {
  // STUB — replace body with real Claude API call when ANTHROPIC_API_KEY is set
  await new Promise((r) => setTimeout(r, 1200))

  const thisFriday = nextWeekday(meetingDate, 5)
  const nextMonday = addDays(thisFriday, 3)
  const inTwoDays  = addDays(meetingDate, 2)

  return {
    meeting_summary: [
      {
        title: '支付功能前后端联调已完成，下周正式进入测试阶段',
        owner: null,
        time: nextMonday,
        risk_level: 'low',
      },
      {
        title: '测试资源尚未落实，若本周五前未确认将导致测试计划整体延期',
        owner: '张三',
        time: thisFriday,
        risk_level: 'high',
      },
      {
        title: 'API 接口文档需在本周五前完成更新，否则影响第三方对接',
        owner: '李四',
        time: thisFriday,
        risk_level: 'medium',
      },
      {
        title: '第三方支付 SDK 接口时间节点尚未与外部团队对齐',
        owner: null,
        time: inTwoDays,
        risk_level: 'high',
      },
    ],

    my_tasks: [
      // ── 支付项目 ──────────────────────────────────────────────
      {
        project: '支付项目',
        task: '确认测试资源和测试人员安排',
        progress: '已发邮件至测试负责人，待回复',
        completed_time: null,
        next_milestone: `本周五（${thisFriday}）前完成确认`,
        blocker: '测试团队负责人本周一至三出差，响应较慢',
        need_help: '需王总协调，推动测试团队优先响应',
        risk_level: 'high',
      },
      {
        project: '支付项目',
        task: '编写支付功能测试用例',
        progress: '已完成核心支付流程用例约 30%',
        completed_time: null,
        next_milestone: `下周一（${nextMonday}）前提交完整用例`,
        blocker: null,
        need_help: null,
        risk_level: 'medium',
      },

      // ── 登录优化项目 ──────────────────────────────────────────
      {
        project: '登录优化项目',
        task: '登录页前端改版',
        progress: '设计稿已确认，开发完成 80%',
        completed_time: null,
        next_milestone: `本周五（${thisFriday}）完成自测并提测`,
        blocker: null,
        need_help: null,
        risk_level: 'low',
      },
      {
        project: '登录优化项目',
        task: '图形验证码接入',
        progress: '第三方 SDK 已集成，联调中',
        completed_time: null,
        next_milestone: `下周一（${nextMonday}）前完成联调`,
        blocker: '第三方 SDK 文档有歧义，需向对方确认一个参数含义',
        need_help: null,
        risk_level: 'medium',
      },

      // ── 未分类（project = null）────────────────────────────────
      {
        project: null,
        task: '提交本季度个人复盘文档',
        progress: null,
        completed_time: null,
        next_milestone: `后天（${inTwoDays}）前提交`,
        blocker: null,
        need_help: null,
        risk_level: 'low',
      },
    ],

    related_to_me: [
      {
        task: '更新支付接口 API 文档',
        owner: '李四',
        time_range: `本周五（${thisFriday}）前`,
        my_part: '提供本次接口变更清单和字段说明，供李四同步更新',
        risk_level: 'medium',
      },
      {
        task: '与第三方支付 API 团队对接，确认接口时间节点',
        owner: null,
        time_range: `后天（${inTwoDays}）前`,
        my_part: '参与接口对齐会议，确认我方接口是否满足对方要求',
        risk_level: 'high',
      },
    ],

    other_reminders: [
      {
        item: '下周一全体月度进展会议，需提前准备支付模块进展 PPT',
        person: '全员',
        time: nextMonday,
        importance: 'medium',
      },
      {
        item: '季度绩效自评填写截止，HR 已二次提醒',
        person: 'HR',
        time: inTwoDays,
        importance: 'high',
      },
    ],
  }
}
