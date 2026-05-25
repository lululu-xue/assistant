'use client'

import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  ListTodo,
  TrendingUp,
  FileText,
} from 'lucide-react'

interface Meeting {
  id: string
  title: string
  tag: string
  meeting_date: string
  summary: string | null
  structured: {
    progress: string[]
    conclusions: string[]
    time_nodes: Array<{ text: string; date: string | null }>
  } | null
}

interface Todo {
  id: string
  task: string
  owner: string | null
  status: 'open' | 'done'
  deadline_text: string | null
  deadline_date: string | null
  risk_level: 'low' | 'medium' | 'high'
}

interface Risk {
  id: string
  content: string
  level: 'low' | 'medium' | 'high'
}

const riskBadge = {
  high: 'bg-red-100 text-red-700',
  medium: 'bg-amber-100 text-amber-700',
  low: 'bg-green-100 text-green-700',
}
const riskLabel = { high: '高风险', medium: '中风险', low: '低风险' }

function Card({
  title,
  icon,
  children,
}: {
  title: string
  icon: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-5">
      <div className="flex items-center gap-2 mb-4">
        <span className="text-[#3370FF]">{icon}</span>
        <h2 className="text-sm font-semibold text-gray-800">{title}</h2>
      </div>
      {children}
    </div>
  )
}

export default function MeetingResult({
  meeting,
  todos,
  risks,
}: {
  meeting: Meeting
  todos: Todo[]
  risks: Risk[]
}) {
  const structured = meeting.structured ?? {
    progress: [],
    conclusions: [],
    time_nodes: [],
  }

  return (
    <div className="max-w-3xl mx-auto space-y-5">
      {/* Header */}
      <div>
        <h1 className="text-xl font-semibold text-gray-900">
          {meeting.title || '会议分析结果'}
        </h1>
        <div className="flex items-center gap-2 mt-1.5">
          <span className="text-xs px-2 py-0.5 rounded-full bg-[#3370FF]/10 text-[#3370FF]">
            {meeting.tag}
          </span>
          <span className="text-xs text-gray-400">{meeting.meeting_date}</span>
        </div>
      </div>

      {/* Summary */}
      <Card title="会议总结" icon={<FileText className="w-4 h-4" />}>
        <p className="text-sm text-gray-700 leading-relaxed">
          {meeting.summary || '暂无总结'}
        </p>
      </Card>

      {/* Progress */}
      {structured.progress.length > 0 && (
        <Card title="本周进展" icon={<TrendingUp className="w-4 h-4" />}>
          <ul className="space-y-2.5">
            {structured.progress.map((item, i) => (
              <li key={i} className="flex items-start gap-2.5 text-sm text-gray-700">
                <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />
                {item}
              </li>
            ))}
          </ul>
        </Card>
      )}

      {/* Conclusions */}
      {structured.conclusions.length > 0 && (
        <Card title="会议结论" icon={<CheckCircle2 className="w-4 h-4" />}>
          <ol className="space-y-2.5">
            {structured.conclusions.map((item, i) => (
              <li key={i} className="flex items-start gap-2.5 text-sm text-gray-700">
                <span
                  className="w-5 h-5 rounded-full bg-[#3370FF]/10 text-[#3370FF] text-xs
                             flex items-center justify-center flex-shrink-0 font-medium"
                >
                  {i + 1}
                </span>
                {item}
              </li>
            ))}
          </ol>
        </Card>
      )}

      {/* Time nodes */}
      {structured.time_nodes.length > 0 && (
        <Card title="时间节点" icon={<Clock className="w-4 h-4" />}>
          <div className="divide-y divide-gray-50">
            {structured.time_nodes.map((node, i) => (
              <div
                key={i}
                className="flex items-center justify-between py-2.5 first:pt-0 last:pb-0"
              >
                <span className="text-sm text-gray-700">{node.text}</span>
                {node.date && (
                  <span className="text-xs text-gray-400 tabular-nums">
                    {node.date}
                  </span>
                )}
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Todos */}
      {todos.length > 0 && (
        <Card
          title={`待办事项（${todos.length}）`}
          icon={<ListTodo className="w-4 h-4" />}
        >
          <div className="space-y-3">
            {todos.map((todo) => (
              <div
                key={todo.id}
                className="flex items-start justify-between gap-3 py-2.5
                           border-b border-gray-50 last:border-0 last:pb-0"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-800">{todo.task}</p>
                  <div className="flex items-center gap-3 mt-1">
                    {todo.owner && (
                      <span className="text-xs text-gray-400">
                        @{todo.owner}
                      </span>
                    )}
                    {todo.deadline_text && (
                      <span className="text-xs text-gray-400">
                        {todo.deadline_text}
                        {todo.deadline_date ? ` (${todo.deadline_date})` : ''}
                      </span>
                    )}
                  </div>
                </div>
                <span
                  className={`text-xs px-2 py-0.5 rounded-full flex-shrink-0 ${
                    riskBadge[todo.risk_level]
                  }`}
                >
                  {riskLabel[todo.risk_level]}
                </span>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Risks */}
      {risks.length > 0 && (
        <Card
          title={`风险项（${risks.length}）`}
          icon={<AlertTriangle className="w-4 h-4" />}
        >
          <div className="space-y-3">
            {risks.map((risk) => (
              <div
                key={risk.id}
                className="flex items-start justify-between gap-3 py-2.5
                           border-b border-gray-50 last:border-0 last:pb-0"
              >
                <p className="text-sm text-gray-700 flex-1">{risk.content}</p>
                <span
                  className={`text-xs px-2 py-0.5 rounded-full flex-shrink-0 ${
                    riskBadge[risk.level]
                  }`}
                >
                  {riskLabel[risk.level]}
                </span>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  )
}
