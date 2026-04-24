'use client'

import type { RefObject } from 'react'
import DayColumn from '../DayColumn'
import TimeLabelsColumn from '../TimeLabelsColumn'
import { cn } from '@/lib/utils'
import { GRID_START_HOUR, EARLY_START_HOUR, getGridEndHour } from '../calendar-constants'
import type { CalendarEvent, WeekDay } from '@/types'

interface CalendarGridProps {
  weekDays: WeekDay[]
  selectedDay?: WeekDay
  selectedDayStr: string
  eventsByDay: Record<string, CalendarEvent[]>
  completedTaskIds: Set<string>
  desktopScrollRef: RefObject<HTMLDivElement | null>
  mobileScrollRef: RefObject<HTMLDivElement | null>
  onSelectDay: (dateStr: string) => void
  onEventClick?: (event: CalendarEvent) => void
  onSlotClick: (dateStr: string, hour: number) => void
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

function hasEarlyEvent(events: CalendarEvent[]): boolean {
  return events.some((event) => {
    const hour = parseInt(event.start_time.slice(0, 2), 10)
    return hour >= EARLY_START_HOUR && hour < GRID_START_HOUR
  })
}

export function MobileCalendarLayout({
  weekDays,
  selectedDay,
  selectedDayStr,
  eventsByDay,
  completedTaskIds,
  mobileScrollRef,
  onSelectDay,
  onEventClick,
  onSlotClick,
  onEventDrop,
}: Omit<CalendarGridProps, 'desktopScrollRef'>) {
  const dayEvents = selectedDay ? (eventsByDay[selectedDay.dateStr] ?? []) : []
  const gridStartHour = hasEarlyEvent(dayEvents) ? EARLY_START_HOUR : GRID_START_HOUR
  const gridEndHour = getGridEndHour(gridStartHour)

  return (
    <div className="flex flex-1 flex-col overflow-hidden sm:hidden">
      <div className="flex-shrink-0 border-b border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900">
        <div className="no-scrollbar flex gap-0.5 overflow-x-auto px-1 py-2">
          {weekDays.map((day) => {
            const isSelected = selectedDayStr === day.dateStr

            return (
              <button
                key={day.dateStr}
                onClick={() => onSelectDay(day.dateStr)}
                className={cn(
                  'flex min-w-[44px] flex-1 cursor-pointer flex-col items-center gap-0.5 rounded-xl py-1.5 transition-colors duration-150',
                  isSelected && !day.isToday && 'bg-blue-50 dark:bg-blue-950/40'
                )}
              >
                <span
                  className={cn(
                    'text-[11px] font-medium',
                    day.isToday ? 'text-blue-500' : isSelected ? 'text-blue-600 dark:text-blue-400' : 'text-slate-400'
                  )}
                >
                  {day.label}
                </span>
                <span
                  className={cn(
                    'flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold transition-all duration-150',
                    day.isToday
                      ? 'bg-blue-500 text-white'
                      : isSelected
                        ? 'text-blue-600 dark:text-blue-400 ring-2 ring-blue-400 dark:ring-blue-600'
                        : 'text-slate-700 dark:text-slate-200'
                  )}
                >
                  {day.dayNum}
                </span>
                <span
                  className={cn(
                    'text-[10px]',
                    day.isToday ? 'text-blue-400' : 'text-slate-400'
                  )}
                >
                  {day.date.toLocaleDateString('he-IL', { month: 'short' })}
                </span>
              </button>
            )
          })}
        </div>
      </div>

      <div ref={mobileScrollRef} className="flex-1 overflow-x-hidden overflow-y-auto">
        <div className="grid" style={{ gridTemplateColumns: '56px 1fr' }}>
          <TimeLabelsColumn
            gridStartHour={gridStartHour}
            gridEndHour={gridEndHour}
          />
          {selectedDay && (
            <DayColumn
              day={selectedDay}
              events={dayEvents}
              completedTaskIds={completedTaskIds}
              gridStartHour={gridStartHour}
              gridEndHour={gridEndHour}
              onEventClick={onEventClick}
              onSlotClick={onSlotClick}
              onEventDrop={onEventDrop}
            />
          )}
        </div>
      </div>
    </div>
  )
}

export function DesktopCalendarLayout({
  weekDays,
  eventsByDay,
  completedTaskIds,
  desktopScrollRef,
  onEventClick,
  onSlotClick,
  onEventDrop,
}: Omit<CalendarGridProps, 'selectedDay' | 'selectedDayStr' | 'mobileScrollRef' | 'onSelectDay'>) {
  const allWeekEvents = weekDays.flatMap((day) => eventsByDay[day.dateStr] ?? [])
  const gridStartHour = hasEarlyEvent(allWeekEvents) ? EARLY_START_HOUR : GRID_START_HOUR
  const gridEndHour = getGridEndHour(gridStartHour)

  return (
    <div className="hidden flex-1 overflow-x-auto overflow-y-hidden sm:flex sm:flex-col">
      <div className="flex h-full flex-col" style={{ minWidth: '480px' }}>
        <div
          className="grid flex-shrink-0 border-b border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900"
          style={{ gridTemplateColumns: '56px repeat(7, 1fr)' }}
        >
          <div className="border-l border-slate-100 dark:border-slate-800" />
          {weekDays.map((day) => (
            <div
              key={day.dateStr}
              className="flex flex-col items-center justify-center gap-0.5 border-l border-slate-100 dark:border-slate-800 py-2"
            >
              <span
                className={cn(
                  'text-xs font-medium',
                  day.isToday ? 'text-blue-400' : 'text-slate-400'
                )}
              >
                {day.label}
              </span>
              <span
                className={cn(
                  'flex h-8 w-8 items-center justify-center rounded-full text-lg font-bold leading-none',
                  day.isToday ? 'bg-blue-500 text-white' : 'text-slate-700 dark:text-slate-200'
                )}
              >
                {day.dayNum}
              </span>
              <span
                className={cn(
                  'text-[10px] font-normal',
                  day.isToday ? 'text-blue-400' : 'text-slate-400'
                )}
              >
                {day.date.toLocaleDateString('he-IL', { month: 'short' })}
              </span>
            </div>
          ))}
        </div>

        <div ref={desktopScrollRef} className="flex-1 overflow-x-hidden overflow-y-auto">
          <div className="grid" style={{ gridTemplateColumns: '56px repeat(7, 1fr)' }}>
            <TimeLabelsColumn
              gridStartHour={gridStartHour}
              gridEndHour={gridEndHour}
            />
            {weekDays.map((day) => (
              <DayColumn
                key={day.dateStr}
                day={day}
                events={eventsByDay[day.dateStr] ?? []}
                completedTaskIds={completedTaskIds}
                gridStartHour={gridStartHour}
                gridEndHour={gridEndHour}
                onEventClick={onEventClick}
                onSlotClick={onSlotClick}
                onEventDrop={onEventDrop}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
