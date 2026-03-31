import type { CalendarEvent, Task } from '@/types'

export interface Pattern<T> {
  key: string
  item: T
  dayOfWeek: number
  allIds: string[]
}

export interface GridItem {
  key: string
  allIds: string[]
  title: string
  startTime: string
  endTime: string
  color: string
  type: 'task' | 'event' | 'tutorial'
  dayOfWeek: number
  rawTask?: Task
  rawEvent?: CalendarEvent
}

function getDayOfWeek(dateStr: string) {
  return new Date(`${dateStr}T00:00:00`).getDay()
}

export function hhmm(time: string) {
  return time.slice(0, 5)
}

export function buildPatterns<T extends { id: string; title: string; date: string }>(
  items: T[],
  getTime: (item: T) => string,
): Pattern<T>[] {
  const map = new Map<string, Pattern<T>>()

  for (const item of items) {
    const dayOfWeek = getDayOfWeek(item.date)
    const time = getTime(item)
    const key = `${item.title}|${dayOfWeek}|${time}`
    const existing = map.get(key)

    if (!existing) {
      map.set(key, { key, item, dayOfWeek, allIds: [item.id] })
      continue
    }

    existing.allIds.push(item.id)
  }

  return Array.from(map.values())
}

export function buildRecurringGridItems(tasks: Task[], events: CalendarEvent[], tutorials: CalendarEvent[]) {
  const items: GridItem[] = []

  for (const pattern of buildPatterns(
    tasks.filter((task) => task.is_recurring && !task.is_completed && !!task.time && !!task.end_time),
    (task) => task.time ?? '',
  )) {
    items.push({
      key: `task|${pattern.key}`,
      allIds: pattern.allIds,
      title: pattern.item.title,
      startTime: pattern.item.time!,
      endTime: pattern.item.end_time!,
      color: 'green',
      type: 'task',
      dayOfWeek: pattern.dayOfWeek,
      rawTask: pattern.item,
    })
  }

  for (const pattern of buildPatterns(
    events.filter((event) => event.is_recurring && event.source === 'manual'),
    (event) => event.start_time,
  )) {
    items.push({
      key: `event|${pattern.key}`,
      allIds: pattern.allIds,
      title: pattern.item.title,
      startTime: pattern.item.start_time,
      endTime: pattern.item.end_time,
      color: pattern.item.color ?? 'blue',
      type: 'event',
      dayOfWeek: pattern.dayOfWeek,
      rawEvent: pattern.item,
    })
  }

  for (const pattern of buildPatterns(
    tutorials.filter((tutorial) => tutorial.is_recurring),
    (tutorial) => tutorial.start_time,
  )) {
    items.push({
      key: `tutorial|${pattern.key}`,
      allIds: pattern.allIds,
      title: pattern.item.title,
      startTime: pattern.item.start_time,
      endTime: pattern.item.end_time,
      color: pattern.item.color ?? 'orange',
      type: 'tutorial',
      dayOfWeek: pattern.dayOfWeek,
      rawEvent: pattern.item,
    })
  }

  return items
}

export function buildRecurringTaskChips(tasks: Task[]) {
  return buildPatterns(
    tasks.filter((task) => task.is_recurring && !task.is_completed && !task.time),
    () => '',
  )
}

export function groupGridItemsByDay(items: GridItem[]) {
  const map: Record<number, GridItem[]> = {}
  for (let index = 0; index < 7; index += 1) map[index] = []
  for (const item of items) map[item.dayOfWeek].push(item)
  return map
}

export function groupPatternsByDay<T extends { dayOfWeek: number }>(patterns: T[]) {
  const map: Record<number, T[]> = {}
  for (let index = 0; index < 7; index += 1) map[index] = []
  for (const pattern of patterns) map[pattern.dayOfWeek].push(pattern)
  return map
}
