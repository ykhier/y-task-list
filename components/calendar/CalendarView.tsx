'use client'

import { useRef, useEffect, useState, useCallback, useMemo } from 'react'
import { Plus, ChevronLeft, ChevronRight, Repeat2, ArrowRight, ArrowLeft } from 'lucide-react'
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

function weekRange(startDate: Date, offsetWeeks: number): string {
  const s = new Date(startDate)
  const e = new Date(startDate)
  s.setDate(s.getDate() + offsetWeeks * 7)
  e.setDate(e.getDate() + offsetWeeks * 7 + 6)
  const fmt = (d: Date) => d.toLocaleDateString('he-IL', { day: 'numeric', month: 'short' })
  return `${fmt(s)} – ${fmt(e)}`
}

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
  const mobileScrollRef = useRef<HTMLDivElement>(null)

  const weekDays = useMemo(() => getWeekDays(currentDate), [currentDate])

  // Mobile: which day is selected — defaults to today if in current week
  const [selectedDayStr, setSelectedDayStr] = useState<string>(() => toDateStr(new Date()))

  // When the week changes: re-anchor to today (if in week) or first day
  useEffect(() => {
    const today = toDateStr(new Date())
    if (weekDays.some((d) => d.dateStr === today)) {
      setSelectedDayStr(today)
    } else {
      setSelectedDayStr(weekDays[0]?.dateStr ?? today)
    }
  }, [weekDays])

  // Reset mobile scroll when selected day changes
  useEffect(() => {
    if (mobileScrollRef.current) mobileScrollRef.current.scrollTop = 0
  }, [selectedDayStr])

  const selectedDay = useMemo(
    () => weekDays.find((d) => d.dateStr === selectedDayStr) ?? weekDays[0],
    [weekDays, selectedDayStr],
  )

  // Compute prev/next week date ranges for the mobile nav labels
  const prevWeekLabel = useMemo(() => weekRange(weekDays[0]?.date ?? new Date(), -1), [weekDays])
  const nextWeekLabel = useMemo(() => weekRange(weekDays[0]?.date ?? new Date(), 1), [weekDays])

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

  // Scroll desktop grid to top on mount
  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = 0
  }, [])

  const completedTaskIds = useMemo(
    () => new Set(tasks.filter((t) => t.is_completed).map((t) => t.id)),
    [tasks],
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
    [onAddEvent],
  )

  return (
    <div className="flex flex-col h-full overflow-hidden">

      {/* ── Toolbar (desktop) ── */}
      <div className="hidden sm:flex items-center justify-between px-4 py-2 border-b border-slate-100 bg-white flex-shrink-0 gap-2">
        <span className="text-xs text-slate-500 font-medium min-w-0 truncate">
          {weekDays[0]?.date.toLocaleDateString('he-IL', { day: 'numeric', month: 'short' })}
          {' – '}
          {weekDays[6]?.date.toLocaleDateString('he-IL', { day: 'numeric', month: 'short', year: 'numeric' })}
        </span>
        <div className="flex items-center gap-0.5 flex-shrink-0">
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={goToPrevWeek}>
            <ChevronRight className="h-4 w-4" />
          </Button>
          {!isCurrentWeek && (
            <Button variant="ghost" size="sm" className="h-7 text-xs text-blue-500 px-2" onClick={goToToday}>
              היום
            </Button>
          )}
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={goToNextWeek}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
        </div>
        <div className="flex items-center gap-1.5 flex-shrink-0">
          {onAddRecurringToWeek && (
            <Button
              size="sm"
              variant={recurringDone ? 'default' : 'outline'}
              className={cn(recurringDone && 'bg-green-500 hover:bg-green-600 border-green-500 text-white')}
              onClick={handleAddRecurring}
              disabled={addingRecurring}
            >
              <Repeat2 className="h-3.5 w-3.5 flex-shrink-0" />
              <span>{addingRecurring ? 'מצרף...' : recurringDone ? 'נוסף!' : 'צרף קבועות'}</span>
            </Button>
          )}
          <Button size="sm" onClick={() => onAddEvent?.(toDateStr(currentDate))}>
            <Plus className="h-3.5 w-3.5 flex-shrink-0" />
            <span>הוסף הרצאה</span>
          </Button>
        </div>
      </div>

      {/* ── Mobile toolbar (compact — no nav arrows here) ── */}
      <div className="flex sm:hidden items-center justify-between px-3 py-2 border-b border-slate-100 bg-white flex-shrink-0 gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-xs text-slate-500 font-medium truncate">
            {weekDays[0]?.date.toLocaleDateString('he-IL', { day: 'numeric', month: 'short' })}
            {' – '}
            {weekDays[6]?.date.toLocaleDateString('he-IL', { day: 'numeric', month: 'short', year: 'numeric' })}
          </span>
          {!isCurrentWeek && (
            <button
              onClick={goToToday}
              className="flex-shrink-0 text-[10px] font-semibold text-blue-500 bg-blue-50 border border-blue-200 rounded-full px-2 py-0.5 cursor-pointer"
            >
              היום
            </button>
          )}
        </div>
        <div className="flex items-center gap-1.5 flex-shrink-0">
          {onAddRecurringToWeek && (
            <Button
              size="sm"
              variant={recurringDone ? 'default' : 'outline'}
              className={cn('min-h-[44px]', recurringDone && 'bg-green-500 hover:bg-green-600 border-green-500 text-white')}
              onClick={handleAddRecurring}
              disabled={addingRecurring}
            >
              <Repeat2 className="h-3.5 w-3.5" />
            </Button>
          )}
          <Button
            size="sm"
            className="min-h-[44px]"
            onClick={() => onAddEvent?.(selectedDay?.dateStr ?? toDateStr(currentDate))}
          >
            <Plus className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      {/* ── Recurring conflicts banner ── */}
      {recurringConflicts.length > 0 && (
        <div className="flex-shrink-0 bg-red-50 border-b border-red-200 px-4 py-2">
          <p className="text-xs font-semibold text-red-700 mb-1">לא ניתן לצרף — נמצאו חפיפות:</p>
          <ul className="flex flex-col gap-0.5">
            {recurringConflicts.map((msg, i) => (
              <li key={i} className="text-xs text-red-600">• {msg}</li>
            ))}
          </ul>
          <button className="mt-1.5 text-[10px] text-red-400 underline" onClick={() => setRecurringConflicts([])}>
            סגור
          </button>
        </div>
      )}

      {/* ══════════════════════════════════════════════
          MOBILE: Week navigation — prev (right) | next (left)
          ══════════════════════════════════════════════ */}
      <div className="flex sm:hidden flex-shrink-0 bg-white border-b border-slate-100 px-3 py-2.5 gap-2.5">

        {/* Previous week — right side */}
        <button
          onClick={goToPrevWeek}
          className="group relative flex-1 flex items-center gap-3 px-3.5 py-3 rounded-2xl bg-slate-50 border border-slate-200 overflow-hidden cursor-pointer transition-all duration-200 active:scale-[0.97] hover:border-blue-200 hover:bg-blue-50/60"
        >
          <div className="relative flex-shrink-0 w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow-sm shadow-blue-200">
            <ArrowRight className="h-4.5 w-4.5 text-white" style={{ width: 18, height: 18 }} />
          </div>
          <div className="relative flex flex-col items-start min-w-0">
            <span className="text-xs font-bold text-slate-800 leading-tight">שבוע קודם</span>
            <span className="text-[10px] text-slate-400 font-medium mt-0.5 truncate max-w-[90px]">{prevWeekLabel}</span>
          </div>
        </button>

        {/* Divider dot */}
        <div className="flex items-center flex-shrink-0">
          <div className="w-1 h-1 rounded-full bg-slate-300" />
        </div>

        {/* Next week — left side */}
        <button
          onClick={goToNextWeek}
          className="group relative flex-1 flex items-center justify-end gap-3 px-3.5 py-3 rounded-2xl bg-slate-50 border border-slate-200 overflow-hidden cursor-pointer transition-all duration-200 active:scale-[0.97] hover:border-violet-200 hover:bg-violet-50/60"
        >
          <div className="relative flex flex-col items-end min-w-0">
            <span className="text-xs font-bold text-slate-800 leading-tight">שבוע הבא</span>
            <span className="text-[10px] text-slate-400 font-medium mt-0.5 truncate max-w-[90px]">{nextWeekLabel}</span>
          </div>
          <div className="relative flex-shrink-0 w-9 h-9 rounded-xl bg-gradient-to-br from-violet-500 to-violet-600 flex items-center justify-center shadow-sm shadow-violet-200">
            <ArrowLeft className="text-white" style={{ width: 18, height: 18 }} />
          </div>
        </button>

      </div>

      {/* ══════════════════════════════════════════════
          MOBILE: Day picker strip + single day column
          ══════════════════════════════════════════════ */}
      <div className="flex sm:hidden flex-col flex-1 overflow-hidden">

        {/* Day picker strip */}
        <div className="flex-shrink-0 bg-white border-b border-slate-100">
          <div className="flex overflow-x-auto py-2 px-1 gap-0.5 no-scrollbar">
            {weekDays.map((day) => {
              const isSelected = selectedDayStr === day.dateStr
              return (
                <button
                  key={day.dateStr}
                  onClick={() => setSelectedDayStr(day.dateStr)}
                  className={cn(
                    'flex flex-col items-center gap-0.5 flex-1 min-w-[44px] py-1.5 rounded-xl cursor-pointer transition-colors duration-150',
                    isSelected && !day.isToday && 'bg-blue-50',
                  )}
                >
                  <span className={cn(
                    'text-[11px] font-medium',
                    day.isToday ? 'text-blue-500' : isSelected ? 'text-blue-600' : 'text-slate-400',
                  )}>
                    {day.label}
                  </span>
                  <span className={cn(
                    'w-8 h-8 flex items-center justify-center rounded-full text-sm font-bold transition-all duration-150',
                    day.isToday
                      ? 'bg-blue-500 text-white'
                      : isSelected
                      ? 'text-blue-600 ring-2 ring-blue-400'
                      : 'text-slate-700',
                  )}>
                    {day.dayNum}
                  </span>
                  <span className={cn(
                    'text-[10px]',
                    day.isToday ? 'text-blue-400' : 'text-slate-400',
                  )}>
                    {day.date.toLocaleDateString('he-IL', { month: 'short' })}
                  </span>
                </button>
              )
            })}
          </div>
        </div>

        {/* Single day time grid */}
        <div ref={mobileScrollRef} className="flex-1 overflow-y-auto overflow-x-hidden">
          <div className="grid" style={{ gridTemplateColumns: '56px 1fr' }}>
            {/* Time labels */}
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

            {/* The selected day column */}
            {selectedDay && (
              <DayColumn
                day={selectedDay}
                events={eventsByDay[selectedDay.dateStr] ?? []}
                completedTaskIds={completedTaskIds}
                onEventClick={onEventClick}
                onSlotClick={handleSlotClick}
                onEventDrop={onEventDrop}
              />
            )}
          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════════════
          DESKTOP: 7-column week view
          ══════════════════════════════════════════════ */}
      <div className="hidden sm:flex sm:flex-col flex-1 overflow-x-auto overflow-y-hidden">
        <div className="flex flex-col h-full" style={{ minWidth: '480px' }}>

          {/* Day header row */}
          <div
            className="grid flex-shrink-0 bg-white border-b border-slate-100"
            style={{ gridTemplateColumns: '56px repeat(7, 1fr)' }}
          >
            <div className="border-l border-slate-100" />
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
                    day.isToday ? 'bg-blue-500 text-white' : 'text-slate-700',
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

          {/* Vertically scrollable grid */}
          <div ref={scrollRef} className="flex-1 overflow-y-auto overflow-x-hidden">
            <div className="grid" style={{ gridTemplateColumns: '56px repeat(7, 1fr)' }}>
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
      </div>

    </div>
  )
}
