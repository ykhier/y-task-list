'use client'

import { useState } from 'react'
import EventBlock from './EventBlock'
import { HOUR_HEIGHT, GRID_START_HOUR, HOURS } from './calendar-constants'
import { minutesToTime } from '@/lib/date'
import type { CalendarEvent, WeekDay } from '@/types'

interface DayColumnProps {
  day: WeekDay
  events: CalendarEvent[]
  completedTaskIds: Set<string>
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
  onEventClick,
  onSlotClick,
  onEventDrop,
}: DayColumnProps) {
  const [dragOverSlot, setDragOverSlot] = useState<number | null>(null)

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
              const clamped = Math.max(GRID_START_HOUR * 60, Math.min((GRID_START_HOUR + HOURS.length - 1) * 60, snapped))
              const endMins = clamped + durationMins

              onEventDrop?.(eventId, isTutorial, isTaskEvent, taskId, day.dateStr, minutesToTime(clamped), minutesToTime(endMins))
            } catch { /* ignore malformed drag data */ }
          }}
          style={{ top: (h - GRID_START_HOUR) * HOUR_HEIGHT, height: HOUR_HEIGHT }}
          className={`absolute inset-x-0 border-b border-slate-200 transition-colors duration-100 cursor-pointer ${
            dragOverSlot === h ? 'bg-blue-100/60' : 'hover:bg-blue-50/40'
          }`}
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
