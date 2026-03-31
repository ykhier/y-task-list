import type { TaskFilter } from '@/types'

export const TASK_LIST_FILTERS: { label: string; value: TaskFilter }[] = [
  { label: 'הכל', value: 'all' },
  { label: 'היום', value: 'today' },
  { label: 'השבוע', value: 'week' },
  { label: 'פעיל', value: 'active' },
  { label: 'הושלמו', value: 'completed' },
]
