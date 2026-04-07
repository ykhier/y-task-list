'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { getWeekDays, toDateStr } from '@/lib/date'
import { buildEventsByDay, formatWeekRangeLabel, weekRangePreview } from './calendar-view/calendar-view-utils'
import { CalendarDesktopToolbar, CalendarMobileToolbar, MobileWeekNavigation } from './calendar-view/CalendarToolbars'
import { DesktopCalendarLayout, MobileCalendarLayout } from './calendar-view/CalendarLayouts'
import type { CalendarEvent, Task, WeekDay } from '@/types'

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
  onAddRecurringToWeek?: (weekDays: WeekDay[]) => Promise<string[]>
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
  const [selectedDayStr, setSelectedDayStr] = useState<string>(() => toDateStr(new Date()))
  const desktopScrollRef = useRef<HTMLDivElement>(null)
  const mobileScrollRef = useRef<HTMLDivElement>(null)

  const weekDays = useMemo(() => getWeekDays(currentDate), [currentDate])
  const selectedDay = useMemo(
    () => weekDays.find((day) => day.dateStr === selectedDayStr) ?? weekDays[0],
    [weekDays, selectedDayStr],
  )
  const weekLabel = useMemo(
    () => formatWeekRangeLabel(weekDays[0]?.date, weekDays[6]?.date),
    [weekDays],
  )
  const prevWeekLabel = useMemo(
    () => weekRangePreview(weekDays[0]?.date ?? new Date(), -1),
    [weekDays],
  )
  const nextWeekLabel = useMemo(
    () => weekRangePreview(weekDays[0]?.date ?? new Date(), 1),
    [weekDays],
  )
  const isCurrentWeek = useMemo(() => {
    const today = toDateStr(new Date())
    return weekDays.some((day) => day.dateStr === today)
  }, [weekDays])
  const completedTaskIds = useMemo(
    () => new Set(tasks.filter((task) => task.is_completed).map((task) => task.id)),
    [tasks],
  )
  const eventsByDay = useMemo(
    () => buildEventsByDay(events, completedTaskIds, tasks),
    [events, completedTaskIds, tasks],
  )

  useEffect(() => {
    const today = toDateStr(new Date())
    if (weekDays.some((day) => day.dateStr === today)) {
      setSelectedDayStr(today)
    } else {
      setSelectedDayStr(weekDays[0]?.dateStr ?? today)
    }
  }, [weekDays])

  useEffect(() => {
    if (desktopScrollRef.current) desktopScrollRef.current.scrollTop = 0
  }, [])

  useEffect(() => {
    if (mobileScrollRef.current) mobileScrollRef.current.scrollTop = 0
  }, [selectedDayStr])

  const handleAddRecurring = useCallback(async () => {
    if (!onAddRecurringToWeek) return
    setAddingRecurring(true)
    setRecurringConflicts([])
    const conflicts = await onAddRecurringToWeek(weekDays)
    setAddingRecurring(false)

    if (conflicts.length > 0) {
      setRecurringConflicts(conflicts)
      return
    }

    setRecurringDone(true)
    setTimeout(() => setRecurringDone(false), 2000)
  }, [onAddRecurringToWeek, weekDays])

  const goToPrevWeek = useCallback(() => {
    setCurrentDate((date) => {
      const next = new Date(date)
      next.setDate(next.getDate() - 7)
      return next
    })
    setRecurringConflicts([])
  }, [])

  const goToNextWeek = useCallback(() => {
    setCurrentDate((date) => {
      const next = new Date(date)
      next.setDate(next.getDate() + 7)
      return next
    })
    setRecurringDone(false)
    setRecurringConflicts([])
  }, [])

  const goToToday = useCallback(() => setCurrentDate(new Date()), [])
  const handleSlotClick = useCallback(
    (dateStr: string, hour: number) => onAddEvent?.(dateStr, hour % 24),
    [onAddEvent],
  )

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <CalendarDesktopToolbar
        weekLabel={weekLabel}
        isCurrentWeek={isCurrentWeek}
        recurringDone={recurringDone}
        addingRecurring={addingRecurring}
        hasRecurringAction={!!onAddRecurringToWeek}
        onPrevWeek={goToPrevWeek}
        onNextWeek={goToNextWeek}
        onToday={goToToday}
        onAddRecurring={handleAddRecurring}
        onAddEvent={() => onAddEvent?.(toDateStr(currentDate))}
      />

      <CalendarMobileToolbar
        weekLabel={weekLabel}
        isCurrentWeek={isCurrentWeek}
        recurringDone={recurringDone}
        addingRecurring={addingRecurring}
        hasRecurringAction={!!onAddRecurringToWeek}
        onToday={goToToday}
        onAddRecurring={handleAddRecurring}
        onAddEvent={() => onAddEvent?.(selectedDay?.dateStr ?? toDateStr(currentDate))}
      />

      {recurringConflicts.length > 0 && (
        <div className="flex-shrink-0 bg-red-50 border-b border-red-200 px-4 py-2">
          <p className="text-xs font-semibold text-red-700 mb-1">לא ניתן לצרף - נמצאו חפיפות:</p>
          <ul className="flex flex-col gap-0.5">
            {recurringConflicts.map((message, index) => (
              <li key={index} className="text-xs text-red-600">• {message}</li>
            ))}
          </ul>
          <button className="mt-1.5 text-[10px] text-red-400 underline" onClick={() => setRecurringConflicts([])}>
            סגור
          </button>
        </div>
      )}

      <MobileWeekNavigation
        prevWeekLabel={prevWeekLabel}
        nextWeekLabel={nextWeekLabel}
        onPrevWeek={goToPrevWeek}
        onNextWeek={goToNextWeek}
      />

      <MobileCalendarLayout
        weekDays={weekDays}
        selectedDay={selectedDay}
        selectedDayStr={selectedDayStr}
        eventsByDay={eventsByDay}
        completedTaskIds={completedTaskIds}
        mobileScrollRef={mobileScrollRef}
        onSelectDay={setSelectedDayStr}
        onEventClick={onEventClick}
        onSlotClick={handleSlotClick}
        onEventDrop={onEventDrop}
      />

      <DesktopCalendarLayout
        weekDays={weekDays}
        eventsByDay={eventsByDay}
        completedTaskIds={completedTaskIds}
        desktopScrollRef={desktopScrollRef}
        onEventClick={onEventClick}
        onSlotClick={handleSlotClick}
        onEventDrop={onEventDrop}
      />
    </div>
  )
}
