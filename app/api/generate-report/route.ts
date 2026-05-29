import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'
import { createClient } from '@/utils/supabase/server'
import type { ReportStructured } from '@/app/report/types'
import { SECTION_LABELS } from '@/app/report/types'

const client = new OpenAI({
  apiKey: process.env.DEEPSEEK_API_KEY ?? '',
  baseURL: 'https://api.deepseek.com',
})

function structuredToMarkdown(tag: string, s: ReportStructured): string {
  const lines: string[] = [`# 会前汇报 — ${tag}\n`]
  for (const [key, label] of Object.entries(SECTION_LABELS) as [keyof ReportStructured, string][]) {
    const items = s[key]
    if (items?.length) {
      lines.push(`## ${label}`)
      items.forEach((item) => lines.push(`- ${item}`))
      lines.push('')
    }
  }
  return lines.join('\n')
}

function validateStructured(raw: unknown): ReportStructured {
  if (typeof raw !== 'object' || raw === null) throw new Error('not object')
  const r = raw as Record<string, unknown>
  const toArr = (v: unknown): string[] =>
    Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : []
  return {
    weekly_progress: toArr(r.weekly_progress),
    current_risks:   toArr(r.current_risks),
    blockers:        toArr(r.blockers),
    suggested_sync:  toArr(r.suggested_sync),
    next_plan:       toArr(r.next_plan),
  }
}

async function callDeepSeek(prompt: string): Promise<ReportStructured> {
  const completion = await client.chat.completions.create({
    model: 'deepseek-chat',
    response_format: { type: 'json_object' },
    messages: [{ role: 'user', content: prompt }],
    temperature: 0.3,
  })
  return validateStructured(JSON.parse(completion.choices[0]?.message?.content ?? ''))
}

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { tag } = (await req.json()) as { tag: string }
  const tagLabel = tag || '全部'

  let meetingsQuery = supabase
    .from('meetings')
    .select('id, title, meeting_date, summary, structured')
    .order('meeting_date', { ascending: false })
    .limit(10)
  if (tagLabel !== '全部') meetingsQuery = meetingsQuery.eq('tag', tagLabel)
  const { data: meetings } = await meetingsQuery

  // Todos: only from the latest meeting
  const openTodos: string[] = []
  const latestMeeting = meetings?.[0]
  if (latestMeeting) {
    const { data: todos } = await supabase
      .from('todos')
      .select('task, owner, deadline_text')
      .eq('meeting_id', latestMeeting.id)
      .eq('status', 'open')
    for (const t of todos ?? []) {
      openTodos.push(t.task + (t.deadline_text ? `（${t.deadline_text}）` : ''))
    }
  }

  // Risks and summaries: from all recent meetings (unchanged)
  const openRisks: string[] = []
  const recentSummaries: string[] = []
  for (const m of meetings ?? []) {
    const s = m.structured as Record<string, unknown> | null
    if (!s) continue
    for (const r of (s.meeting_summary as { title: string; risk_level: string }[] | undefined) ?? []) {
      if (r.risk_level === 'high' || r.risk_level === 'medium') openRisks.push(r.title)
    }
    if (m.summary) recentSummaries.push(`[${m.meeting_date}] ${m.summary}`)
  }

  const prompt = `你是 AI 会议汇报助手。请基于以下「${tagLabel}」相关的上下文，生成一份适合口头/书面同步的简洁汇报。

未完成 Todo：
${openTodos.length ? openTodos.map((t) => `- ${t}`).join('\n') : '（暂无）'}

当前风险：
${openRisks.length ? openRisks.map((r) => `- ${r}`).join('\n') : '（暂无）'}

最近 3 次会议总结：
${recentSummaries.slice(0, 3).length ? recentSummaries.slice(0, 3).map((s) => `- ${s}`).join('\n') : '（暂无）'}

请输出严格 JSON（不要额外文字）：
{
  "weekly_progress": ["..."],
  "current_risks": ["..."],
  "blockers": ["..."],
  "suggested_sync": ["本次建议重点同步内容"],
  "next_plan": ["下周计划"]
}
内容要简洁、可直接用于汇报，避免空话。`

  let structured: ReportStructured | null = null
  try { structured = await callDeepSeek(prompt) } catch { /* retry */ }
  if (!structured) {
    try { structured = await callDeepSeek(prompt) } catch {
      return NextResponse.json({ error: 'AI_FAILED' }, { status: 500 })
    }
  }

  const title = `${tagLabel} 会前汇报 ${new Date().toISOString().split('T')[0]}`
  const content = structuredToMarkdown(tagLabel, structured)

  const { data: report, error } = await supabase
    .from('reports')
    .insert({ user_id: user.id, tag: tagLabel, title, content })
    .select('id, title, content, tag, created_at, updated_at')
    .single()

  if (error || !report) return NextResponse.json({ error: 'DB_FAILED' }, { status: 500 })

  return NextResponse.json({ report, structured })
}
