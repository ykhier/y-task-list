import { toDateStr } from '@/lib/date'
import type { CalendarEvent, Task, TaskFilter } from '@/types'

export type TaskFormPayload = Omit<Task, 'id' | 'user_id' | 'created_at' | 'is_completed'>

export function getFilteredTasks(
  tasks: Task[],
  filter: TaskFilter,
  selectedDate?: string,
  today = toDateStr(new Date()),
) {
  let list = tasks

  if (selectedDate) {
    list = list.filter((task) => task.date === selectedDate)
  } else {
    if (filter === 'today') list = list.filter((task) => task.date === today)
    if (filter === 'week') {
      const now = new Date()
      const day = now.getDay()
      const start = new Date(now)
      start.setDate(now.getDate() - day)
      const end = new Date(now)
      end.setDate(now.getDate() + (6 - day))
      const weekStart = toDateStr(start)
      const weekEnd = toDateStr(end)
      list = list.filter((task) => task.date >= weekStart && task.date <= weekEnd)
    }
    if (filter === 'active') list = list.filter((task) => !task.is_completed)
    if (filter === 'completed') list = list.filter((task) => task.is_completed)
  }

  return [...list].sort((a, b) => {
    if (a.is_completed !== b.is_completed) return a.is_completed ? 1 : -1
    if (a.time && b.time) return a.time.localeCompare(b.time)
    if (a.time && !b.time) return -1
    if (!a.time && b.time) return 1
    return a.created_at.localeCompare(b.created_at)
  })
}

export interface TaskDialogState {
  open: boolean
  title: string
  suggestion?: string | null
  error?: string | null
  editTask?: Task | null
  initialDate: string
  tasks: Task[]
  events: CalendarEvent[]
  isLoading: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (data: TaskFormPayload) => Promise<void>
  onCancel: () => void
}
