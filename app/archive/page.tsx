import { createClient } from '@/utils/supabase/server'
import Sidebar from '@/components/sidebar'
import TagFilter from '@/components/tag-filter'
import ArchiveClient, { type ArchivedTask, type ThreadGroup } from './archive-client'

export default async function ArchivePage({
  searchParams,
}: {
  searchParams: Promise<{ tag?: string }>
}) {
  const { tag: rawTag } = await searchParams
  const activeTag = rawTag || '全部'

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: tagRows } = await supabase
    .from('meetings')
    .select('tag')
    .order('created_at', { ascending: false })
  const allTags = [
    '全部',
    ...Array.from(new Set((tagRows ?? []).map((r) => r.tag).filter(Boolean))),
  ]

  let query = supabase
    .from('meetings')
    .select('id, title, tag, meeting_date, structured')
    .order('meeting_date', { ascending: false })
    .limit(100)
  if (activeTag !== '全部') query = query.eq('tag', activeTag)
  const { data: meetings } = await query

  // Collect all archived tasks
  const allArchived: ArchivedTask[] = []
  for (const m of meetings ?? []) {
    const s = m.structured as Record<string, unknown> | null
    if (!s) continue
    const tasks = (s.my_tasks as Record<string, unknown>[] | undefined) ?? []
    tasks.forEach((t, idx) => {
      if (t.archived !== true) return
      allArchived.push({
        index:        idx,
        task:         String(t.task ?? ''),
        owner:        t.owner ? String(t.owner) : null,
        meetingId:    m.id,
        meetingTitle: m.title,
        meetingDate:  m.meeting_date,
        tag:          m.tag,
        archivedAt:   t.archived_at ? String(t.archived_at) : null,
        threadId:     t.thread_id ? String(t.thread_id) : null,
        threadTitle:  t.thread_title ? String(t.thread_title) : null,
      })
    })
  }

  // Split into threaded and independent
  const threadMap = new Map<string, ArchivedTask[]>()
  const independentTasks: ArchivedTask[] = []

  for (const t of allArchived) {
    if (t.threadId) {
      if (!threadMap.has(t.threadId)) threadMap.set(t.threadId, [])
      threadMap.get(t.threadId)!.push(t)
    } else {
      independentTasks.push(t)
    }
  }

  // Build thread groups sorted by most recent archivedAt
  const threadGroups: ThreadGroup[] = [...threadMap.entries()].map(([threadId, tasks]) => {
    const latestAt = tasks
      .map((t) => t.archivedAt)
      .filter(Boolean)
      .sort()
      .reverse()[0] ?? null
    const title = tasks.find((t) => t.threadTitle)?.threadTitle ?? '未命名线索'
    return { threadId, threadTitle: title, archivedAt: latestAt, tasks }
  })
  threadGroups.sort((a, b) => {
    if (!a.archivedAt) return 1
    if (!b.archivedAt) return -1
    return b.archivedAt.localeCompare(a.archivedAt)
  })

  // Independent sorted by archivedAt desc
  independentTasks.sort((a, b) => {
    if (!a.archivedAt) return 1
    if (!b.archivedAt) return -1
    return b.archivedAt.localeCompare(a.archivedAt)
  })

  return (
    <div className="flex min-h-screen bg-[#F7F8FA]">
      <Sidebar userEmail={user!.email!} />
      <main className="flex-1 px-8 py-8">
        <div className="max-w-3xl mx-auto space-y-5">
          <h1 className="text-xl font-semibold text-gray-900">归档记录</h1>
          <TagFilter tags={allTags} active={activeTag} />
          <ArchiveClient threadGroups={threadGroups} independentTasks={independentTasks} />
        </div>
      </main>
    </div>
  )
}
