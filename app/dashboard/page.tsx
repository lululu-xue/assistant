import { createClient } from '@/utils/supabase/server'
import { logout } from '@/app/actions/auth'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  return (
    <div className="min-h-screen bg-[#F7F8FA] flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-2xl font-semibold text-gray-900 mb-2">Dashboard</h1>
        <p className="text-gray-500 mb-6">已登录：{user?.email}</p>
        <form action={logout}>
          <button
            type="submit"
            className="px-4 py-2 rounded-xl border border-gray-200 text-sm text-gray-600
                       hover:bg-gray-100 transition-colors"
          >
            退出登录
          </button>
        </form>
      </div>
    </div>
  )
}
