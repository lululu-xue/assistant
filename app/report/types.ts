export interface ReportStructured {
  weekly_progress: string[]
  current_risks:   string[]
  blockers:        string[]
  suggested_sync:  string[]
  next_plan:       string[]
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
  weekly_progress: '本周进展',
  current_risks:   '当前风险',
  blockers:        '卡点',
  suggested_sync:  '建议同步',
  next_plan:       '下周计划',
}

export const SECTION_COLORS: Record<keyof ReportStructured, string> = {
  weekly_progress: 'border-l-[#3370FF]',
  current_risks:   'border-l-[#FF4D4F]',
  blockers:        'border-l-orange-400',
  suggested_sync:  'border-l-[#52C41A]',
  next_plan:       'border-l-purple-400',
}
