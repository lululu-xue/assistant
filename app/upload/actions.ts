'use server'

import { redirect } from 'next/navigation'
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
  const meetingDateInput = (formData.get('meeting_date') as string) || ''
  const meetingDate =
    meetingDateInput || new Date().toISOString().split('T')[0]

  // ── Extract text content ──────────────────────────────────────
  let content = ''

  if (file && file.size > 0) {
    const fileName = file.name.toLowerCase()
    if (fileName.endsWith('.docx')) {
      const mammoth = await import('mammoth')
      const buffer = Buffer.from(await file.arrayBuffer())
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

  const derivedTitle =
    title || content.replace(/\n/g, ' ').slice(0, 40)

  // ── Insert meeting row ────────────────────────────────────────
  const { data: meeting, error: meetingErr } = await supabase
    .from('meetings')
    .insert({
      user_id: user.id,
      title: derivedTitle,
      tag,
      meeting_date: meetingDate,
      content,
    })
    .select('id')
    .single()

  if (meetingErr || !meeting) {
    return { error: '会议保存失败：' + (meetingErr?.message ?? '未知错误') }
  }

  // ── AI analysis (stub) ────────────────────────────────────────
  const result = await analyzeMeeting(content, meetingDate)

  // ── Update meeting with analysis ──────────────────────────────
  await supabase
    .from('meetings')
    .update({
      summary: result.summary,
      structured: {
        progress: result.progress,
        conclusions: result.conclusions,
        time_nodes: result.time_nodes,
      },
    })
    .eq('id', meeting.id)

  // ── Insert todos (inherit tag + user_id) ──────────────────────
  if (result.todos.length > 0) {
    await supabase.from('todos').insert(
      result.todos.map((todo) => ({
        user_id: user.id,
        meeting_id: meeting.id,
        tag,
        task: todo.task,
        owner: todo.owner,
        deadline_text: todo.deadline_text,
        deadline_date: todo.deadline_date,
        risk_level: todo.risk_level,
      }))
    )
  }

  // ── Insert risks (inherit tag + user_id) ──────────────────────
  if (result.risks.length > 0) {
    await supabase.from('risks').insert(
      result.risks.map((risk) => ({
        user_id: user.id,
        meeting_id: meeting.id,
        tag,
        content: risk.content,
        level: risk.level,
      }))
    )
  }

  redirect('/meetings/' + meeting.id)
}
