'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import {
  AlertCircle, Clock, Archive, ChevronRight, MoreHorizontal, Plus, X,
} from 'lucide-react'
import {
  updateMyTaskStatus, archiveMyTask,
  createThread, assignToThread, dissolveThread, archiveThread,
  type TodoStatus,
} from './actions'

type Risk = 'low' | 'medium' | 'high'

export interface TodoItem {
  index:          number
  project:        string | null
  task:           string
  owner:          string | null
  next_milestone: string | null
  blocker:        string | null
  risk_level:     Risk
  status:         TodoStatus
  thread_id?:     string | null
  tag:            string
  meetingId:      string
  meetingTitle:   string
  meetingDate:    string
}

export interface ThreadInfo {
  id:    string
  title: string
  tag:   string
}

const STATUS_LABELS: Record<TodoStatus, string> = {
  open: '待处理', in_progress: '进行中', blocked: '阻碍中', done: '已完成',
}
const STATUS_STYLES: Record<TodoStatus, string> = {
  open:        'bg-gray-100 text-gray-500',
  in_progress: 'bg-[#3370FF]/10 text-[#3370FF]',
  blocked:     'bg-orange-50 text-orange-500',
  done:        'bg-[#52C41A]/10 text-[#52C41A]',
}
const RISK_COLOR: Record<Risk, string> = {
  high: 'text-[#FF4D4F] bg-[#FF4D4F]/10',
  medium: 'text-orange-500 bg-orange-50',
  low: 'text-gray-400 bg-gray-100',
}
const RISK_LABEL: Record<Risk, string> = { high: '高风险', medium: '中风险', low: '低风险' }

// ─── Modal state ──────────────────────────────────────────────────────────────

type ModalState = {
  taskMeetingId: string
  taskIndex:     number
  taskTag:       string
  /** 预选线索（用于"继续添加事项"或"加入已有"快捷入口） */
  preThread?:    string
  mode:          'menu' | 'new' | 'assign' | 'pick_task'
  newTitle:      string
  threadId:      string
}

// ─── StatusSelect (shared) ────────────────────────────────────────────────────

function StatusSelect({
  status,
  onChange,
}: {
  status: TodoStatus
  onChange: (s: TodoStatus) => void
}) {
  return (
    <select
      value={status}
      onChange={(e) => onChange(e.target.value as TodoStatus)}
      className={`flex-shrink-0 text-[10px] px-2 py-1 rounded-lg font-medium
                 cursor-pointer focus:outline-none border-0 ${STATUS_STYLES[status]}`}
    >
      {(Object.entries(STATUS_LABELS) as [TodoStatus, string][]).map(([v, l]) => (
        <option key={v} value={v}>{l}</option>
      ))}
    </select>
  )
}

// ─── TaskRow (shared between independent + thread expanded) ───────────────────

function TaskRow({
  t, stepNum,
  onStatus, onArchive,
}: {
  t: TodoItem
  stepNum?: number
  onStatus: (meetingId: string, index: number, s: TodoStatus) => void
  onArchive: (meetingId: string, index: number) => void
}) {
  return (
    <div className="flex items-start gap-2">
      {stepNum !== undefined && (
        <span className="text-xs text-gray-400 w-5 pt-0.5 flex-shrink-0 text-right">
          {stepNum}.
        </span>
      )}
      <div className="flex-1 min-w-0">
        <Link href={`/meetings/${t.meetingId}`}>
          <p className={`text-sm leading-snug hover:text-[#3370FF] transition-colors ${
            t.status === 'done' ? 'text-gray-400 line-through' : 'text-gray-800'
          }`}>
            {t.task}
          </p>
        </Link>
        <p className="text-[10px] text-gray-400 mt-0.5">
          {t.meetingTitle} · {t.meetingDate}
        </p>
      </div>
      <StatusSelect status={t.status} onChange={(s) => onStatus(t.meetingId, t.index, s)} />
      {t.status === 'done' && (
        <button
          onClick={() => onArchive(t.meetingId, t.index)}
          title="归档"
          className="flex-shrink-0 p-1 text-gray-300 hover:text-gray-500 transition-colors"
        >
          <Archive className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function TodosList({
  initialTasks,
  initialThreads,
}: {
  initialTasks:   TodoItem[]
  initialThreads: ThreadInfo[]
}) {
  const [tasks,           setTasks]           = useState(initialTasks)
  const [threads,         setThreads]         = useState(initialThreads)
  const [modal,           setModal]           = useState<ModalState | null>(null)
  const [expandedThreads, setExpandedThreads] = useState<Set<string>>(new Set())
  const [openMenu,        setOpenMenu]        = useState<string | null>(null)
  const [error,           setError]           = useState('')
  const [, startTransition] = useTransition()

  function showError(msg: string) {
    setError(msg); setTimeout(() => setError(''), 3000)
  }

  // ── Status ──
  function handleStatusChange(meetingId: string, index: number, newStatus: TodoStatus) {
    setTasks((prev) =>
      prev.map((t) =>
        t.meetingId === meetingId && t.index === index ? { ...t, status: newStatus } : t,
      ),
    )
    startTransition(async () => { await updateMyTaskStatus(meetingId, index, newStatus) })
  }

  // ── Archive ──
  async function handleArchive(meetingId: string, index: number) {
    if (!window.confirm('确认归档？归档后该事项将移入归档记录，不再显示在主列表')) return
    const ok = await archiveMyTask(meetingId, index)
    if (!ok) { showError('归档失败，请重试'); return }
    setTasks((prev) => prev.filter((t) => !(t.meetingId === meetingId && t.index === index)))
  }

  // ── Open modal ──
  function openModal(
    taskMeetingId: string, taskIndex: number, taskTag: string,
    opts?: { preThread?: string; mode?: ModalState['mode'] },
  ) {
    setModal({
      taskMeetingId, taskIndex, taskTag,
      preThread: opts?.preThread,
      mode: opts?.mode ?? (opts?.preThread ? 'assign' : 'menu'),
      newTitle: '',
      threadId: opts?.preThread ?? '',
    })
  }

  function closeModal() { setModal(null) }

  function setModalField(patch: Partial<ModalState>) {
    setModal((prev) => prev ? { ...prev, ...patch } : prev)
  }

  // ── Create thread ──
  async function handleCreateThread() {
    if (!modal?.newTitle.trim()) return
    const result = await createThread(modal.newTitle.trim(), modal.taskTag, modal.taskMeetingId, modal.taskIndex)
    if (!result) { showError('创建线索失败，请重试'); return }
    setThreads((prev) => [...prev, { id: result.threadId, title: modal.newTitle.trim(), tag: modal.taskTag }])
    setTasks((prev) =>
      prev.map((t) =>
        t.meetingId === modal.taskMeetingId && t.index === modal.taskIndex
          ? { ...t, thread_id: result.threadId }
          : t,
      ),
    )
    setExpandedThreads((prev) => new Set([...prev, result.threadId]))
    closeModal()
  }

  // ── Assign to thread ──
  async function handleAssignToThread() {
    if (!modal?.threadId) return
    const ok = await assignToThread(modal.threadId, modal.taskMeetingId, modal.taskIndex)
    if (!ok) { showError('加入线索失败，请重试'); return }
    setTasks((prev) =>
      prev.map((t) =>
        t.meetingId === modal.taskMeetingId && t.index === modal.taskIndex
          ? { ...t, thread_id: modal.threadId }
          : t,
      ),
    )
    closeModal()
  }

  // ── Pick a task to add to a thread ──
  async function handlePickTaskForThread(t: TodoItem) {
    if (!modal?.threadId) return
    const ok = await assignToThread(modal.threadId, t.meetingId, t.index)
    if (!ok) { showError('加入线索失败，请重试'); return }
    setTasks((prev) =>
      prev.map((task) =>
        task.meetingId === t.meetingId && task.index === t.index
          ? { ...task, thread_id: modal.threadId }
          : task,
      ),
    )
    closeModal()
  }

  // ── Archive thread ──
  async function handleArchiveThread(threadId: string) {
    setOpenMenu(null)
    if (!window.confirm('确认归档该线索？线索下所有事项将一并归档')) return
    const ok = await archiveThread(threadId)
    if (!ok) { showError('归档失败，请重试'); return }
    setTasks((prev) => prev.filter((t) => t.thread_id !== threadId))
    setThreads((prev) => prev.filter((t) => t.id !== threadId))
  }

  // ── Dissolve ──
  async function handleDissolve(threadId: string) {
    setOpenMenu(null)
    if (!window.confirm('确认解散线索？该线索下的事项将恢复为独立卡片')) return
    const ok = await dissolveThread(threadId)
    if (!ok) { showError('解散失败，请重试'); return }
    setTasks((prev) => prev.map((t) => t.thread_id === threadId ? { ...t, thread_id: null } : t))
    setThreads((prev) => prev.filter((t) => t.id !== threadId))
  }

  // ── Grouping ──
  const independentTasks = tasks.filter((t) => !t.thread_id)
  const threadMap = new Map<string, TodoItem[]>()
  for (const t of tasks.filter((t) => t.thread_id)) {
    const tid = t.thread_id!
    if (!threadMap.has(tid)) threadMap.set(tid, [])
    threadMap.get(tid)!.push(t)
  }

  if (tasks.length === 0) {
    return <p className="text-xs text-gray-400 py-6 text-center">暂无待办</p>
  }

  return (
    <>
      <div className="space-y-2.5 max-h-[600px] overflow-y-auto pr-1">
        {error && <p className="text-[10px] text-[#FF4D4F] px-1">{error}</p>}

        {/* ── Thread cards ── */}
        {[...threadMap.entries()].map(([threadId, threadTasks]) => {
          const thread = threads.find((th) => th.id === threadId)
          if (!thread) return null
          const isExpanded = expandedThreads.has(threadId)
          const sorted = [...threadTasks].sort((a, b) =>
            a.meetingDate.localeCompare(b.meetingDate),
          )
          const latestTask = sorted[sorted.length - 1]
          const hasBlocked = threadTasks.some((t) => t.status === 'blocked')
          const allDone    = threadTasks.every((t) => t.status === 'done')
          const leftBorder = hasBlocked
            ? 'border-l-orange-400'
            : allDone
            ? 'border-l-[#52C41A]'
            : 'border-l-[#3370FF]'

          return (
            <div
              key={threadId}
              className={`rounded-xl border border-gray-100 border-l-[3px] ${leftBorder} bg-white`}
            >
              {/* Header */}
              <div className="flex items-center px-4 py-3 gap-2">
                <button
                  onClick={() =>
                    setExpandedThreads((prev) => {
                      const s = new Set(prev)
                      s.has(threadId) ? s.delete(threadId) : s.add(threadId)
                      return s
                    })
                  }
                  className="flex-1 flex items-center gap-2 text-left min-w-0"
                >
                  <ChevronRight
                    className={`w-3.5 h-3.5 text-gray-400 flex-shrink-0 transition-transform ${
                      isExpanded ? 'rotate-90' : ''
                    }`}
                  />
                  <span className="text-sm font-medium text-gray-800 truncate">{thread.title}</span>
                  <span className={`flex-shrink-0 text-[10px] px-1.5 py-0.5 rounded-md font-medium ${
                    STATUS_STYLES[latestTask?.status ?? 'open']
                  }`}>
                    {STATUS_LABELS[latestTask?.status ?? 'open']}
                  </span>
                  <span className="flex-shrink-0 text-xs text-gray-400">共 {threadTasks.length} 步</span>
                </button>
                {/* ··· */}
                <div className="relative flex-shrink-0">
                  <button
                    onClick={() => setOpenMenu(openMenu === threadId ? null : threadId)}
                    className="p-1 text-gray-400 hover:text-gray-600 rounded"
                  >
                    <MoreHorizontal className="w-4 h-4" />
                  </button>
                  {openMenu === threadId && (
                    <div className="absolute right-0 top-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg z-20 py-1 w-28">
                      <button
                        onClick={() => handleArchiveThread(threadId)}
                        className="w-full text-left px-3 py-1.5 text-xs text-gray-600 hover:bg-gray-50"
                      >
                        归档线索
                      </button>
                      <button
                        onClick={() => handleDissolve(threadId)}
                        className="w-full text-left px-3 py-1.5 text-xs text-[#FF4D4F] hover:bg-gray-50"
                      >
                        解散线索
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Expanded */}
              {isExpanded && (
                <div className="border-t border-gray-100 px-4 py-3 space-y-2.5">
                  {sorted.map((t, i) => (
                    <TaskRow
                      key={i}
                      t={t}
                      stepNum={i + 1}
                      onStatus={handleStatusChange}
                      onArchive={handleArchive}
                    />
                  ))}
                  {/* 继续添加事项 */}
                  <button
                    onClick={() =>
                      openModal('', -1, thread.tag, {
                        preThread: threadId,
                        mode: 'pick_task',
                      })
                    }
                    className="flex items-center gap-1.5 text-xs text-[#3370FF] hover:text-[#2860EE] transition-colors mt-1 pt-1 border-t border-gray-50 w-full"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    继续添加事项
                  </button>
                </div>
              )}
            </div>
          )
        })}

        {/* ── Independent tasks ── */}
        {independentTasks.map((t, i) => (
          <div
            key={i}
            className={`rounded-xl border px-4 py-3 transition-all ${
              t.status === 'blocked'
                ? 'border-orange-200 bg-orange-50/40 border-l-[3px] border-l-orange-400'
                : t.status === 'done'
                ? 'border-gray-100 bg-gray-50/50'
                : 'border-gray-100 hover:border-[#3370FF]/30 hover:bg-[#3370FF]/5'
            }`}
          >
            <div className="flex items-start gap-2">
              <span className={`flex-shrink-0 text-[10px] px-1.5 py-0.5 rounded-md font-medium mt-0.5 ${RISK_COLOR[t.risk_level]}`}>
                {RISK_LABEL[t.risk_level]}
              </span>
              <div className="flex-1 min-w-0">
                <Link href={`/meetings/${t.meetingId}`}>
                  <p className={`text-sm leading-snug hover:text-[#3370FF] transition-colors ${
                    t.status === 'done' ? 'text-gray-400 line-through' : 'text-gray-800'
                  }`}>
                    {t.task}
                  </p>
                </Link>
                <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 mt-1 text-xs text-gray-400">
                  {t.project && <span>{t.project}</span>}
                  {t.owner && <span>· {t.owner}</span>}
                  {t.next_milestone && (
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />{t.next_milestone}
                    </span>
                  )}
                </div>
                {t.blocker && t.status !== 'done' && (
                  <p className="mt-1 text-xs text-[#FF4D4F] flex items-center gap-1">
                    <AlertCircle className="w-3 h-3 flex-shrink-0" />{t.blocker}
                  </p>
                )}
              </div>
              <StatusSelect status={t.status} onChange={(s) => handleStatusChange(t.meetingId, t.index, s)} />
              {t.status === 'done' && (
                <button onClick={() => handleArchive(t.meetingId, t.index)} title="归档"
                  className="flex-shrink-0 p-1 text-gray-300 hover:text-gray-500 transition-colors">
                  <Archive className="w-3.5 h-3.5" />
                </button>
              )}
              <button
                onClick={() => openModal(t.meetingId, t.index, t.tag)}
                className="flex-shrink-0 px-1.5 py-0.5 text-[10px] text-gray-400 border border-gray-200 rounded hover:border-[#3370FF]/40 hover:text-[#3370FF] transition-colors"
              >
                + 线索
              </button>
            </div>
            <p className="mt-1.5 text-[10px] text-gray-300 truncate">{t.meetingTitle} · {t.meetingDate}</p>
          </div>
        ))}
      </div>

      {/* ── Modal ── */}
      {modal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/20"
          onClick={closeModal}
        >
          <div
            className="bg-white rounded-2xl shadow-xl p-5 w-80 max-w-[90vw]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm font-semibold text-gray-800">
                {modal.mode === 'menu'      ? '加入线索' :
                 modal.mode === 'new'       ? '新建线索' :
                 modal.mode === 'pick_task' ? '添加事项到线索' : '加入已有线索'}
              </p>
              <button onClick={closeModal} className="text-gray-400 hover:text-gray-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* menu */}
            {modal.mode === 'menu' && (
              <div className="space-y-2">
                <button
                  onClick={() => setModalField({ mode: 'new' })}
                  className="w-full text-left px-4 py-3 rounded-xl border border-gray-200 text-sm text-gray-700 hover:border-[#3370FF]/40 hover:bg-[#3370FF]/5 transition-colors"
                >
                  <p className="font-medium">新建线索</p>
                  <p className="text-xs text-gray-400 mt-0.5">创建一条新的任务脉络</p>
                </button>
                {threads.filter((th) => th.tag === modal.taskTag).length > 0 && (
                  <button
                    onClick={() => setModalField({ mode: 'assign' })}
                    className="w-full text-left px-4 py-3 rounded-xl border border-gray-200 text-sm text-gray-700 hover:border-[#3370FF]/40 hover:bg-[#3370FF]/5 transition-colors"
                  >
                    <p className="font-medium">加入已有线索</p>
                    <p className="text-xs text-gray-400 mt-0.5">添加到现有任务脉络中</p>
                  </button>
                )}
              </div>
            )}

            {/* new thread */}
            {modal.mode === 'new' && (
              <div className="space-y-3">
                <input
                  type="text"
                  value={modal.newTitle}
                  onChange={(e) => setModalField({ newTitle: e.target.value })}
                  onKeyDown={(e) => e.key === 'Enter' && handleCreateThread()}
                  placeholder="线索名称，如「地勘推进」"
                  autoFocus
                  className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-[#3370FF]"
                />
                <div className="flex gap-2">
                  <button onClick={() => setModalField({ mode: 'menu' })}
                    className="flex-1 py-2 rounded-xl border border-gray-200 text-sm text-gray-600 hover:bg-gray-50">
                    返回
                  </button>
                  <button
                    onClick={handleCreateThread}
                    disabled={!modal.newTitle.trim()}
                    className="flex-1 py-2 rounded-xl bg-[#3370FF] text-white text-sm font-medium hover:bg-[#2860EE] disabled:opacity-50 transition-colors"
                  >
                    确认创建
                  </button>
                </div>
              </div>
            )}

            {/* assign to existing */}
            {modal.mode === 'assign' && (
              <div className="space-y-3">
                <select
                  value={modal.threadId}
                  onChange={(e) => setModalField({ threadId: e.target.value })}
                  className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-[#3370FF] bg-white"
                >
                  <option value="">选择线索…</option>
                  {threads
                    .filter((th) => th.tag === modal.taskTag)
                    .map((th) => <option key={th.id} value={th.id}>{th.title}</option>)
                  }
                </select>
                <div className="flex gap-2">
                  <button onClick={() => setModalField({ mode: 'menu' })}
                    className="flex-1 py-2 rounded-xl border border-gray-200 text-sm text-gray-600 hover:bg-gray-50">
                    返回
                  </button>
                  <button
                    onClick={handleAssignToThread}
                    disabled={!modal.threadId}
                    className="flex-1 py-2 rounded-xl bg-[#3370FF] text-white text-sm font-medium hover:bg-[#2860EE] disabled:opacity-50 transition-colors"
                  >
                    确认加入
                  </button>
                </div>
              </div>
            )}

            {/* pick independent task to add to thread */}
            {modal.mode === 'pick_task' && (
              <div className="space-y-2">
                {independentTasks.length === 0 ? (
                  <p className="text-sm text-gray-400 py-4 text-center">暂无可添加的独立事项</p>
                ) : (
                  <div className="space-y-1 max-h-52 overflow-y-auto">
                    {independentTasks.map((t, i) => (
                      <button
                        key={i}
                        onClick={() => handlePickTaskForThread(t)}
                        className="w-full text-left px-3 py-2.5 rounded-xl text-sm text-gray-700 hover:bg-[#3370FF]/5 hover:text-[#3370FF] transition-colors"
                      >
                        <p className="truncate">{t.task}</p>
                        <p className="text-[10px] text-gray-400 mt-0.5">{t.meetingTitle}</p>
                      </button>
                    ))}
                  </div>
                )}
                <button onClick={closeModal}
                  className="w-full py-2 rounded-xl border border-gray-200 text-sm text-gray-600 hover:bg-gray-50 mt-1">
                  取消
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  )
}
