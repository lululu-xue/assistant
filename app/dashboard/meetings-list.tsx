'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Trash2 } from 'lucide-react'
import { deleteMeeting } from './actions'

type Meeting = {
  id: string
  title: string
  tag: string
  meeting_date: string
  summary: string | null
}

export default function MeetingsList({ meetings }: { meetings: Meeting[] }) {
  const router = useRouter()
  const [deleteError, setDeleteError] = useState('')

  async function handleDelete(e: React.MouseEvent, id: string) {
    e.preventDefault()
    e.stopPropagation()
    if (!window.confirm('确认删除这条会议记录？删除后该会议相关的待办和风险也会一并删除')) return
    const ok = await deleteMeeting(id)
    if (!ok) {
      setDeleteError('删除失败，请重试')
      setTimeout(() => setDeleteError(''), 3000)
      return
    }
    router.refresh()
  }

  return (
    <div>
      {deleteError && (
        <p className="text-[10px] text-[#FF4D4F] mb-2">{deleteError}</p>
      )}
      <div className="space-y-3">
        {meetings.map((m) => (
          <div key={m.id} className="group flex items-start gap-2">
            <Link href={`/meetings/${m.id}`} className="flex-1 min-w-0">
              <p className="text-sm text-gray-800 line-clamp-2 group-hover:text-[#3370FF] transition-colors">
                {m.title || '未命名会议'}
              </p>
              {m.summary && (
                <p className="text-xs text-gray-400 mt-0.5 line-clamp-1">{m.summary}</p>
              )}
            </Link>
            <div className="flex items-center gap-1.5 flex-shrink-0">
              <div className="text-right">
                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-[#3370FF]/10 text-[#3370FF] block mb-0.5">
                  {m.tag}
                </span>
                <span className="text-[10px] text-gray-400 tabular-nums">{m.meeting_date}</span>
              </div>
              <button
                onClick={(e) => handleDelete(e, m.id)}
                className="opacity-0 group-hover:opacity-100 p-1 text-gray-300
                           hover:text-[#FF4D4F] transition-all flex-shrink-0"
                title="删除会议"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
