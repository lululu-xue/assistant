'use client'

import { useState, useTransition } from 'react'
import { Copy, Download, Save, Loader2, Check, Sparkles, FileText, Trash2 } from 'lucide-react'
import type { Report, ReportStructured } from './types'
import { SECTION_LABELS, SECTION_COLORS } from './types'
import { saveReport, deleteReport } from './actions'

function stripMarkdown(md: string): string {
  return md
    .replace(/^#+\s+/gm, '')
    .replace(/\*\*(.*?)\*\*/g, '$1')
    .replace(/\*(.*?)\*/g, '$1')
    .replace(/^-\s+/gm, '• ')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .trim()
}

function downloadFile(content: string, filename: string, mime: string) {
  const blob = new Blob([content], { type: mime })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

export default function ReportClient({
  tags,
  initialReports,
}: {
  tags: string[]
  initialReports: Report[]
}) {
  const [activeTag, setActiveTag] = useState(tags[1] ?? tags[0] ?? '全部')
  const [generating, startGenerate] = useTransition()
  const [saving, startSave] = useTransition()
  const [reports, setReports] = useState<Report[]>(initialReports)
  const [current, setCurrent] = useState<Report | null>(null)
  const [structured, setStructured] = useState<ReportStructured | null>(null)
  const [content, setContent] = useState('')
  const [copied, setCopied] = useState(false)
  const [saveOk, setSaveOk] = useState(false)
  const [error, setError] = useState('')
  const [deleteError, setDeleteError] = useState('')

  function handleGenerate() {
    setError('')
    startGenerate(async () => {
      const res = await fetch('/api/generate-report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tag: activeTag }),
      })
      const data = await res.json()
      if (!res.ok || data.error) {
        setError('AI 生成失败，请重试')
        return
      }
      setCurrent(data.report)
      setStructured(data.structured)
      setContent(data.report.content)
      setReports((prev) => [data.report, ...prev.filter((r) => r.id !== data.report.id)])
    })
  }

  async function handleDelete(e: React.MouseEvent, id: string) {
    e.stopPropagation()
    if (!window.confirm('确认删除这条草稿？')) return
    const ok = await deleteReport(id)
    if (!ok) {
      setDeleteError('删除失败，请重试')
      setTimeout(() => setDeleteError(''), 3000)
      return
    }
    setReports((prev) => prev.filter((r) => r.id !== id))
    if (current?.id === id) {
      setCurrent(null)
      setStructured(null)
      setContent('')
    }
  }

  function handleLoadDraft(r: Report) {
    setCurrent(r)
    setStructured(null)
    setContent(r.content)
    setError('')
  }

  function handleSave() {
    if (!current) return
    setSaveOk(false)
    startSave(async () => {
      const updated = await saveReport(current.id, content)
      if (updated) {
        setCurrent(updated)
        setReports((prev) => prev.map((r) => (r.id === updated.id ? updated : r)))
        setSaveOk(true)
        setTimeout(() => setSaveOk(false), 2000)
      }
    })
  }

  function handleCopy() {
    navigator.clipboard.writeText(content).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  const dateStr = (current?.created_at ?? new Date().toISOString()).split('T')[0]

  return (
    <div className="flex gap-6 items-start">
      {/* Sidebar: history drafts */}
      <aside className="w-52 flex-shrink-0">
        <div className="bg-white rounded-2xl border border-gray-100 p-4">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">历史草稿</p>
          {deleteError && (
            <p className="text-[10px] text-[#FF4D4F] mb-2 px-1">{deleteError}</p>
          )}
          {reports.length === 0 ? (
            <p className="text-xs text-gray-400 text-center py-6">暂无草稿</p>
          ) : (
            <div className="space-y-1">
              {reports.map((r) => (
                <div
                  key={r.id}
                  onClick={() => handleLoadDraft(r)}
                  className={`group flex items-start gap-1 px-3 py-2.5 rounded-xl cursor-pointer transition-colors ${
                    current?.id === r.id ? 'bg-[#3370FF]/10' : 'hover:bg-gray-50'
                  }`}
                >
                  <div className="flex-1 min-w-0">
                    <p className={`text-xs font-medium truncate leading-snug ${
                      current?.id === r.id ? 'text-[#3370FF]' : 'text-gray-700'
                    }`}>
                      {r.tag} 汇报
                    </p>
                    <p className="text-[10px] text-gray-400 mt-0.5">{r.updated_at.split('T')[0]}</p>
                  </div>
                  <button
                    onClick={(e) => handleDelete(e, r.id)}
                    className="opacity-0 group-hover:opacity-100 flex-shrink-0 p-0.5 mt-0.5
                               text-gray-300 hover:text-[#FF4D4F] transition-all"
                    title="删除草稿"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 min-w-0 space-y-4">

        {/* Generate bar */}
        <div className="bg-white rounded-2xl border border-gray-100 px-5 py-4">
          <div className="flex items-center gap-3 flex-wrap">
            <label className="text-sm text-gray-500">汇报范围：</label>
            <select
              value={activeTag}
              onChange={(e) => setActiveTag(e.target.value)}
              className="px-3 py-2 rounded-xl border border-gray-200 text-sm text-gray-800
                         focus:outline-none focus:border-[#3370FF] bg-white"
            >
              {tags.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
            <button
              onClick={handleGenerate}
              disabled={generating}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#3370FF] text-white
                         text-sm font-medium hover:bg-[#2860EE] disabled:opacity-60 transition-colors"
            >
              {generating
                ? <><Loader2 className="w-4 h-4 animate-spin" />生成中…</>
                : <><Sparkles className="w-4 h-4" />生成汇报</>}
            </button>
            {error && <p className="text-sm text-[#FF4D4F]">{error}</p>}
          </div>
        </div>

        {/* 5-section cards (freshly generated) */}
        {structured && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {(Object.keys(SECTION_LABELS) as (keyof ReportStructured)[]).map((key) => {
              const items = structured[key]
              if (!items?.length) return null
              return (
                <div
                  key={key}
                  className={`bg-white rounded-2xl border border-gray-100 border-l-4 p-4 ${SECTION_COLORS[key]}`}
                >
                  <p className="text-xs font-semibold text-gray-500 mb-2">{SECTION_LABELS[key]}</p>
                  <ul className="space-y-1.5">
                    {items.map((item, i) => (
                      <li key={i} className="text-sm text-gray-800 flex items-start gap-2">
                        <span className="text-gray-300 mt-1 flex-shrink-0">·</span>
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )
            })}
          </div>
        )}

        {/* Editor */}
        {current ? (
          <div className="bg-white rounded-2xl border border-gray-100 p-5">
            {/* Toolbar */}
            <div className="flex items-center gap-2 mb-4 flex-wrap">
              <div className="flex items-center gap-1.5 mr-auto min-w-0">
                <FileText className="w-4 h-4 text-gray-400 flex-shrink-0" />
                <p className="text-sm font-medium text-gray-700 truncate">{current.title}</p>
              </div>
              <button
                onClick={handleCopy}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200
                           text-xs text-gray-600 hover:border-[#3370FF]/40 hover:text-[#3370FF] transition-colors"
              >
                {copied
                  ? <><Check className="w-3.5 h-3.5 text-[#52C41A]" />已复制</>
                  : <><Copy className="w-3.5 h-3.5" />复制</>}
              </button>
              <button
                onClick={() => downloadFile(content, `report-${dateStr}.md`, 'text/markdown')}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200
                           text-xs text-gray-600 hover:border-[#3370FF]/40 hover:text-[#3370FF] transition-colors"
              >
                <Download className="w-3.5 h-3.5" />
                Markdown
              </button>
              <button
                onClick={() => downloadFile(stripMarkdown(content), `report-${dateStr}.txt`, 'text/plain')}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200
                           text-xs text-gray-600 hover:border-[#3370FF]/40 hover:text-[#3370FF] transition-colors"
              >
                <Download className="w-3.5 h-3.5" />
                纯文本
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#3370FF] text-white
                           text-xs font-medium hover:bg-[#2860EE] disabled:opacity-60 transition-colors"
              >
                {saving
                  ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  : <Save className="w-3.5 h-3.5" />}
                {saveOk ? '已保存 ✓' : '保存草稿'}
              </button>
            </div>

            {/* Textarea */}
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={22}
              spellCheck={false}
              className="w-full text-sm text-gray-800 font-mono leading-relaxed px-4 py-3
                         rounded-xl border border-gray-200 focus:outline-none focus:border-[#3370FF]
                         resize-y bg-[#FAFAFA] placeholder:text-gray-300"
              placeholder="编辑汇报内容…"
            />
          </div>
        ) : (
          !generating && (
            <div className="bg-white rounded-2xl border border-gray-100 px-8 py-24 text-center">
              <Sparkles className="w-8 h-8 text-gray-200 mx-auto mb-3" />
              <p className="text-sm text-gray-400">选择汇报范围，点击「生成汇报」</p>
              <p className="text-xs text-gray-300 mt-1">
                AI 将基于该 tag 下的会议记录、待办与风险自动生成草稿
              </p>
            </div>
          )
        )}
      </div>
    </div>
  )
}
