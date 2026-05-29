import { createClient } from '@/utils/supabase/server'
import Sidebar from '@/components/sidebar'
import TagFilter from '@/components/tag-filter'
import ArchiveClient, { type ArchivedTask } from './archive-client'

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

  const archivedTasks: ArchivedTask[] = []
  for (const m of meetings ?? []) {
    const s = m.structured as Record<string, unknown> | null
    if (!s) continue
    const tasks = (s.my_tasks as Record<string, unknown>[] | undefined) ?? []
    tasks.forEach((t, idx) => {
      if (t.archived !== true) return
      archivedTasks.push({
        index:        idx,
        task:         String(t.task ?? ''),
        owner:        t.owner ? String(t.owner) : null,
        meetingId:    m.id,
        meetingTitle: m.title,
        meetingDate:  m.meeting_date,
        tag:          m.tag,
        archivedAt:   t.archived_at ? String(t.archived_at) : null,
      })
    })
  }

  archivedTasks.sort((a, b) => {
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
          <ArchiveClient tasks={archivedTasks} />
        </div>
      </main>
    </div>
  )
}
