'use client'

import { useRef, useEffect, useState, useCallback, useMemo } from 'react'
import { Plus, ChevronLeft, ChevronRight, Repeat2 } from 'lucide-react'
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
  onAddRecurringToWeek?: (weekDays: import('@/types').WeekDay[]) => Promise<string[]>
}

const TIME_LABELS = HOURS.map((h) => `${String(h).padStart(2, '0')}:00`)

export default function CalendarView({
  events,
  tasks,
  onEventClick,
  onAddEvent,
  onEventDrop,
  onAddRecurringToWeek,
}: CalendarViewProps) {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [addingRecurring, setAddingRecurring] = useState(false)
  const [recurringDone, setRecurringDone] = useState(false)
  const [recurringConflicts, setRecurringConflicts] = useState<string[]>([])
  const scrollRef = useRef<HTMLDivElement>(null)

  const weekDays = useMemo(() => getWeekDays(currentDate), [currentDate])

  const handleAddRecurring = useCallback(async () => {
    if (!onAddRecurringToWeek) return
    setAddingRecurring(true)
    setRecurringConflicts([])
    const conflicts = await onAddRecurringToWeek(weekDays)
    setAddingRecurring(false)
    if (conflicts.length > 0) {
      setRecurringConflicts(conflicts)
    } else {
      setRecurringDone(true)
      setTimeout(() => setRecurringDone(false), 2000)
    }
  }, [onAddRecurringToWeek, weekDays])

  const goToPrevWeek = useCallback(() => {
    setCurrentDate((d) => { const n = new Date(d); n.setDate(n.getDate() - 7); return n })
    setRecurringConflicts([])
  }, [])

  const goToNextWeek = useCallback(() => {
    setCurrentDate((d) => { const n = new Date(d); n.setDate(n.getDate() + 7); return n })
    setRecurringDone(false)
    setRecurringConflicts([])
  }, [])

  const goToToday = useCallback(() => setCurrentDate(new Date()), [])

  const isCurrentWeek = useMemo(() => {
    const today = toDateStr(new Date())
    return weekDays.some((d) => d.dateStr === today)
  }, [weekDays])

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
      {/* Toolbar: week navigation + add button */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-slate-100 bg-white flex-shrink-0 gap-2">
        {/* Week label */}
        <span className="text-xs text-slate-500 font-medium">
          {weekDays[0]?.date.toLocaleDateString('he-IL', { day: 'numeric', month: 'short' })}
          {' – '}
          {weekDays[6]?.date.toLocaleDateString('he-IL', { day: 'numeric', month: 'short', year: 'numeric' })}
        </span>

        {/* Week navigation */}
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={goToPrevWeek}>
            <ChevronRight className="h-4 w-4" />
          </Button>
          {!isCurrentWeek && (
            <Button variant="ghost" size="sm" className="h-7 text-xs text-blue-500" onClick={goToToday}>
              היום
            </Button>
          )}
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={goToNextWeek}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex items-center gap-2">
          {onAddRecurringToWeek && (
            <Button
              size="sm"
              variant={recurringDone ? 'default' : 'outline'}
              className={cn(recurringDone && 'bg-green-500 hover:bg-green-600 border-green-500 text-white')}
              onClick={handleAddRecurring}
              disabled={addingRecurring}
            >
              <Repeat2 className="h-3.5 w-3.5" />
              {addingRecurring ? 'מצרף...' : recurringDone ? 'נוסף!' : 'צרף קבועות'}
            </Button>
          )}
          <Button size="sm" onClick={() => onAddEvent?.(toDateStr(currentDate))}>
            <Plus className="h-3.5 w-3.5" />
            הוסף הרצאה
          </Button>
        </div>
      </div>

      {/* Recurring conflicts banner */}
      {recurringConflicts.length > 0 && (
        <div className="flex-shrink-0 bg-red-50 border-b border-red-200 px-4 py-2">
          <p className="text-xs font-semibold text-red-700 mb-1">לא ניתן לצרף — נמצאו חפיפות:</p>
          <ul className="flex flex-col gap-0.5">
            {recurringConflicts.map((msg, i) => (
              <li key={i} className="text-xs text-red-600">• {msg}</li>
            ))}
          </ul>
          <button
            className="mt-1.5 text-[10px] text-red-400 underline"
            onClick={() => setRecurringConflicts([])}
          >
            סגור
          </button>
        </div>
      )}

      {/* Day header row */}
      <div
        className="grid flex-shrink-0 bg-white border-b border-slate-100"
        style={{ gridTemplateColumns: '56px repeat(7, 1fr)' }}
      >
        <div className="border-l border-slate-100" /> {/* spacer for time column */}
        {weekDays.map((day) => (
          <div
            key={day.dateStr}
            className="flex flex-col items-center justify-center py-2 border-l border-slate-100 gap-0.5"
          >
            <span className={cn('text-xs font-medium', day.isToday ? 'text-blue-400' : 'text-slate-400')}>
              {day.label}
            </span>
            <span
              className={cn(
                'text-lg font-bold leading-none w-8 h-8 flex items-center justify-center rounded-full',
                day.isToday ? 'bg-blue-500 text-white' : 'text-slate-700'
              )}
            >
              {day.dayNum}
            </span>
            <span className={cn('text-[10px] font-normal', day.isToday ? 'text-blue-400' : 'text-slate-400')}>
              {day.date.toLocaleDateString('he-IL', { month: 'short' })}
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
