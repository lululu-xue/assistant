'use server'

import { createClient } from '@/utils/supabase/server'

async function patchThreadTasks(
  threadId: string,
  patch: (task: Record<string, unknown>) => Record<string, unknown>,
): Promise<boolean> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return false

  const { data: meetings } = await supabase
    .from('meetings')
    .select('id, structured')
    .eq('user_id', user.id)

  for (const m of meetings ?? []) {
    const s = m.structured as Record<string, unknown> | null
    if (!s) continue
    const tasks = s.my_tasks as Record<string, unknown>[] | undefined
    if (!tasks?.some((t) => t.thread_id === threadId)) continue

    await supabase
      .from('meetings')
      .update({
        structured: {
          ...s,
          my_tasks: tasks.map((t) =>
            t.thread_id === threadId ? patch(t) : t,
          ),
        },
      })
      .eq('id', m.id)
      .eq('user_id', user.id)
  }
  return true
}

export async function renameThread(threadId: string, newTitle: string): Promise<boolean> {
  return patchThreadTasks(threadId, (t) => ({ ...t, thread_title: newTitle }))
}

export async function restoreThread(threadId: string): Promise<boolean> {
  return patchThreadTasks(threadId, (t) => ({
    ...t,
    archived: false,
    archived_at: null,
  }))
}
