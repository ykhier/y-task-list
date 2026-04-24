import { HOUR_HEIGHT, GRID_START_HOUR } from '@/components/calendar/calendar-constants'

export const RECURRING_HOUR_HEIGHT = HOUR_HEIGHT
export const RECURRING_GRID_START_HOUR = GRID_START_HOUR
// Recurring view is always fixed 08:00–23:00 (no past-midnight extension)
export const RECURRING_HOURS = Array.from({ length: 16 }, (_, i) => i + GRID_START_HOUR)
export const RECURRING_TIME_LABELS = RECURRING_HOURS.map((hour) => `${String(hour).padStart(2, '0')}:00`)
export const RECURRING_DAY_LABELS = ['א׳', 'ב׳', 'ג׳', 'ד׳', 'ה׳', 'ו׳', 'ש׳']

export const RECURRING_EVENT_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  blue: { bg: 'bg-blue-100 dark:bg-blue-900/50', text: 'text-blue-800 dark:text-blue-200', border: 'border-l-blue-500' },
  green: { bg: 'bg-green-100 dark:bg-green-900/50', text: 'text-green-800 dark:text-green-200', border: 'border-l-green-500' },
  orange: { bg: 'bg-orange-100 dark:bg-orange-900/50', text: 'text-orange-800 dark:text-orange-200', border: 'border-l-orange-500' },
  purple: { bg: 'bg-purple-100 dark:bg-purple-900/50', text: 'text-purple-800 dark:text-purple-200', border: 'border-l-purple-500' },
  red: { bg: 'bg-red-100 dark:bg-red-900/50', text: 'text-red-800 dark:text-red-200', border: 'border-l-red-500' },
}
