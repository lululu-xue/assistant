export interface ReportStructured {
  done_items:        string[]
  in_progress_items: string[]
  blocked_items:     string[]
  open_items:        string[]
  next_plan:         string[]
}

export type Report = {
  id:         string
  title:      string
  content:    string
  tag:        string
  created_at: string
  updated_at: string
}

export const SECTION_LABELS: Record<keyof ReportStructured, string> = {
  done_items:        '已完成',
  in_progress_items: '进行中',
  blocked_items:     '受阻碍',
  open_items:        '待处理',
  next_plan:         '下步计划',
}

export const SECTION_COLORS: Record<keyof ReportStructured, string> = {
  done_items:        'border-l-[#52C41A]',
  in_progress_items: 'border-l-[#3370FF]',
  blocked_items:     'border-l-orange-400',
  open_items:        'border-l-gray-300',
  next_plan:         'border-l-purple-400',
}
