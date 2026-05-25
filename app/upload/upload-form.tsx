'use client'

import { useRef, useState, useTransition } from 'react'
import { Upload, FileText, X } from 'lucide-react'
import { uploadMeeting } from './actions'

export default function UploadForm({
  existingTags,
}: {
  existingTags: string[]
}) {
  const [mode, setMode] = useState<'file' | 'text'>('file')
  const [dragOver, setDragOver] = useState(false)
  const [file, setFile] = useState<File | null>(null)
  const [tag, setTag] = useState(existingTags[0] ?? '未分类')
  const [isNewTag, setIsNewTag] = useState(false)
  const [newTagValue, setNewTagValue] = useState('')
  const [error, setError] = useState('')
  const [isPending, startTransition] = useTransition()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    const dropped = e.dataTransfer.files[0]
    if (dropped) {
      setFile(dropped)
      setMode('file')
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0]
    if (selected) setFile(selected)
  }

  const clearFile = (e: React.MouseEvent) => {
    e.stopPropagation()
    setFile(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const handleTagChange = (val: string) => {
    if (val === '__new__') {
      setIsNewTag(true)
      setTag('')
    } else {
      setIsNewTag(false)
      setTag(val)
    }
  }

  const cancelNewTag = () => {
    setIsNewTag(false)
    setTag(existingTags[0] ?? '未分类')
    setNewTagValue('')
  }

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError('')
    const formData = new FormData(e.currentTarget)
    if (isNewTag) {
      formData.set('tag', newTagValue.trim() || '未分类')
    }
    startTransition(async () => {
      const result = await uploadMeeting(formData)
      if (result?.error) setError(result.error)
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* Mode toggle */}
      <div className="flex gap-1 p-1 bg-gray-100 rounded-xl w-fit">
        {(['file', 'text'] as const).map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => setMode(m)}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              mode === m
                ? 'bg-white shadow-sm text-gray-900'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {m === 'file' ? '上传文件' : '粘贴文本'}
          </button>
        ))}
      </div>

      {/* File drop zone */}
      {mode === 'file' ? (
        <div
          onDragOver={(e) => {
            e.preventDefault()
            setDragOver(true)
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`flex flex-col items-center justify-center gap-3 border-2 border-dashed
            rounded-2xl h-44 cursor-pointer transition-colors ${
              dragOver
                ? 'border-[#3370FF] bg-[#3370FF]/5'
                : 'border-gray-200 bg-white hover:border-[#3370FF]/50'
            }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            name="file"
            accept=".txt,.md,.docx"
            className="hidden"
            onChange={handleFileChange}
          />
          {file ? (
            <div className="flex items-center gap-2 text-sm text-gray-700">
              <FileText className="w-5 h-5 text-[#3370FF]" />
              <span className="font-medium">{file.name}</span>
              <button
                type="button"
                onClick={clearFile}
                className="ml-1 text-gray-400 hover:text-gray-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <>
              <Upload className="w-8 h-8 text-gray-300" />
              <p className="text-sm text-gray-500">拖拽文件到此处，或点击选择</p>
              <p className="text-xs text-gray-400">支持 .txt · .md · .docx</p>
            </>
          )}
        </div>
      ) : (
        <textarea
          name="text"
          rows={10}
          placeholder="粘贴会议记录文本..."
          className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm
                     text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2
                     focus:ring-[#3370FF]/30 focus:border-[#3370FF] resize-none"
        />
      )}

      {/* Title */}
      <div>
        <label className="block text-xs font-medium text-gray-500 mb-1.5">
          会议标题（选填）
        </label>
        <input
          type="text"
          name="title"
          placeholder="留空则自动截取首行"
          className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm
                     text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2
                     focus:ring-[#3370FF]/30 focus:border-[#3370FF]"
        />
      </div>

      {/* My aliases */}
      <div>
        <label className="block text-xs font-medium text-gray-500 mb-1.5">
          我在本次会议的称呼（选填）
        </label>
        <input
          type="text"
          name="my_aliases"
          placeholder="填本名 + 常用称呼，可填多个，用逗号隔开，如：张三、小张、张总、张哥"
          className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm
                     text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2
                     focus:ring-[#3370FF]/30 focus:border-[#3370FF]"
        />
      </div>

      {/* Tag + Date row */}
      <div className="flex gap-4">
        <div className="flex-1">
          <label className="block text-xs font-medium text-gray-500 mb-1.5">
            标签
          </label>
          {isNewTag ? (
            <div className="flex gap-2">
              <input
                type="text"
                value={newTagValue}
                onChange={(e) => setNewTagValue(e.target.value)}
                placeholder="输入新标签名"
                autoFocus
                className="flex-1 rounded-xl border border-[#3370FF] bg-white px-3 py-2.5 text-sm
                           focus:outline-none focus:ring-2 focus:ring-[#3370FF]/30"
              />
              <button
                type="button"
                onClick={cancelNewTag}
                className="px-3 rounded-xl border border-gray-200 text-xs text-gray-500
                           hover:bg-gray-50"
              >
                取消
              </button>
            </div>
          ) : (
            <select
              name="tag"
              value={tag}
              onChange={(e) => handleTagChange(e.target.value)}
              className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm
                         text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#3370FF]/30
                         focus:border-[#3370FF]"
            >
              {existingTags.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
              <option value="__new__">+ 新建标签</option>
            </select>
          )}
        </div>

        <div className="flex-1">
          <label className="block text-xs font-medium text-gray-500 mb-1.5">
            会议日期（选填）
          </label>
          <input
            type="date"
            name="meeting_date"
            className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm
                       text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#3370FF]/30
                       focus:border-[#3370FF]"
          />
        </div>
      </div>

      {error && (
        <p className="text-sm text-red-500 bg-red-50 rounded-xl px-4 py-2.5">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={isPending}
        className="w-full py-3 rounded-xl bg-[#3370FF] text-white text-sm font-medium
                   hover:bg-[#2860EE] transition-colors disabled:opacity-60
                   disabled:cursor-not-allowed"
      >
        {isPending ? 'AI 分析中...' : '开始分析'}
      </button>
    </form>
  )
}
