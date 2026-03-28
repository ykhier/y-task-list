'use client'

import { useRef, useEffect, useState, useCallback, useMemo } from 'react'
import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import DayColumn, { HOUR_HEIGHT, HOURS, GRID_START_HOUR } from './DayColumn'
import { getWeekDays, toDateStr } from '@/lib/date'
import { cn } from '@/lib/utils'
import type { CalendarEvent, Task } from '@/types'

interface CalendarViewProps {
  events: CalendarEvent[]
  tasks: Task[]
  onEventClick?: (event: CalendarEvent) => void
  onAddEvent?: (dateStr: string, hour?: number) => void
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

const TIME_LABELS = HOURS.map((h) => `${String(h).padStart(2, '0')}:00`)

export default function CalendarView({
  events,
  tasks,
  onEventClick,
  onAddEvent,
  onEventDrop,
}: CalendarViewProps) {
  const [currentDate, setCurrentDate] = useState(new Date())
  const scrollRef = useRef<HTMLDivElement>(null)

  const weekDays = useMemo(() => getWeekDays(currentDate), [currentDate])

  // Scroll to top (grid already starts at 08:00)
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = 0
    }
  }, [])

  const completedTaskIds = useMemo(
    () => new Set(tasks.filter((t) => t.is_completed).map((t) => t.id)),
    [tasks]
  )

  const eventsByDay = useMemo(() => {
    const map: Record<string, CalendarEvent[]> = {}
    for (const ev of events) {
      if (ev.task_id && completedTaskIds.has(ev.task_id)) continue
      if (!map[ev.date]) map[ev.date] = []
      map[ev.date].push(ev)
    }
    return map
  }, [events, completedTaskIds])

  const handleSlotClick = useCallback(
    (dateStr: string, hour: number) => onAddEvent?.(dateStr, hour),
    [onAddEvent]
  )

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Add event button */}
      <div className="flex justify-end px-4 py-2 border-b border-slate-100 bg-white flex-shrink-0">
        <Button size="sm" onClick={() => onAddEvent?.(toDateStr(currentDate))}>
          <Plus className="h-3.5 w-3.5" />
          הוסף הרצאה
        </Button>
      </div>

      {/* Day header row */}
      <div
        className="grid flex-shrink-0 bg-white border-b border-slate-100"
        style={{ gridTemplateColumns: '56px repeat(7, 1fr)' }}
      >
        <div className="border-l border-slate-100" /> {/* spacer for time column */}
        {weekDays.map((day) => (
          <div
            key={day.dateStr}
            className="flex items-center justify-center py-3 border-l border-slate-100"
          >
            <span
              className={cn(
                'text-sm font-semibold px-2 py-0.5 rounded-md',
                day.isToday ? 'text-blue-500' : 'text-slate-500'
              )}
            >
              {day.label}
            </span>
          </div>
        ))}
      </div>

      {/* Scrollable grid */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto overflow-x-hidden">
        <div
          className="grid"
          style={{ gridTemplateColumns: '56px repeat(7, 1fr)' }}
        >
          {/* Time labels column */}
          <div className="relative border-l border-slate-200">
            {HOURS.map((h, i) => (
              <div
                key={h}
                style={{ top: (h - GRID_START_HOUR) * HOUR_HEIGHT, height: HOUR_HEIGHT }}
                className="absolute inset-x-0 flex items-center justify-end pr-2 border-b border-slate-200"
              >
                <span className="text-[10px] text-slate-500 font-medium">
                  {TIME_LABELS[i]}
                </span>
              </div>
            ))}
            <div style={{ height: HOURS.length * HOUR_HEIGHT }} />
          </div>

          {/* Day columns */}
          {weekDays.map((day) => (
            <DayColumn
              key={day.dateStr}
              day={day}
              events={eventsByDay[day.dateStr] ?? []}
              completedTaskIds={completedTaskIds}
              onEventClick={onEventClick}
              onSlotClick={handleSlotClick}
              onEventDrop={onEventDrop}
            />
          ))}
        </div>
      </div>
    </div>
  )
}
