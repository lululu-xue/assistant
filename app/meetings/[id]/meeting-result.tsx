'use client'

import { Globe, User, Users, Bell } from 'lucide-react'

// ── Types ─────────────────────────────────────────────────────────

type Risk = 'low' | 'medium' | 'high'

interface MeetingSummaryItem {
  title: string
  owner: string | null
  time: string | null
  risk_level: Risk
}

interface MyTask {
  project: string | null
  task: string
  progress: string | null
  completed_time: string | null
  next_milestone: string | null
  blocker: string | null
  need_help: string | null
  risk_level: Risk
}

interface RelatedTask {
  task: string
  owner: string | null
  time_range: string | null
  my_part: string | null
  risk_level: Risk
}

interface OtherReminder {
  item: string
  person: string | null
  time: string | null
  importance: Risk
}

interface Structured {
  meeting_summary?: MeetingSummaryItem[]
  my_tasks?: MyTask[]
  related_to_me?: RelatedTask[]
  other_reminders?: OtherReminder[]
  _failed?: boolean
}

interface Meeting {
  id: string
  title: string
  tag: string
  meeting_date: string
  my_aliases: string | null
  structured: Structured | null
}

// ── Shared helpers ────────────────────────────────────────────────

const riskBorder = {
  high:   'border-l-4 border-red-400',
  medium: 'border-l-4 border-amber-300',
  low:    'border-l-4 border-transparent',
}

const riskBadge = {
  high:   'bg-red-100 text-red-700',
  medium: 'bg-amber-100 text-amber-700',
  low:    'bg-green-100 text-green-700',
}

const riskLabel = { high: '高风险', medium: '中风险', low: '低风险' }

function Badge({ level }: { level: Risk }) {
  return (
    <span className={`text-xs px-2 py-0.5 rounded-full flex-shrink-0 ${riskBadge[level]}`}>
      {riskLabel[level]}
    </span>
  )
}

// Fixed field — always rendered; shows "—" when value is null/empty
function F({ label, value, className }: { label: string; value: string | null | undefined; className?: string }) {
  return (
    <div className={`flex gap-1.5 text-xs leading-relaxed ${className ?? ''}`}>
      <span className="text-gray-400 flex-shrink-0">{label}</span>
      <span className={value ? 'text-gray-700' : 'text-gray-300'}>{value || '—'}</span>
    </div>
  )
}

function Empty({ text }: { text: string }) {
  return <p className="text-sm text-gray-300 py-1">{text}</p>
}

function Card({
  title,
  icon,
  children,
}: {
  title: string
  icon: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-5">
      <div className="flex items-center gap-2 mb-4">
        <span className="text-[#3370FF]">{icon}</span>
        <h2 className="text-sm font-semibold text-gray-800">{title}</h2>
      </div>
      {children}
    </div>
  )
}

// ── Section renderers ─────────────────────────────────────────────

function SectionMeetingSummary({ items }: { items: MeetingSummaryItem[] }) {
  if (!items.length) return <Empty text="本次会议暂无全局大事记录" />
  return (
    <div className="space-y-2">
      {items.map((item, i) => (
        <div
          key={i}
          className={`rounded-xl bg-gray-50 px-4 py-3 ${riskBorder[item.risk_level]}`}
        >
          <div className="flex items-start justify-between gap-3 mb-2">
            <p className="text-sm text-gray-800 leading-snug">{item.title}</p>
            <Badge level={item.risk_level} />
          </div>
          <div className="space-y-0.5">
            <F label="负责人：" value={item.owner} />
            <F label="时间：" value={item.time} />
          </div>
        </div>
      ))}
    </div>
  )
}

function MyTaskCard({ task }: { task: MyTask }) {
  return (
    <div className={`rounded-xl bg-gray-50 px-4 py-3 ${riskBorder[task.risk_level]}`}>
      <div className="flex items-start justify-between gap-3 mb-2">
        <p className="text-sm text-gray-800 leading-snug">{task.task}</p>
        <Badge level={task.risk_level} />
      </div>
      <div className="space-y-0.5">
        <F label="进度：" value={task.progress} />
        <F label="完成时间：" value={task.completed_time} />
        <F label="下一节点：" value={task.next_milestone} />
        <F label="卡点：" value={task.blocker} className="[&>span]:text-red-500" />
        <F label="需谁配合：" value={task.need_help} />
      </div>
    </div>
  )
}

function SectionMyTasks({ items }: { items: MyTask[] }) {
  if (!items.length) return <Empty text="本次会议中未识别到属于你的主责事项" />

  // Group by project; null → "未分类项目"
  const order: string[] = []
  const groups: Record<string, MyTask[]> = {}
  for (const task of items) {
    const key = task.project ?? '未分类项目'
    if (!groups[key]) {
      order.push(key)
      groups[key] = []
    }
    groups[key].push(task)
  }

  return (
    <div className="space-y-5">
      {order.map((proj) => (
        <div key={proj}>
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">
            {proj}
          </p>
          <div className="space-y-2">
            {groups[proj].map((task, i) => (
              <MyTaskCard key={i} task={task} />
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

function SectionRelatedToMe({ items }: { items: RelatedTask[] }) {
  if (!items.length) return <Empty text="本次会议中暂无需要你配合的事项" />
  return (
    <div className="space-y-2">
      {items.map((item, i) => (
        <div
          key={i}
          className={`rounded-xl bg-gray-50 px-4 py-3 ${riskBorder[item.risk_level]}`}
        >
          <div className="flex items-start justify-between gap-3 mb-2">
            <p className="text-sm text-gray-800 leading-snug">{item.task}</p>
            <Badge level={item.risk_level} />
          </div>
          <div className="space-y-0.5">
            <F label="负责人：" value={item.owner} />
            <F label="时间区间：" value={item.time_range} />
            <F label="我的职责：" value={item.my_part} />
          </div>
        </div>
      ))}
    </div>
  )
}

function SectionOtherReminders({ items }: { items: OtherReminder[] }) {
  if (!items.length) return <Empty text="暂无其他提醒事项" />
  return (
    <div className="space-y-2">
      {items.map((item, i) => (
        <div
          key={i}
          className={`rounded-xl bg-gray-50 px-4 py-3 ${riskBorder[item.importance]}`}
        >
          <div className="flex items-start justify-between gap-3 mb-2">
            <p className="text-sm text-gray-800 leading-snug">{item.item}</p>
            <Badge level={item.importance} />
          </div>
          <div className="space-y-0.5">
            <F label="相关人：" value={item.person} />
            <F label="时间：" value={item.time} />
          </div>
        </div>
      ))}
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────

export default function MeetingResult({ meeting }: { meeting: Meeting }) {
  const s         = meeting.structured   ?? {}
  const summary   = s.meeting_summary    ?? []
  const myTasks   = s.my_tasks           ?? []
  const related   = s.related_to_me      ?? []
  const reminders = s.other_reminders    ?? []
  const failed    = s._failed            ?? false

  return (
    <div className="max-w-3xl mx-auto space-y-5">
      {/* AI 分析失败提示 */}
      {failed && (
        <div className="rounded-xl bg-amber-50 border border-amber-200 px-4 py-3 text-sm text-amber-700">
          AI 分析失败，内容已保存。请返回重新上传，或稍后刷新重试。
        </div>
      )}

      {/* Header */}
      <div>
        <h1 className="text-xl font-semibold text-gray-900">
          {meeting.title || '会议分析结果'}
        </h1>
        <div className="flex items-center gap-2 mt-1.5 flex-wrap">
          <span className="text-xs px-2 py-0.5 rounded-full bg-[#3370FF]/10 text-[#3370FF]">
            {meeting.tag}
          </span>
          <span className="text-xs text-gray-400">{meeting.meeting_date}</span>
          {meeting.my_aliases && (
            <span className="text-xs text-gray-400">
              · 我的称呼：{meeting.my_aliases}
            </span>
          )}
        </div>
      </div>

      {/* ① 会议总结（全局） */}
      <Card title="会议总结（全局）" icon={<Globe className="w-4 h-4" />}>
        <SectionMeetingSummary items={summary} />
      </Card>

      {/* ② 我的事项 */}
      <Card title="我的事项（主责）" icon={<User className="w-4 h-4" />}>
        <SectionMyTasks items={myTasks} />
      </Card>

      {/* ③ 与我相关 */}
      <Card title="与我相关（配合）" icon={<Users className="w-4 h-4" />}>
        <SectionRelatedToMe items={related} />
      </Card>

      {/* ④ 其他提醒 */}
      <Card title="其他提醒" icon={<Bell className="w-4 h-4" />}>
        <SectionOtherReminders items={reminders} />
      </Card>
    </div>
  )
}
