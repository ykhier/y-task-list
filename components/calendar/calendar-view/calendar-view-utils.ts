import type { CalendarEvent, Task } from '@/types'

export function formatWeekRangeLabel(startDate?: Date, endDate?: Date) {
  if (!startDate || !endDate) return ''
  return [
    startDate.toLocaleDateString('he-IL', { day: 'numeric', month: 'short' }),
    endDate.toLocaleDateString('he-IL', { day: 'numeric', month: 'short', year: 'numeric' }),
  ].join(' – ')
}

export function weekRangePreview(startDate: Date, offsetWeeks: number) {
  const start = new Date(startDate)
  const end = new Date(startDate)
  start.setDate(start.getDate() + offsetWeeks * 7)
  end.setDate(end.getDate() + offsetWeeks * 7 + 6)
  const format = (date: Date) => date.toLocaleDateString('he-IL', { day: 'numeric', month: 'short' })
  return `${format(start)} – ${format(end)}`
}

export function buildEventsByDay(events: CalendarEvent[], completedTaskIds: Set<string>, tasks: Task[]) {
  const map: Record<string, CalendarEvent[]> = {}
  const taskMap = new Map(tasks.map((t) => [t.id, t]))

  for (const event of events) {
    if (event.task_id && completedTaskIds.has(event.task_id)) continue
    if (!map[event.date]) map[event.date] = []

    const linkedTask = event.task_id ? taskMap.get(event.task_id) : undefined
    map[event.date].push(
      linkedTask && !event.is_recurring && linkedTask.is_recurring
        ? { ...event, is_recurring: true }
        : event,
    )
  }

  return map
}
