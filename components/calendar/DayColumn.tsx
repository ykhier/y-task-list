'use client'

import { useState } from 'react'
import EventBlock from './EventBlock'
import { HOUR_HEIGHT, GRID_START_HOUR, GRID_END_HOUR, buildHours } from './calendar-constants'
import { minutesToTime } from '@/lib/date'
import type { CalendarEvent, WeekDay } from '@/types'

interface DayColumnProps {
  day: WeekDay
  events: CalendarEvent[]
  completedTaskIds: Set<string>
  gridStartHour?: number
  onEventClick?: (event: CalendarEvent) => void
  onSlotClick?: (dateStr: string, hour: number) => void
  onEventDrop?: (
    eventId: string,
    isTutorial: boolean,
    isTaskEvent: boolean,
    taskId: string | null,
    newDate: string,
    newStartTime: string,
    newEndTime: string,
  ) => void
}

export default function DayColumn({
  day,
  events,
  completedTaskIds,
  gridStartHour = GRID_START_HOUR,
  onEventClick,
  onSlotClick,
  onEventDrop,
}: DayColumnProps) {
  const [dragOverSlot, setDragOverSlot] = useState<number | null>(null)
  const hours = buildHours(gridStartHour)

  return (
    <div className="relative border-l border-slate-200" style={{ height: hours.length * HOUR_HEIGHT }}>
      {hours.map((h) => (
        <div
          key={h}
          role="button"
          tabIndex={0}
          aria-label={`${day.label} ${String(h % 24).padStart(2, '0')}:00`}
          onClick={() => onSlotClick?.(day.dateStr, h % 24)}
          onKeyDown={(e) => { if (e.key === 'Enter') onSlotClick?.(day.dateStr, h % 24) }}
          onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; setDragOverSlot(h) }}
          onDragLeave={() => setDragOverSlot(null)}
          onDrop={(e) => {
            e.preventDefault()
            e.stopPropagation()
            setDragOverSlot(null)
            try {
              const raw = e.dataTransfer.getData('application/json')
              if (!raw) return
              const { eventId, isTutorial, isTaskEvent, taskId, durationMins, offsetMins } = JSON.parse(raw)

              const slotRect = e.currentTarget.getBoundingClientRect()
              const yInSlot = Math.max(0, e.clientY - slotRect.top)
              const minsInSlot = Math.round((yInSlot / HOUR_HEIGHT) * 60)

              const rawStartMins = h * 60 + minsInSlot - offsetMins
              const snapped = Math.round(rawStartMins / 15) * 15
              const clamped = Math.max(gridStartHour * 60, Math.min(GRID_END_HOUR * 60, snapped))
              const endMins = clamped + durationMins

              onEventDrop?.(eventId, isTutorial, isTaskEvent, taskId, day.dateStr, minutesToTime(clamped % 1440), minutesToTime(endMins % 1440))
            } catch { /* ignore malformed drag data */ }
          }}
          style={{ top: (h - gridStartHour) * HOUR_HEIGHT, height: HOUR_HEIGHT }}
          className={`absolute inset-x-0 border-b border-slate-200 transition-colors duration-100 cursor-pointer ${
            dragOverSlot === h ? 'bg-blue-100/60' : 'hover:bg-blue-50/40'
          }`}
        />
      ))}

      {events.map((ev) => (
        <EventBlock
          key={ev.id}
          event={ev}
          isCompleted={ev.task_id ? completedTaskIds.has(ev.task_id) : false}
          hourHeight={HOUR_HEIGHT}
          gridStartHour={gridStartHour}
          onClick={onEventClick}
        />
      ))}
    </div>
  )
}
