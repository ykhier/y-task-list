import { toDateStr } from '@/lib/date'
import type { CalendarEvent, Task, WeekDay } from '@/types'

type TimedEntry = {
  id?: string
  title: string
  date: string
  start_time: string
  end_time: string
}

const hhmm = (t: string) => t.slice(0, 5)

export function overlaps(startA: string, endA: string, startB: string, endB: string) {
  const [a0, a1, b0, b1] = [startA, endA, startB, endB].map(hhmm)
  return a0 < b1 && a1 > b0
}

export function targetRecurringDate(weekDays: WeekDay[], dateStr: string) {
  return weekDays.find((day) => day.date.getDay() === new Date(`${dateStr}T00:00:00`).getDay())?.dateStr
}

export function getRecurringEventsInWeek(
  events: CalendarEvent[],
  tutorials: CalendarEvent[],
  weekDays: WeekDay[],
) {
  return [
    ...events.filter((event) => weekDays.some((day) => day.dateStr === event.date)),
    ...tutorials.filter((tutorial) => weekDays.some((day) => day.dateStr === tutorial.date)),
  ]
}

export function getTimedTasksInWeek(tasks: Task[], weekDays: WeekDay[]) {
  return tasks.filter(
    (task) => task.time && task.end_time && weekDays.some((day) => day.dateStr === task.date),
  )
}

export function getRecurringSuggestion(
  date: string,
  startTime: string,
  endTime: string,
  events: CalendarEvent[],
  tutorials: CalendarEvent[],
  tasks: Task[],
): string | null {
  const previousWeekDate = new Date(`${date}T00:00:00`)
  previousWeekDate.setDate(previousWeekDate.getDate() - 7)
  const prevDateStr = toDateStr(previousWeekDate)

  const isMatchingEvent = (event: CalendarEvent) =>
    event.date === prevDateStr &&
    event.is_recurring &&
    overlaps(startTime, endTime, event.start_time, event.end_time)

  const match =
    events.find(isMatchingEvent) ??
    tutorials.find(isMatchingEvent) ??
    tasks.find(
      (task) =>
        task.date === prevDateStr &&
        task.is_recurring &&
        task.time &&
        task.end_time &&
        overlaps(startTime, endTime, task.time, task.end_time),
    )

  if (!match) return null

  const startDisplay = 'start_time' in match ? match.start_time : match.time
  return `"${match.title}" קבועה מהשבוע הקודם באותה שעה (${startDisplay}–${match.end_time}). השתמש ב"צרף קבועות" כדי לצרף את כל הקבועות בבת אחת.`
}

export function hasTimedConflict(
  items: TimedEntry[],
  date: string,
  startTime: string,
  endTime: string,
  excludeId?: string,
) {
  return items.some(
    (item) =>
      (!excludeId || item.id !== excludeId) &&
      item.date === date &&
      overlaps(startTime, endTime, item.start_time, item.end_time),
  )
}
