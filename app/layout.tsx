import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'AI Meeting Assistant',
  description: '会前准备、会后整理、Todo 沉淀',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  )
}
