'use client'

import { useState } from 'react'
import { RotateCcw } from 'lucide-react'
import { restoreMyTask } from '@/app/dashboard/actions'

export interface ArchivedTask {
  index:        number
  task:         string
  owner:        string | null
  meetingId:    string
  meetingTitle: string
  meetingDate:  string
  tag:          string
  archivedAt:   string | null
}

export default function ArchiveClient({ tasks }: { tasks: ArchivedTask[] }) {
  const [items, setItems] = useState(tasks)
  const [error, setError] = useState('')

  async function handleRestore(meetingId: string, index: number) {
    const ok = await restoreMyTask(meetingId, index)
    if (!ok) {
      setError('恢复失败，请重试')
      setTimeout(() => setError(''), 3000)
      return
    }
    setItems((prev) => prev.filter((t) => !(t.meetingId === meetingId && t.index === index)))
  }

  if (items.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-gray-100 px-8 py-20 text-center">
        <p className="text-sm text-gray-400">暂无归档记录</p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {error && <p className="text-sm text-[#FF4D4F]">{error}</p>}
      {items.map((t, i) => (
        <div
          key={i}
          className="bg-white rounded-2xl border border-gray-100 px-5 py-4
                     flex items-start justify-between gap-4"
        >
          <div className="flex-1 min-w-0">
            <p className="text-sm text-gray-500 line-through truncate">{t.task}</p>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 mt-1 text-xs text-gray-400">
              {t.owner && <span>{t.owner}</span>}
              <span>{t.meetingTitle}</span>
              <span className="px-1.5 py-0.5 rounded-full bg-[#3370FF]/10 text-[#3370FF]">
                {t.tag}
              </span>
              {t.archivedAt && <span>归档于 {t.archivedAt.split('T')[0]}</span>}
            </div>
          </div>
          <button
            onClick={() => handleRestore(t.meetingId, t.index)}
            className="flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg
                       border border-gray-200 text-xs text-gray-500
                       hover:border-[#3370FF]/40 hover:text-[#3370FF] transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            恢复
          </button>
        </div>
      ))}
    </div>
  )
}
