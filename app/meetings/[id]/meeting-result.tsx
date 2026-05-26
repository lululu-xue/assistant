'use client'

import { useState, useTransition } from 'react'
import { Globe, User, Users, Bell, Pencil, Trash2, ArrowRightLeft, Plus } from 'lucide-react'
import { updateStructured } from './actions'

// ── Types ──────────────────────────────────────────────────────────

type Risk = 'low' | 'medium' | 'high'
type SectionKey = 'meeting_summary' | 'my_tasks' | 'related_to_me' | 'other_reminders'

interface MeetingSummaryItem {
  title: string
  owner: string | null
  time: string | null
  risk_level: Risk
}

interface MyTask {
  project: string | null
  task: string
  progress: string | null
  completed_time: string | null
  next_milestone: string | null
  blocker: string | null
  need_help: string | null
  risk_level: Risk
}

interface RelatedTask {
  task: string
  owner: string | null
  time_range: string | null
  my_part: string | null
  risk_level: Risk
}

interface OtherReminder {
  item: string
  person: string | null
  time: string | null
  importance: Risk
}

type AnyItem = MeetingSummaryItem | MyTask | RelatedTask | OtherReminder

interface FullStructured {
  meeting_summary: MeetingSummaryItem[]
  my_tasks: MyTask[]
  related_to_me: RelatedTask[]
  other_reminders: OtherReminder[]
  _failed?: boolean
}

interface Meeting {
  id: string
  title: string
  tag: string
  meeting_date: string
  my_aliases: string | null
  structured: Partial<FullStructured> | null
}

// ── Constants ──────────────────────────────────────────────────────

const SECTION_LABELS: Record<SectionKey, string> = {
  meeting_summary: '会议总结',
  my_tasks: '我的事项',
  related_to_me: '与我相关',
  other_reminders: '其他提醒',
}

const OTHER_SECTIONS: Record<SectionKey, SectionKey[]> = {
  meeting_summary: ['my_tasks', 'related_to_me', 'other_reminders'],
  my_tasks: ['meeting_summary', 'related_to_me', 'other_reminders'],
  related_to_me: ['meeting_summary', 'my_tasks', 'other_reminders'],
  other_reminders: ['meeting_summary', 'my_tasks', 'related_to_me'],
}

// ── Item helpers ───────────────────────────────────────────────────

function getMainText(item: AnyItem, section: SectionKey): string {
  if (section === 'meeting_summary') return (item as MeetingSummaryItem).title
  if (section === 'other_reminders') return (item as OtherReminder).item
  return (item as MyTask | RelatedTask).task
}

function getRisk(item: AnyItem, section: SectionKey): Risk {
  if (section === 'other_reminders') return (item as OtherReminder).importance
  return (item as MeetingSummaryItem | MyTask | RelatedTask).risk_level
}

function convertItem(item: AnyItem, from: SectionKey, to: SectionKey): AnyItem {
  const text = getMainText(item, from)
  const risk = getRisk(item, from)
  const owner =
    from === 'meeting_summary' ? (item as MeetingSummaryItem).owner
    : from === 'related_to_me'  ? (item as RelatedTask).owner
    : from === 'other_reminders' ? (item as OtherReminder).person
    : null
  const time =
    from === 'meeting_summary'  ? (item as MeetingSummaryItem).time
    : from === 'my_tasks'       ? (item as MyTask).completed_time
    : from === 'other_reminders' ? (item as OtherReminder).time
    : null

  if (to === 'meeting_summary')  return { title: text, owner, time, risk_level: risk }
  if (to === 'my_tasks')         return { project: null, task: text, progress: null, completed_time: time, next_milestone: null, blocker: null, need_help: null, risk_level: risk }
  if (to === 'related_to_me')    return { task: text, owner, time_range: null, my_part: null, risk_level: risk }
  return { item: text, person: owner, time, importance: risk }
}

function emptyItem(section: SectionKey): AnyItem {
  if (section === 'meeting_summary')  return { title: '', owner: null, time: null, risk_level: 'low' }
  if (section === 'my_tasks')         return { project: null, task: '', progress: null, completed_time: null, next_milestone: null, blocker: null, need_help: null, risk_level: 'low' }
  if (section === 'related_to_me')    return { task: '', owner: null, time_range: null, my_part: null, risk_level: 'low' }
  return { item: '', person: null, time: null, importance: 'low' }
}

// ── Display primitives ─────────────────────────────────────────────

const riskBorder: Record<Risk, string> = {
  high:   'border-l-4 border-red-400',
  medium: 'border-l-4 border-amber-300',
  low:    'border-l-4 border-transparent',
}

const riskBadge: Record<Risk, string> = {
  high:   'bg-red-100 text-red-700',
  medium: 'bg-amber-100 text-amber-700',
  low:    'bg-green-100 text-green-700',
}

const riskLabel: Record<Risk, string> = { high: '高风险', medium: '中风险', low: '低风险' }

function Badge({ level }: { level: Risk }) {
  return (
    <span className={`text-xs px-2 py-0.5 rounded-full flex-shrink-0 ${riskBadge[level]}`}>
      {riskLabel[level]}
    </span>
  )
}

function F({ label, value, className }: { label: string; value: string | null | undefined; className?: string }) {
  return (
    <div className={`flex gap-1.5 text-xs leading-relaxed ${className ?? ''}`}>
      <span className="text-gray-400 flex-shrink-0">{label}</span>
      <span className={value ? 'text-gray-700' : 'text-gray-300'}>{value || '—'}</span>
    </div>
  )
}

function Empty({ text }: { text: string }) {
  return <p className="text-sm text-gray-300 py-1">{text}</p>
}

function Card({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
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

// ── Edit form ──────────────────────────────────────────────────────

function TInput({ label, fieldKey, draft, onChange }: {
  label: string
  fieldKey: string
  draft: Record<string, unknown>
  onChange: (key: string, val: string) => void
}) {
  return (
    <div className="flex gap-2 items-center">
      <span className="text-xs text-gray-400 w-20 text-right flex-shrink-0">{label}</span>
      <input
        className="flex-1 text-xs border border-gray-200 rounded-lg px-2 py-1 focus:outline-none focus:border-[#3370FF]"
        value={(draft[fieldKey] as string) ?? ''}
        onChange={e => onChange(fieldKey, e.target.value)}
      />
    </div>
  )
}

function EditForm({ section, item, onSave, onCancel }: {
  section: SectionKey
  item: AnyItem
  onSave: (updated: AnyItem) => void
  onCancel: () => void
}) {
  const [draft, setDraft] = useState<Record<string, unknown>>({ ...(item as object) })
  const set = (key: string, val: string) => setDraft(d => ({ ...d, [key]: val || null }))
  const T = (label: string, key: string) => (
    <TInput key={key} label={label} fieldKey={key} draft={draft} onChange={set} />
  )
  const riskKey = section === 'other_reminders' ? 'importance' : 'risk_level'

  return (
    <form
      onSubmit={e => { e.preventDefault(); onSave(draft as unknown as AnyItem) }}
      className="mt-2 border border-[#3370FF]/20 rounded-xl p-3 space-y-2 bg-white"
    >
      {section === 'meeting_summary' && <>{T('事项：', 'title')}{T('负责人：', 'owner')}{T('时间：', 'time')}</>}
      {section === 'my_tasks' && <>{T('事项：', 'task')}{T('项目：', 'project')}{T('进度：', 'progress')}{T('完成时间：', 'completed_time')}{T('下一节点：', 'next_milestone')}{T('卡点：', 'blocker')}{T('需谁配合：', 'need_help')}</>}
      {section === 'related_to_me' && <>{T('事项：', 'task')}{T('负责人：', 'owner')}{T('时间区间：', 'time_range')}{T('我的职责：', 'my_part')}</>}
      {section === 'other_reminders' && <>{T('事项：', 'item')}{T('相关人：', 'person')}{T('时间：', 'time')}</>}
      <div className="flex gap-2 items-center">
        <span className="text-xs text-gray-400 w-20 text-right flex-shrink-0">风险：</span>
        <select
          className="text-xs border border-gray-200 rounded-lg px-2 py-1 focus:outline-none focus:border-[#3370FF]"
          value={(draft[riskKey] as string) ?? 'low'}
          onChange={e => setDraft(d => ({ ...d, [riskKey]: e.target.value }))}
        >
          <option value="low">低风险</option>
          <option value="medium">中风险</option>
          <option value="high">高风险</option>
        </select>
      </div>
      <div className="flex gap-2 justify-end pt-1">
        <button type="button" onClick={onCancel} className="text-xs px-3 py-1 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50">
          取消
        </button>
        <button type="submit" className="text-xs px-3 py-1 rounded-lg bg-[#3370FF] text-white hover:bg-[#2560EE]">
          确认
        </button>
      </div>
    </form>
  )
}

// ── Editable item wrapper ──────────────────────────────────────────

interface EditState {
  type: 'edit' | 'move'
  section: SectionKey
  index: number
}

interface ItemHandlers {
  edit:       (section: SectionKey, index: number) => void
  delete:     (section: SectionKey, index: number) => void
  moveToggle: (section: SectionKey, index: number) => void
  moveTo:     (section: SectionKey, index: number, target: SectionKey) => void
  saveEdit:   (section: SectionKey, index: number, item: AnyItem) => void
  cancelEdit: () => void
}

function EditableItem({ section, index, item, editState, handlers, children }: {
  section: SectionKey
  index: number
  item: AnyItem
  editState: EditState | null
  handlers: ItemHandlers
  children: React.ReactNode
}) {
  const risk = getRisk(item, section)
  const isEditing = editState?.type === 'edit' && editState.section === section && editState.index === index
  const isMoving  = editState?.type === 'move' && editState.section === section && editState.index === index

  return (
    <div className={`rounded-xl bg-gray-50 px-4 py-3 ${riskBorder[risk]}`}>
      <div className="flex items-start gap-2">
        <div className="flex-1 min-w-0">{children}</div>
        <div className="flex gap-0.5 flex-shrink-0 mt-0.5">
          <button
            onClick={() => handlers.edit(section, index)}
            title="编辑"
            className={`p-1 rounded-md transition-colors ${isEditing ? 'text-[#3370FF] bg-[#3370FF]/10' : 'text-gray-300 hover:text-[#3370FF] hover:bg-[#3370FF]/10'}`}
          >
            <Pencil className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => handlers.moveToggle(section, index)}
            title="移动到其它板块"
            className={`p-1 rounded-md transition-colors ${isMoving ? 'text-[#3370FF] bg-[#3370FF]/10' : 'text-gray-300 hover:text-[#3370FF] hover:bg-[#3370FF]/10'}`}
          >
            <ArrowRightLeft className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => handlers.delete(section, index)}
            title="删除"
            className="p-1 rounded-md text-gray-300 hover:text-red-500 hover:bg-red-50 transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {isMoving && (
        <div className="mt-2 flex gap-1.5 flex-wrap items-center">
          <span className="text-xs text-gray-400">移到：</span>
          {OTHER_SECTIONS[section].map(target => (
            <button
              key={target}
              onClick={() => handlers.moveTo(section, index, target)}
              className="text-xs px-2 py-0.5 rounded-full bg-white border border-gray-200 hover:border-[#3370FF] hover:text-[#3370FF] text-gray-600 transition-colors"
            >
              {SECTION_LABELS[target]}
            </button>
          ))}
        </div>
      )}

      {isEditing && (
        <EditForm
          section={section}
          item={item}
          onSave={updated => handlers.saveEdit(section, index, updated)}
          onCancel={handlers.cancelEdit}
        />
      )}
    </div>
  )
}

// ── Add item row ───────────────────────────────────────────────────

function AddItemRow({ section, onAdd }: { section: SectionKey; onAdd: (item: AnyItem) => void }) {
  const [open, setOpen] = useState(false)
  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="mt-3 w-full flex items-center justify-center gap-1.5 py-2 rounded-xl border border-dashed border-gray-200 text-xs text-gray-400 hover:border-[#3370FF]/40 hover:text-[#3370FF] transition-colors"
      >
        <Plus className="w-3.5 h-3.5" />
        手动添加一条
      </button>
    )
  }
  return (
    <div className="mt-3">
      <EditForm
        section={section}
        item={emptyItem(section)}
        onSave={item => { onAdd(item); setOpen(false) }}
        onCancel={() => setOpen(false)}
      />
    </div>
  )
}

// ── Section renderers ──────────────────────────────────────────────

function SectionMeetingSummary({ items, editState, handlers, onAdd }: {
  items: MeetingSummaryItem[]
  editState: EditState | null
  handlers: ItemHandlers
  onAdd: (item: AnyItem) => void
}) {
  return (
    <div>
      {items.length === 0 && <Empty text="本次会议暂无全局大事记录" />}
      <div className="space-y-2">
        {items.map((item, i) => (
          <EditableItem key={i} section="meeting_summary" index={i} item={item} editState={editState} handlers={handlers}>
            <div className="flex items-start justify-between gap-3 mb-2">
              <p className="text-sm text-gray-800 leading-snug">{item.title}</p>
              <Badge level={item.risk_level} />
            </div>
            <div className="space-y-0.5">
              <F label="负责人：" value={item.owner} />
              <F label="时间：" value={item.time} />
            </div>
          </EditableItem>
        ))}
      </div>
      <AddItemRow section="meeting_summary" onAdd={onAdd} />
    </div>
  )
}

function SectionMyTasks({ items, editState, handlers, onAdd }: {
  items: MyTask[]
  editState: EditState | null
  handlers: ItemHandlers
  onAdd: (item: AnyItem) => void
}) {
  if (items.length === 0) {
    return (
      <div>
        <Empty text="本次会议中未识别到属于你的主责事项" />
        <AddItemRow section="my_tasks" onAdd={onAdd} />
      </div>
    )
  }

  const order: string[] = []
  const groups: Record<string, Array<{ task: MyTask; flatIndex: number }>> = {}
  for (let i = 0; i < items.length; i++) {
    const key = items[i].project ?? '未分类项目'
    if (!groups[key]) { order.push(key); groups[key] = [] }
    groups[key].push({ task: items[i], flatIndex: i })
  }

  return (
    <div>
      <div className="space-y-5">
        {order.map(proj => (
          <div key={proj}>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">{proj}</p>
            <div className="space-y-2">
              {groups[proj].map(({ task, flatIndex }) => (
                <EditableItem key={flatIndex} section="my_tasks" index={flatIndex} item={task} editState={editState} handlers={handlers}>
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <p className="text-sm text-gray-800 leading-snug">{task.task}</p>
                    <Badge level={task.risk_level} />
                  </div>
                  <div className="space-y-0.5">
                    <F label="进度：" value={task.progress} />
                    <F label="完成时间：" value={task.completed_time} />
                    <F label="下一节点：" value={task.next_milestone} />
                    <F label="卡点：" value={task.blocker} className="[&>span]:text-red-500" />
                    <F label="需谁配合：" value={task.need_help} />
                  </div>
                </EditableItem>
              ))}
            </div>
          </div>
        ))}
      </div>
      <AddItemRow section="my_tasks" onAdd={onAdd} />
    </div>
  )
}

function SectionRelatedToMe({ items, editState, handlers, onAdd }: {
  items: RelatedTask[]
  editState: EditState | null
  handlers: ItemHandlers
  onAdd: (item: AnyItem) => void
}) {
  return (
    <div>
      {items.length === 0 && <Empty text="本次会议中暂无需要你配合的事项" />}
      <div className="space-y-2">
        {items.map((item, i) => (
          <EditableItem key={i} section="related_to_me" index={i} item={item} editState={editState} handlers={handlers}>
            <div className="flex items-start justify-between gap-3 mb-2">
              <p className="text-sm text-gray-800 leading-snug">{item.task}</p>
              <Badge level={item.risk_level} />
            </div>
            <div className="space-y-0.5">
              <F label="负责人：" value={item.owner} />
              <F label="时间区间：" value={item.time_range} />
              <F label="我的职责：" value={item.my_part} />
            </div>
          </EditableItem>
        ))}
      </div>
      <AddItemRow section="related_to_me" onAdd={onAdd} />
    </div>
  )
}

function SectionOtherReminders({ items, editState, handlers, onAdd }: {
  items: OtherReminder[]
  editState: EditState | null
  handlers: ItemHandlers
  onAdd: (item: AnyItem) => void
}) {
  return (
    <div>
      {items.length === 0 && <Empty text="暂无其他提醒事项" />}
      <div className="space-y-2">
        {items.map((item, i) => (
          <EditableItem key={i} section="other_reminders" index={i} item={item} editState={editState} handlers={handlers}>
            <div className="flex items-start justify-between gap-3 mb-2">
              <p className="text-sm text-gray-800 leading-snug">{item.item}</p>
              <Badge level={item.importance} />
            </div>
            <div className="space-y-0.5">
              <F label="相关人：" value={item.person} />
              <F label="时间：" value={item.time} />
            </div>
          </EditableItem>
        ))}
      </div>
      <AddItemRow section="other_reminders" onAdd={onAdd} />
    </div>
  )
}

// ── Main component ─────────────────────────────────────────────────

type SaveStatus = 'idle' | 'saving' | 'saved' | 'error'

export default function MeetingResult({ meeting }: { meeting: Meeting }) {
  const init = meeting.structured ?? {}
  const [data, setData] = useState<FullStructured>({
    meeting_summary: init.meeting_summary ?? [],
    my_tasks:        init.my_tasks        ?? [],
    related_to_me:   init.related_to_me   ?? [],
    other_reminders: init.other_reminders ?? [],
    _failed:         init._failed,
  })
  const [editState, setEditState]   = useState<EditState | null>(null)
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle')
  const [, startTransition]         = useTransition()

  function patch(section: SectionKey, arr: AnyItem[]) {
    setData(d => ({ ...d, [section]: arr } as FullStructured))
  }

  const handlers: ItemHandlers = {
    edit(section, index) {
      setEditState(e =>
        e?.type === 'edit' && e.section === section && e.index === index
          ? null
          : { type: 'edit', section, index }
      )
    },
    delete(section, index) {
      if (!window.confirm('确认删除这条？')) return
      patch(section, (data[section] as AnyItem[]).filter((_, i) => i !== index))
      setEditState(e => e?.section === section && e?.index === index ? null : e)
    },
    moveToggle(section, index) {
      setEditState(e =>
        e?.type === 'move' && e.section === section && e.index === index
          ? null
          : { type: 'move', section, index }
      )
    },
    moveTo(section, index, target) {
      const item = (data[section] as AnyItem[])[index]
      patch(section, (data[section] as AnyItem[]).filter((_, i) => i !== index))
      patch(target,  [...(data[target] as AnyItem[]), convertItem(item, section, target)])
      setEditState(null)
    },
    saveEdit(section, index, item) {
      const arr = [...(data[section] as AnyItem[])]
      arr[index] = item
      patch(section, arr)
      setEditState(null)
    },
    cancelEdit() { setEditState(null) },
  }

  function addItem(section: SectionKey, item: AnyItem) {
    patch(section, [...(data[section] as AnyItem[]), item])
  }

  function handleSave() {
    setSaveStatus('saving')
    startTransition(async () => {
      const result = await updateStructured(meeting.id, data)
      if (result?.error) {
        setSaveStatus('error')
        setTimeout(() => setSaveStatus('idle'), 3000)
      } else {
        setSaveStatus('saved')
        setTimeout(() => setSaveStatus('idle'), 3000)
      }
    })
  }

  const saveLabel = { idle: '保存修改', saving: '保存中…', saved: '已保存 ✓', error: '保存失败，重试' }[saveStatus]
  const saveClass = {
    idle:   'bg-[#3370FF] hover:bg-[#2560EE] text-white',
    saving: 'bg-gray-200 text-gray-400 cursor-not-allowed',
    saved:  'bg-green-500 text-white',
    error:  'bg-red-500 hover:bg-red-600 text-white',
  }[saveStatus]

  return (
    <div className="max-w-3xl mx-auto space-y-5">
      {data._failed && (
        <div className="rounded-xl bg-amber-50 border border-amber-200 px-4 py-3 text-sm text-amber-700">
          AI 分析失败，内容已保存。请返回重新上传，或稍后刷新重试。
        </div>
      )}

      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">{meeting.title || '会议分析结果'}</h1>
          <div className="flex items-center gap-2 mt-1.5 flex-wrap">
            <span className="text-xs px-2 py-0.5 rounded-full bg-[#3370FF]/10 text-[#3370FF]">{meeting.tag}</span>
            <span className="text-xs text-gray-400">{meeting.meeting_date}</span>
            {meeting.my_aliases && (
              <span className="text-xs text-gray-400">· 我的称呼：{meeting.my_aliases}</span>
            )}
          </div>
        </div>
        <button
          onClick={handleSave}
          disabled={saveStatus === 'saving'}
          className={`flex-shrink-0 text-sm px-4 py-2 rounded-xl font-medium transition-colors ${saveClass}`}
        >
          {saveLabel}
        </button>
      </div>

      <Card title="会议总结（全局）" icon={<Globe className="w-4 h-4" />}>
        <SectionMeetingSummary
          items={data.meeting_summary}
          editState={editState}
          handlers={handlers}
          onAdd={item => addItem('meeting_summary', item)}
        />
      </Card>

      <Card title="我的事项（主责）" icon={<User className="w-4 h-4" />}>
        <SectionMyTasks
          items={data.my_tasks}
          editState={editState}
          handlers={handlers}
          onAdd={item => addItem('my_tasks', item)}
        />
      </Card>

      <Card title="与我相关（配合）" icon={<Users className="w-4 h-4" />}>
        <SectionRelatedToMe
          items={data.related_to_me}
          editState={editState}
          handlers={handlers}
          onAdd={item => addItem('related_to_me', item)}
        />
      </Card>

      <Card title="其他提醒" icon={<Bell className="w-4 h-4" />}>
        <SectionOtherReminders
          items={data.other_reminders}
          editState={editState}
          handlers={handlers}
          onAdd={item => addItem('other_reminders', item)}
        />
      </Card>
    </div>
  )
}
