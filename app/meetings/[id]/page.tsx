import { notFound } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'
import Sidebar from '@/components/sidebar'
import MeetingResult from './meeting-result'

export default async function MeetingPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { data: meeting } = await supabase
    .from('meetings')
    .select('id, title, tag, meeting_date, my_aliases, structured')
    .eq('id', id)
    .single()

  if (!meeting) notFound()

  return (
    <div className="flex min-h-screen bg-[#F7F8FA]">
      <Sidebar userEmail={user!.email!} />
      <main className="flex-1 px-8 py-8">
        <MeetingResult meeting={meeting} />
      </main>
    </div>
  )
}
