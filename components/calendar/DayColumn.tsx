'use client'

import EventBlock from './EventBlock'
import type { CalendarEvent, WeekDay } from '@/types'

const HOUR_HEIGHT = 60
const GRID_START_HOUR = 8
const HOURS = Array.from({ length: 16 }, (_, i) => i + GRID_START_HOUR) // 08:00–23:00

interface DayColumnProps {
  day: WeekDay
  events: CalendarEvent[]
  completedTaskIds: Set<string>
  onEventClick?: (event: CalendarEvent) => void
  onSlotClick?: (dateStr: string, hour: number) => void
}

export default function DayColumn({
  day,
  events,
  completedTaskIds,
  onEventClick,
  onSlotClick,
}: DayColumnProps) {
  return (
    <div className="relative border-l border-slate-200" style={{ height: HOURS.length * HOUR_HEIGHT }}>
      {/* Hour slot backgrounds */}
      {HOURS.map((h) => (
        <div
          key={h}
          role="button"
          tabIndex={0}
          aria-label={`${day.label} ${h}:00`}
          onClick={() => onSlotClick?.(day.dateStr, h)}
          onKeyDown={(e) => { if (e.key === 'Enter') onSlotClick?.(day.dateStr, h) }}
          style={{ top: (h - GRID_START_HOUR) * HOUR_HEIGHT, height: HOUR_HEIGHT }}
          className="absolute inset-x-0 border-b border-slate-200 hover:bg-blue-50/40 transition-colors duration-100 cursor-pointer"
        />
      ))}


      {/* Events */}
      {events.map((ev) => (
        <EventBlock
          key={ev.id}
          event={ev}
          isCompleted={ev.task_id ? completedTaskIds.has(ev.task_id) : false}
          hourHeight={HOUR_HEIGHT}
          onClick={onEventClick}
        />
      ))}
    </div>
  )
}

export { HOUR_HEIGHT, HOURS, GRID_START_HOUR }
