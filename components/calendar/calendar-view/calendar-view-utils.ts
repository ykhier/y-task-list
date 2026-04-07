import { timeToMinutes, fromDateStr, toDateStr } from '@/lib/date'
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

/** True when an event's end time is earlier than its start time (crosses midnight).
 *  An end_time of "00:00" means "ends exactly at midnight" — no split needed. */
function crossesMidnight(startTime: string, endTime: string): boolean {
  const endMins = timeToMinutes(endTime.slice(0, 5))
  const startMins = timeToMinutes(startTime.slice(0, 5))
  return endMins > 0 && startMins > endMins
}

function addOneDay(dateStr: string): string {
  const d = fromDateStr(dateStr)
  d.setDate(d.getDate() + 1)
  return toDateStr(d)
}

export function buildEventsByDay(events: CalendarEvent[], completedTaskIds: Set<string>, tasks: Task[]) {
  const map: Record<string, CalendarEvent[]> = {}
  const taskMap = new Map(tasks.map((t) => [t.id, t]))

  function push(dateStr: string, ev: CalendarEvent) {
    if (!map[dateStr]) map[dateStr] = []
    map[dateStr].push(ev)
  }

  for (const event of events) {
    if (event.task_id && completedTaskIds.has(event.task_id)) continue

    const linkedTask = event.task_id ? taskMap.get(event.task_id) : undefined
    const resolved: CalendarEvent =
      linkedTask && !event.is_recurring && linkedTask.is_recurring
        ? { ...event, is_recurring: true }
        : event

    if (crossesMidnight(resolved.start_time, resolved.end_time)) {
      // Before midnight: stays on the original date; keep original times so edit modal is correct
      push(resolved.date, { ...resolved, splitContinuation: 'start' })
      // After midnight: shown on the next day's column; original date/times preserved for editing
      push(addOneDay(resolved.date), { ...resolved, splitContinuation: 'end' })
    } else {
      push(resolved.date, resolved)
    }
  }

  return map
}
