'use server'

import { redirect } from 'next/navigation'
import mammoth from 'mammoth'
import { createClient } from '@/utils/supabase/server'
import { analyzeMeeting } from '@/lib/ai/analyzeMeeting'

export async function uploadMeeting(
  formData: FormData
): Promise<{ error: string } | never> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  // ── Parse inputs ──────────────────────────────────────────────
  const file = formData.get('file') as File | null
  const pastedText = (formData.get('text') as string) ?? ''
  const tag = ((formData.get('tag') as string) || '未分类').trim()
  const title = ((formData.get('title') as string) || '').trim()
  const myAliases = ((formData.get('my_aliases') as string) || '').trim()
  const meetingDateInput = (formData.get('meeting_date') as string) || ''
  const meetingDate =
    meetingDateInput || new Date().toISOString().split('T')[0]

  // ── Extract text content ──────────────────────────────────────
  let content = ''

  if (file && file.size > 0) {
    const fileName = file.name.toLowerCase()
    if (fileName.endsWith('.docx')) {
      const arrayBuffer = await file.arrayBuffer()
      const buffer = Buffer.from(arrayBuffer)
      const { value } = await mammoth.extractRawText({ buffer })
      content = value
    } else {
      content = await file.text()
    }
  } else if (pastedText.trim()) {
    content = pastedText.trim()
  }

  if (content.length < 20) {
    return { error: '内容太短，请上传有效的会议记录（至少 20 字）' }
  }

  const derivedTitle = title || content.replace(/\n/g, ' ').slice(0, 40)

  // ── Insert meeting row ────────────────────────────────────────
  const { data: meeting, error: meetingErr } = await supabase
    .from('meetings')
    .insert({
      user_id: user.id,
      title: derivedTitle,
      tag,
      meeting_date: meetingDate,
      content,
      my_aliases: myAliases || null,
    })
    .select('id')
    .single()

  if (meetingErr || !meeting) {
    return { error: '会议保存失败：' + (meetingErr?.message ?? '未知错误') }
  }

  // ── AI analysis (stub) ────────────────────────────────────────
  const result = await analyzeMeeting(content, meetingDate, myAliases)

  // ── Update meeting with 4-section structured result ───────────
  await supabase
    .from('meetings')
    .update({
      structured: {
        meeting_summary: result.meeting_summary,
        my_tasks:        result.my_tasks,
        related_to_me:   result.related_to_me,
        other_reminders: result.other_reminders,
        other_projects:  result.other_projects,
        ...(result._failed ? { _failed: true } : {}),
      },
    })
    .eq('id', meeting.id)

  redirect('/meetings/' + meeting.id)
}
