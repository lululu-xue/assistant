import Link from 'next/link'
import { AlertCircle, CheckCircle2 } from 'lucide-react'
import { createClient } from '@/utils/supabase/server'
import Sidebar from '@/components/sidebar'
import TagFilter from '@/components/tag-filter'
import MeetingsList from './meetings-list'
import TodosList, { type TodoItem, type ThreadInfo } from './todos-list'

type Risk = 'low' | 'medium' | 'high'

interface MyTask {
  project:        string | null
  task:           string
  owner:          string | null
  next_milestone: string | null
  blocker:        string | null
  risk_level:     Risk
  status?:        string
  thread_id?:     string | null
}

interface ReminderItem {
  text: string
  person: string | null
  time: string | null
  risk_level: Risk
  meetingId: string
  meetingTitle: string
}

const RISK_COLOR: Record<Risk, string> = {
  high:   'text-[#FF4D4F] bg-[#FF4D4F]/10',
  medium: 'text-orange-500 bg-orange-50',
  low:    'text-gray-400 bg-gray-100',
}
const RISK_LABEL: Record<Risk, string> = { high: '高风险', medium: '中风险', low: '低风险' }
const RISK_ORDER: Record<Risk, number> = { high: 0, medium: 1, low: 2 }

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ tag?: string }>
}) {
  const { tag: rawTag } = await searchParams
  const activeTag = rawTag || '全部'

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  // All tags for filter
  const { data: tagRows } = await supabase
    .from('meetings')
    .select('tag')
    .order('created_at', { ascending: false })

  const allTags = [
    '全部',
    ...Array.from(new Set((tagRows ?? []).map((r) => r.tag).filter(Boolean))),
  ]

  // Meetings (filtered by tag)
  let query = supabase
    .from('meetings')
    .select('id, title, tag, meeting_date, summary, structured')
    .order('meeting_date', { ascending: false })
    .limit(30)

  if (activeTag !== '全部') query = query.eq('tag', activeTag)

  const { data: meetings } = await query

  // Threads (all for user, filter client-side in modal)
  const { data: threadRows } = await supabase
    .from('threads')
    .select('id, title, tag')
    .order('created_at', { ascending: false })
  const allThreads: ThreadInfo[] = threadRows ?? []

  // Aggregate from structured
  const todoItems: TodoItem[] = []
  const reminders: ReminderItem[] = []

  for (const m of meetings ?? []) {
    const s = m.structured as Record<string, unknown> | null
    if (!s) continue

    const rawTasks = (s.my_tasks as MyTask[] | undefined) ?? []
    rawTasks.forEach((t, idx) => {
      if ((t as unknown as Record<string, unknown>).archived === true) return
      todoItems.push({
        index:          idx,
        project:        t.project ?? null,
        task:           t.task,
        owner:          t.owner ?? null,
        next_milestone: t.next_milestone ?? null,
        blocker:        t.blocker ?? null,
        risk_level:     t.risk_level,
        status:         (t.status as TodoItem['status']) ?? 'open',
        thread_id:      (t.thread_id as string | null) ?? null,
        tag:            m.tag,
        meetingId:      m.id,
        meetingTitle:   m.title,
        meetingDate:    m.meeting_date,
      })
    })

    for (const t of (s.meeting_summary as { title: string; owner: string | null; time: string | null; risk_level: Risk }[] | undefined) ?? []) {
      if (t.risk_level === 'high') {
        reminders.push({
          text: t.title, person: t.owner, time: t.time,
          risk_level: 'high', meetingId: m.id, meetingTitle: m.title,
        })
      }
    }

    for (const r of (s.other_reminders as { item: string; person: string | null; time: string | null; importance: Risk }[] | undefined) ?? []) {
      reminders.push({
        text: r.item, person: r.person, time: r.time,
        risk_level: r.importance, meetingId: m.id, meetingTitle: m.title,
      })
    }
  }

  todoItems.sort((a, b) => RISK_ORDER[a.risk_level] - RISK_ORDER[b.risk_level])
  reminders.sort((a, b) => RISK_ORDER[a.risk_level] - RISK_ORDER[b.risk_level])

  const recentMeetings = (meetings ?? []).slice(0, 5)
  const isEmpty = (meetings ?? []).length === 0

  return (
    <div className="flex min-h-screen bg-[#F7F8FA]">
      <Sidebar userEmail={user!.email!} />
      <main className="flex-1 px-8 py-8">
        <div className="max-w-5xl mx-auto space-y-5">
          <h1 className="text-xl font-semibold text-gray-900">Dashboard</h1>

          <TagFilter tags={allTags} active={activeTag} />

          {/* Stats */}
          <div className="grid grid-cols-3 gap-4">
            <StatCard label="待办事项" value={todoItems.length} />
            <StatCard
              label="高风险"
              value={todoItems.filter((t) => t.risk_level === 'high').length}
              valueClass="text-[#FF4D4F]"
            />
            <StatCard label="会议数" value={(meetings ?? []).length} />
          </div>

          {isEmpty ? (
            <div className="bg-white rounded-2xl border border-gray-100 px-8 py-20 text-center">
              <p className="text-sm text-gray-400 mb-4">暂无数据，上传第一条会议记录吧</p>
              <Link
                href="/upload"
                className="inline-flex items-center px-4 py-2 rounded-xl bg-[#3370FF]
                           text-white text-sm font-medium hover:bg-[#2860EE] transition-colors"
              >
                去上传会议
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* My Tasks */}
              <div className="bg-white rounded-2xl border border-gray-100 p-5">
                <h2 className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-[#3370FF]" />
                  我的待办
                  <span className="ml-auto text-xs font-normal text-gray-400">{todoItems.length} 条</span>
                </h2>
                <TodosList initialTasks={todoItems} initialThreads={allThreads} />
              </div>

              {/* Right column */}
              <div className="space-y-5">
                {/* Reminders / Risks */}
                <div className="bg-white rounded-2xl border border-gray-100 p-5">
                  <h2 className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-[#FF4D4F]" />
                    提醒 &amp; 风险
                    <span className="ml-auto text-xs font-normal text-gray-400">{reminders.length} 条</span>
                  </h2>
                  {reminders.length === 0 ? (
                    <p className="text-xs text-gray-400 py-4 text-center">暂无提醒</p>
                  ) : (
                    <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
                      {reminders.slice(0, 10).map((r, i) => (
                        <Link key={i} href={`/meetings/${r.meetingId}`} className="block group">
                          <div
                            className={`rounded-xl px-3 py-2.5 transition-all hover:border-[#3370FF]/30 ${
                              r.risk_level === 'high'
                                ? 'bg-[#FF4D4F]/5 border border-[#FF4D4F]/20'
                                : 'border border-gray-100'
                            }`}
                          >
                            <p className="text-sm text-gray-800 leading-snug">{r.text}</p>
                            <div className="flex items-center gap-2 mt-0.5 text-xs text-gray-400">
                              {r.person && <span>{r.person}</span>}
                              {r.time && <span>· {r.time}</span>}
                              <span className="ml-auto text-[10px] truncate group-hover:text-gray-500">
                                {r.meetingTitle}
                              </span>
                            </div>
                          </div>
                        </Link>
                      ))}
                    </div>
                  )}
                </div>

                {/* Recent meetings */}
                <div className="bg-white rounded-2xl border border-gray-100 p-5">
                  <h2 className="text-sm font-semibold text-gray-700 mb-4">最近会议</h2>
                  <MeetingsList meetings={recentMeetings} />
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}

function StatCard({
  label,
  value,
  valueClass = 'text-gray-900',
}: {
  label: string
  value: number
  valueClass?: string
}) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 px-5 py-4">
      <p className="text-xs text-gray-400 mb-1">{label}</p>
      <p className={`text-2xl font-semibold ${valueClass}`}>{value}</p>
    </div>
  )
}
