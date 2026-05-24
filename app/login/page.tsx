'use client'

import { useState, useTransition } from 'react'
import { login, register } from '@/app/actions/auth'

export default function LoginPage() {
  const [mode, setMode] = useState<'login' | 'register'>('login')
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  async function handleSubmit(formData: FormData) {
    setError(null)
    startTransition(async () => {
      const action = mode === 'login' ? login : register
      const result = await action(formData)
      if (result?.error) setError(result.error)
    })
  }

  return (
    <div className="min-h-screen bg-[#F7F8FA] flex items-center justify-center">
      <div className="w-full max-w-sm">
        {/* Logo & title */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-[#3370FF] mb-4">
            <svg className="w-7 h-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
            </svg>
          </div>
          <h1 className="text-2xl font-semibold text-gray-900">AI 会议助手</h1>
          <p className="text-sm text-gray-500 mt-1">会前准备 · 会后整理 · Todo 沉淀</p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
          <h2 className="text-lg font-medium text-gray-900 mb-6">
            {mode === 'login' ? '登录账户' : '注册账户'}
          </h2>

          <form action={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                邮箱
              </label>
              <input
                name="email"
                type="email"
                required
                autoComplete="email"
                placeholder="your@email.com"
                className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm
                           focus:outline-none focus:ring-2 focus:ring-[#3370FF]/30 focus:border-[#3370FF]
                           transition-colors placeholder:text-gray-400"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                密码
              </label>
              <input
                name="password"
                type="password"
                required
                autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                placeholder="请输入密码"
                minLength={6}
                className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm
                           focus:outline-none focus:ring-2 focus:ring-[#3370FF]/30 focus:border-[#3370FF]
                           transition-colors placeholder:text-gray-400"
              />
            </div>

            {error && (
              <div className="text-sm text-[#FF4D4F] bg-red-50 rounded-xl px-3.5 py-2.5">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={isPending}
              className="w-full py-2.5 rounded-xl bg-[#3370FF] text-white text-sm font-medium
                         hover:bg-[#2860e0] active:bg-[#2455cc] transition-colors
                         disabled:opacity-60 disabled:cursor-not-allowed mt-2"
            >
              {isPending
                ? (mode === 'login' ? '登录中…' : '注册中…')
                : (mode === 'login' ? '登录' : '注册')}
            </button>
          </form>

          {/* Toggle */}
          <p className="text-center text-sm text-gray-500 mt-6">
            {mode === 'login' ? '还没有账户？' : '已有账户？'}
            <button
              onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); setError(null) }}
              className="text-[#3370FF] font-medium hover:underline ml-1"
            >
              {mode === 'login' ? '立即注册' : '去登录'}
            </button>
          </p>
        </div>
      </div>
    </div>
  )
}
