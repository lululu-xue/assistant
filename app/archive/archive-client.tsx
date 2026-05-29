'use client'

import { useState, useRef } from 'react'
import { RotateCcw, ChevronRight, Pencil } from 'lucide-react'
import { restoreMyTask } from '@/app/dashboard/actions'
import { renameThread, restoreThread } from './actions'

export interface ArchivedTask {
  index:        number
  task:         string
  owner:        string | null
  meetingId:    string
  meetingTitle: string
  meetingDate:  string
  tag:          string
  archivedAt:   string | null
  threadId:     string | null
  threadTitle:  string | null
}

export interface ThreadGroup {
  threadId:    string
  threadTitle: string
  archivedAt:  string | null
  tasks:       ArchivedTask[]
}

function IndependentCard({
  t,
  onRestore,
}: {
  t: ArchivedTask
  onRestore: (meetingId: string, index: number) => void
}) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 px-5 py-4 flex items-start justify-between gap-4">
      <div className="flex-1 min-w-0">
        <p className="text-sm text-gray-500 line-through truncate">{t.task}</p>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 mt-1 text-xs text-gray-400">
          {t.owner && <span>{t.owner}</span>}
          <span>{t.meetingTitle}</span>
          <span className="px-1.5 py-0.5 rounded-full bg-[#3370FF]/10 text-[#3370FF]">{t.tag}</span>
          {t.archivedAt && <span>归档于 {t.archivedAt.split('T')[0]}</span>}
        </div>
      </div>
      <button
        onClick={() => onRestore(t.meetingId, t.index)}
        className="flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg
                   border border-gray-200 text-xs text-gray-500
                   hover:border-[#3370FF]/40 hover:text-[#3370FF] transition-colors"
      >
        <RotateCcw className="w-3.5 h-3.5" />
        恢复
      </button>
    </div>
  )
}

function ThreadGroupCard({
  group,
  onRestore,
}: {
  group: ThreadGroup
  onRestore: (threadId: string) => void
}) {
  const [expanded,  setExpanded]  = useState(false)
  const [editing,   setEditing]   = useState(false)
  const [title,     setTitle]     = useState(group.threadTitle)
  const [saving,    setSaving]    = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const sorted = [...group.tasks].sort((a, b) =>
    (a.meetingDate ?? '').localeCompare(b.meetingDate ?? ''),
  )

  function startEdit(e: React.MouseEvent) {
    e.stopPropagation()
    setEditing(true)
    setTimeout(() => inputRef.current?.select(), 0)
  }

  async function saveTitle() {
    if (!title.trim() || title === group.threadTitle) { setEditing(false); return }
    setSaving(true)
    await renameThread(group.threadId, title.trim())
    setSaving(false)
    setEditing(false)
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-100 border-l-[3px] border-l-[#52C41A]">
      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-3">
        <button
          onClick={() => setExpanded((v) => !v)}
          className="flex-shrink-0"
        >
          <ChevronRight
            className={`w-3.5 h-3.5 text-gray-400 transition-transform ${expanded ? 'rotate-90' : ''}`}
          />
        </button>

        {/* Title / edit */}
        <div className="flex-1 min-w-0 flex items-center gap-1.5">
          {editing ? (
            <input
              ref={inputRef}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && saveTitle()}
              onBlur={saveTitle}
              disabled={saving}
              className="flex-1 text-sm font-medium text-gray-700 border-b border-[#3370FF] outline-none bg-transparent py-0.5"
            />
          ) : (
            <>
              <button
                onClick={() => setExpanded((v) => !v)}
                className="flex-1 text-left text-sm font-medium text-gray-700 truncate"
              >
                {title}
              </button>
              <button
                onClick={startEdit}
                className="flex-shrink-0 p-0.5 text-gray-300 hover:text-gray-500 transition-colors"
                title="重命名"
              >
                <Pencil className="w-3.5 h-3.5" />
              </button>
            </>
          )}
        </div>

        <span className="flex-shrink-0 text-xs text-gray-400">共 {group.tasks.length} 步</span>
        {group.archivedAt && (
          <span className="flex-shrink-0 text-xs text-gray-400">归档于 {group.archivedAt.split('T')[0]}</span>
        )}

        {/* Restore button */}
        <button
          onClick={() => onRestore(group.threadId)}
          className="flex-shrink-0 flex items-center gap-1 px-2.5 py-1 rounded-lg border border-gray-200
                     text-xs text-gray-500 hover:border-[#3370FF]/40 hover:text-[#3370FF] transition-colors"
        >
          <RotateCcw className="w-3 h-3" />
          恢复线索
        </button>
      </div>

      {/* Expanded tasks */}
      {expanded && (
        <div className="border-t border-gray-100 px-4 py-3 space-y-2.5">
          {sorted.map((t, i) => (
            <div key={i} className="flex items-start gap-2">
              <span className="text-xs text-gray-400 w-5 pt-0.5 flex-shrink-0 text-right">{i + 1}.</span>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-gray-500 line-through leading-snug">{t.task}</p>
                <p className="text-[10px] text-gray-400 mt-0.5">{t.meetingTitle} · {t.meetingDate}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default function ArchiveClient({
  threadGroups,
  independentTasks,
}: {
  threadGroups:     ThreadGroup[]
  independentTasks: ArchivedTask[]
}) {
  const [groups, setGroups] = useState(threadGroups)
  const [indep,  setIndep]  = useState(independentTasks)
  const [error,  setError]  = useState('')

  async function handleRestoreTask(meetingId: string, index: number) {
    const ok = await restoreMyTask(meetingId, index)
    if (!ok) {
      setError('恢复失败，请重试')
      setTimeout(() => setError(''), 3000)
      return
    }
    setIndep((prev) => prev.filter((t) => !(t.meetingId === meetingId && t.index === index)))
  }

  async function handleRestoreThread(threadId: string) {
    if (!window.confirm('确认恢复该线索下所有事项？')) return
    const ok = await restoreThread(threadId)
    if (!ok) {
      setError('恢复失败，请重试')
      setTimeout(() => setError(''), 3000)
      return
    }
    setGroups((prev) => prev.filter((g) => g.threadId !== threadId))
  }

  const isEmpty = groups.length === 0 && indep.length === 0

  if (isEmpty) {
    return (
      <div className="bg-white rounded-2xl border border-gray-100 px-8 py-20 text-center">
        <p className="text-sm text-gray-400">暂无归档记录</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {error && <p className="text-sm text-[#FF4D4F]">{error}</p>}

      {/* Thread groups */}
      {groups.length > 0 && (
        <div className="space-y-3">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">线索归档</p>
          {groups.map((g) => (
            <ThreadGroupCard key={g.threadId} group={g} onRestore={handleRestoreThread} />
          ))}
        </div>
      )}

      {/* Independent */}
      {indep.length > 0 && (
        <div className="space-y-3">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">独立归档</p>
          {indep.map((t, i) => (
            <IndependentCard key={i} t={t} onRestore={handleRestoreTask} />
          ))}
        </div>
      )}
    </div>
  )
}
