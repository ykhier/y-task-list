import {
  format,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  isToday,
  parseISO,
} from 'date-fns'
import type { WeekDay } from '@/types'

export const DATE_FORMAT = 'yyyy-MM-dd'
export const TIME_FORMAT = 'HH:mm'

const HE_DAY_SHORT = ['א׳', 'ב׳', 'ג׳', 'ד׳', 'ה׳', 'ו׳', 'ש׳']

/** Returns YYYY-MM-DD string for a date */
export function toDateStr(date: Date): string {
  return format(date, DATE_FORMAT)
}

/** Parses YYYY-MM-DD into a Date at local midnight */
export function fromDateStr(str: string): Date {
  return parseISO(str)
}

/** Returns the 7 days of the week that contains `date` */
export function getWeekDays(date: Date): WeekDay[] {
  const start = startOfWeek(date, { weekStartsOn: 0 }) // Sunday
  const end = endOfWeek(date, { weekStartsOn: 0 })
  return eachDayOfInterval({ start, end }).map((d) => ({
    date: d,
    dateStr: toDateStr(d),
    label: HE_DAY_SHORT[d.getDay()],
    dayNum: d.getDate(),
    isToday: isToday(d),
  }))
}

/** "ב׳, 6 ינו׳" */
export function formatDayFull(date: Date): string {
  return date.toLocaleDateString('he-IL', { weekday: 'long' })
}

/** Convert "09:30" to pixel offset inside the grid (60px per hour) */
export function timeToOffset(time: string, hourHeight = 60): number {
  const [h, m] = time.split(':').map(Number)
  return (h + m / 60) * hourHeight
}

/** Convert "09:00" "10:30" to height in pixels */
export function timeRangeToHeight(
  startTime: string,
  endTime: string,
  hourHeight = 60
): number {
  const [sh, sm] = startTime.split(':').map(Number)
  const [eh, em] = endTime.split(':').map(Number)
  const startMins = sh * 60 + sm
  const endMins = eh * 60 + em
  return Math.max(((endMins - startMins) / 60) * hourHeight, hourHeight * 0.5)
}

/** Default end time = start + 1 hour (wraps past midnight) */
export function defaultEndTime(startTime: string): string {
  const [h, m] = startTime.split(':').map(Number)
  const totalMins = (h * 60 + m + 60) % (24 * 60)
  const endH = Math.floor(totalMins / 60)
  const endM = totalMins % 60
  return `${String(endH).padStart(2, '0')}:${String(endM).padStart(2, '0')}`
}

/** "09:30" → "09:30" */
export function formatTime12(time: string): string {
  const [h, m] = time.split(':').map(Number)
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}

/** Current time as "HH:MM" */
export function nowTime(): string {
  return format(new Date(), TIME_FORMAT)
}

/** Offset for the current time indicator */
export function currentTimeOffset(hourHeight = 60): number {
  return timeToOffset(nowTime(), hourHeight)
}

/** Convert "HH:MM" to total minutes from midnight */
export function timeToMinutes(time: string): number {
  const [h, m] = time.split(':').map(Number)
  return h * 60 + m
}

/** Convert total minutes from midnight to "HH:MM" */
export function minutesToTime(minutes: number): string {
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}

export { isToday }
