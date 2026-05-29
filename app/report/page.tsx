import { createClient } from '@/utils/supabase/server'
import Sidebar from '@/components/sidebar'
import ReportClient from './report-client'

export default async function ReportPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  // All tags
  const { data: tagRows } = await supabase
    .from('meetings')
    .select('tag')
    .order('created_at', { ascending: false })

  const allTags = [
    '全部',
    ...Array.from(new Set((tagRows ?? []).map((r) => r.tag).filter(Boolean))),
  ]

  // Recent reports
  const { data: reports } = await supabase
    .from('reports')
    .select('id, title, content, tag, created_at, updated_at')
    .order('updated_at', { ascending: false })
    .limit(20)

  return (
    <div className="flex min-h-screen bg-[#F7F8FA]">
      <Sidebar userEmail={user!.email!} />
      <main className="flex-1 px-8 py-8">
        <div className="max-w-5xl mx-auto">
          <h1 className="text-xl font-semibold text-gray-900 mb-6">会前汇报</h1>
          <ReportClient tags={allTags} initialReports={reports ?? []} />
        </div>
      </main>
    </div>
  )
}
