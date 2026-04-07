'use client'

import { useState } from 'react'
import EventBlock from './EventBlock'
import { HOUR_HEIGHT, GRID_START_HOUR, buildHours, getGridEndHour } from './calendar-constants'
import { minutesToTime } from '@/lib/date'
import type { CalendarEvent, WeekDay } from '@/types'

interface DayColumnProps {
  day: WeekDay
  events: CalendarEvent[]
  completedTaskIds: Set<string>
  gridStartHour?: number
  gridEndHour?: number
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
  gridEndHour = getGridEndHour(gridStartHour),
  onEventClick,
  onSlotClick,
  onEventDrop,
}: DayColumnProps) {
  const [dragOverSlot, setDragOverSlot] = useState<number | null>(null)
  const hours = buildHours(gridStartHour, gridEndHour)

  return (
    <div
      className="relative border-l border-slate-200"
      style={{ height: hours.length * HOUR_HEIGHT }}
    >
      {hours.map((hour) => (
        <div
          key={hour}
          role="button"
          tabIndex={0}
          aria-label={`${day.label} ${String(hour % 24).padStart(2, '0')}:00`}
          onClick={() => onSlotClick?.(day.dateStr, hour % 24)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              onSlotClick?.(day.dateStr, hour % 24)
            }
          }}
          onDragOver={(event) => {
            event.preventDefault()
            event.dataTransfer.dropEffect = 'move'
            setDragOverSlot(hour)
          }}
          onDragLeave={() => setDragOverSlot(null)}
          onDrop={(event) => {
            event.preventDefault()
            event.stopPropagation()
            setDragOverSlot(null)

            try {
              const raw = event.dataTransfer.getData('application/json')
              if (!raw) return

              const { eventId, isTutorial, isTaskEvent, taskId, durationMins, offsetMins } =
                JSON.parse(raw)

              const slotRect = event.currentTarget.getBoundingClientRect()
              const yInSlot = Math.max(0, event.clientY - slotRect.top)
              const minsInSlot = Math.round((yInSlot / HOUR_HEIGHT) * 60)

              const rawStartMins = hour * 60 + minsInSlot - offsetMins
              const snapped = Math.round(rawStartMins / 15) * 15
              const clamped = Math.max(
                gridStartHour * 60,
                Math.min(gridEndHour * 60, snapped)
              )
              const endMins = clamped + durationMins

              onEventDrop?.(
                eventId,
                isTutorial,
                isTaskEvent,
                taskId,
                day.dateStr,
                minutesToTime(clamped % 1440),
                minutesToTime(endMins % 1440)
              )
            } catch {
              // Ignore malformed drag data.
            }
          }}
          style={{ top: (hour - gridStartHour) * HOUR_HEIGHT, height: HOUR_HEIGHT }}
          className={`absolute inset-x-0 cursor-pointer border-b border-slate-200 transition-colors duration-100 ${
            dragOverSlot === hour ? 'bg-blue-100/60' : 'hover:bg-blue-50/40'
          }`}
        />
      ))}

      {events.map((event) => (
        <EventBlock
          key={event.id}
          event={event}
          isCompleted={event.task_id ? completedTaskIds.has(event.task_id) : false}
          hourHeight={HOUR_HEIGHT}
          gridStartHour={gridStartHour}
          onClick={onEventClick}
        />
      ))}
    </div>
  )
}
