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
    done_items:        toArr(r.done_items),
    in_progress_items: toArr(r.in_progress_items),
    blocked_items:     toArr(r.blocked_items),
    open_items:        toArr(r.open_items),
    next_plan:         toArr(r.next_plan),
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

  // Collect all my_tasks from all meetings, grouped by status
  type RawTask = { task: string; next_milestone?: string | null; status?: string }
  const byStatus: Record<string, string[]> = {
    done: [], in_progress: [], blocked: [], open: [],
  }
  const recentSummaries: string[] = []

  for (const m of meetings ?? []) {
    const s = m.structured as Record<string, unknown> | null
    if (!s) continue

    for (const t of ((s.my_tasks as RawTask[]) ?? [])) {
      const status = t.status ?? 'open'
      const line = t.task + (t.next_milestone ? `（${t.next_milestone}）` : '')
      if (status in byStatus) byStatus[status].push(line)
    }

    if (m.summary) recentSummaries.push(`[${m.meeting_date}] ${m.summary}`)
  }

  const fmt = (arr: string[]) =>
    arr.length ? arr.map((t) => `- ${t}`).join('\n') : '（暂无）'

  const prompt = `你是 AI 会议汇报助手。请基于以下「${tagLabel}」相关的待办事项，生成一份适合会前同步的简洁汇报。

已完成事项：
${fmt(byStatus.done)}

进行中事项：
${fmt(byStatus.in_progress)}

受阻碍事项：
${fmt(byStatus.blocked)}

待处理事项：
${fmt(byStatus.open)}

最近 3 次会议总结：
${fmt(recentSummaries.slice(0, 3))}

请输出严格 JSON（不要额外文字）：
{
  "done_items": ["已完成的事项，简洁描述"],
  "in_progress_items": ["进行中的事项，注明当前进展"],
  "blocked_items": ["受阻碍的事项，注明阻碍原因"],
  "open_items": ["待处理的事项"],
  "next_plan": ["根据以上情况建议下步重点推进的事项"]
}
内容简洁，可直接用于会议口头同步，避免空话。`

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
