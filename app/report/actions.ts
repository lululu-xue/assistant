'use server'

import { createClient } from '@/utils/supabase/server'

export async function saveReport(id: string, content: string) {
  const supabase = await createClient()
  const { data } = await supabase
    .from('reports')
    .update({ content, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select('id, title, content, tag, created_at, updated_at')
    .single()
  return data ?? null
}

export async function deleteReport(id: string): Promise<boolean> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return false
  const { error } = await supabase
    .from('reports')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id)
  return !error
}
