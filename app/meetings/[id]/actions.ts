'use server'

import { createClient } from '@/utils/supabase/server'

export async function updateStructured(
  meetingId: string,
  structured: object
): Promise<{ error: string } | null> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: '未登录' }

  const { error } = await supabase
    .from('meetings')
    .update({ structured })
    .eq('id', meetingId)
    .eq('user_id', user.id)

  if (error) return { error: error.message }
  return null
}
