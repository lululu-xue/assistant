'use server'

import { createClient } from '@/utils/supabase/server'

export type TodoStatus = 'open' | 'in_progress' | 'blocked' | 'done'

export async function updateMyTaskStatus(
  meetingId: string,
  taskIndex: number,
  status: TodoStatus,
): Promise<boolean> {
  return readModifyWriteTask(meetingId, taskIndex, { status })
}

async function readModifyWriteTask(
  meetingId: string,
  taskIndex: number,
  patch: Record<string, unknown>,
): Promise<boolean> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return false

  const { data: meeting } = await supabase
    .from('meetings')
    .select('structured')
    .eq('id', meetingId)
    .eq('user_id', user.id)
    .single()

  if (!meeting?.structured) return false
  const structured = meeting.structured as Record<string, unknown>
  const myTasks = [...((structured.my_tasks as Record<string, unknown>[]) ?? [])]
  if (!myTasks[taskIndex]) return false
  myTasks[taskIndex] = { ...myTasks[taskIndex], ...patch }

  const { error } = await supabase
    .from('meetings')
    .update({ structured: { ...structured, my_tasks: myTasks } })
    .eq('id', meetingId)
    .eq('user_id', user.id)
  return !error
}

export async function archiveMyTask(meetingId: string, taskIndex: number): Promise<boolean> {
  return readModifyWriteTask(meetingId, taskIndex, {
    archived: true,
    archived_at: new Date().toISOString(),
  })
}

export async function restoreMyTask(meetingId: string, taskIndex: number): Promise<boolean> {
  return readModifyWriteTask(meetingId, taskIndex, {
    archived: false,
    archived_at: null,
  })
}

export async function createThread(
  title: string,
  tag: string,
  taskMeetingId: string,
  taskIndex: number,
): Promise<{ threadId: string } | null> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: thread, error } = await supabase
    .from('threads')
    .insert({ user_id: user.id, title, tag })
    .select('id')
    .single()
  if (error || !thread) return null

  const ok = await readModifyWriteTask(taskMeetingId, taskIndex, { thread_id: thread.id })
  if (!ok) {
    await supabase.from('threads').delete().eq('id', thread.id)
    return null
  }
  return { threadId: thread.id }
}

export async function assignToThread(
  threadId: string,
  taskMeetingId: string,
  taskIndex: number,
): Promise<boolean> {
  return readModifyWriteTask(taskMeetingId, taskIndex, { thread_id: threadId })
}

export async function dissolveThread(threadId: string): Promise<boolean> {
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
            t.thread_id === threadId ? { ...t, thread_id: null } : t,
          ),
        },
      })
      .eq('id', m.id)
      .eq('user_id', user.id)
  }

  const { error } = await supabase
    .from('threads')
    .delete()
    .eq('id', threadId)
    .eq('user_id', user.id)
  return !error
}

export async function deleteMeeting(id: string): Promise<boolean> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return false

  await supabase.from('todos').delete().eq('meeting_id', id)
  await supabase.from('risks').delete().eq('meeting_id', id)
  const { error } = await supabase.from('meetings').delete().eq('id', id).eq('user_id', user.id)
  return !error
}
