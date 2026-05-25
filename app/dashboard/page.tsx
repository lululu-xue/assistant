import Link from 'next/link'
import { createClient } from '@/utils/supabase/server'
import Sidebar from '@/components/sidebar'

export default async function DashboardPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { data: meetings } = await supabase
    .from('meetings')
    .select('id, title, tag, meeting_date, summary')
    .order('created_at', { ascending: false })
    .limit(5)

  return (
    <div className="flex min-h-screen bg-[#F7F8FA]">
      <Sidebar userEmail={user!.email!} />
      <main className="flex-1 px-8 py-8">
        <div className="max-w-3xl mx-auto">
          <h1 className="text-xl font-semibold text-gray-900 mb-6">最近会议</h1>

          {meetings && meetings.length > 0 ? (
            <div className="space-y-3">
              {meetings.map((m) => (
                <Link
                  key={m.id}
                  href={`/meetings/${m.id}`}
                  className="flex items-start justify-between gap-4 bg-white rounded-2xl
                             border border-gray-100 px-5 py-4 hover:border-[#3370FF]/30
                             hover:shadow-sm transition-all"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {m.title || '未命名会议'}
                    </p>
                    {m.summary && (
                      <p className="text-xs text-gray-400 mt-0.5 line-clamp-1">
                        {m.summary}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className="text-xs px-2 py-0.5 rounded-full bg-[#3370FF]/10 text-[#3370FF]">
                      {m.tag}
                    </span>
                    <span className="text-xs text-gray-400 tabular-nums">
                      {m.meeting_date}
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-gray-100 px-8 py-16 text-center">
              <p className="text-sm text-gray-400 mb-4">还没有会议记录</p>
              <Link
                href="/upload"
                className="inline-flex items-center px-4 py-2 rounded-xl bg-[#3370FF]
                           text-white text-sm font-medium hover:bg-[#2860EE] transition-colors"
              >
                上传第一条会议
              </Link>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
