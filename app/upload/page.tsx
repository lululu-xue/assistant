import { createClient } from '@/utils/supabase/server'
import Sidebar from '@/components/sidebar'
import UploadForm from './upload-form'

export default async function UploadPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { data: tagRows } = await supabase
    .from('meetings')
    .select('tag')
    .eq('user_id', user!.id)

  const rawTags = (tagRows ?? []).map((r) => r.tag as string).filter(Boolean)
  const tags = ['未分类', ...new Set(rawTags.filter((t) => t !== '未分类'))]

  return (
    <div className="flex min-h-screen bg-[#F7F8FA]">
      <Sidebar userEmail={user!.email!} />
      <main className="flex-1 px-8 py-8">
        <div className="max-w-2xl mx-auto">
          <h1 className="text-xl font-semibold text-gray-900 mb-6">上传会议记录</h1>
          <div className="bg-white rounded-2xl border border-gray-100 p-6">
            <UploadForm existingTags={tags} />
          </div>
        </div>
      </main>
    </div>
  )
}
