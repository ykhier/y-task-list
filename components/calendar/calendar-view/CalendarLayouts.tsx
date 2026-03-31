import type { RefObject } from 'react'
import DayColumn from '../DayColumn'
import TimeLabelsColumn from '../TimeLabelsColumn'
import { cn } from '@/lib/utils'
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
  return (
    <div className="flex sm:hidden flex-col flex-1 overflow-hidden">
      <div className="flex-shrink-0 bg-white border-b border-slate-100">
        <div className="flex overflow-x-auto py-2 px-1 gap-0.5 no-scrollbar">
          {weekDays.map((day) => {
            const isSelected = selectedDayStr === day.dateStr
            return (
              <button
                key={day.dateStr}
                onClick={() => onSelectDay(day.dateStr)}
                className={cn(
                  'flex flex-col items-center gap-0.5 flex-1 min-w-[44px] py-1.5 rounded-xl cursor-pointer transition-colors duration-150',
                  isSelected && !day.isToday && 'bg-blue-50',
                )}
              >
                <span
                  className={cn(
                    'text-[11px] font-medium',
                    day.isToday ? 'text-blue-500' : isSelected ? 'text-blue-600' : 'text-slate-400',
                  )}
                >
                  {day.label}
                </span>
                <span
                  className={cn(
                    'w-8 h-8 flex items-center justify-center rounded-full text-sm font-bold transition-all duration-150',
                    day.isToday
                      ? 'bg-blue-500 text-white'
                      : isSelected
                        ? 'text-blue-600 ring-2 ring-blue-400'
                        : 'text-slate-700',
                  )}
                >
                  {day.dayNum}
                </span>
                <span className={cn('text-[10px]', day.isToday ? 'text-blue-400' : 'text-slate-400')}>
                  {day.date.toLocaleDateString('he-IL', { month: 'short' })}
                </span>
              </button>
            )
          })}
        </div>
      </div>

      <div ref={mobileScrollRef} className="flex-1 overflow-y-auto overflow-x-hidden">
        <div className="grid" style={{ gridTemplateColumns: '56px 1fr' }}>
          <TimeLabelsColumn />
          {selectedDay && (
            <DayColumn
              day={selectedDay}
              events={eventsByDay[selectedDay.dateStr] ?? []}
              completedTaskIds={completedTaskIds}
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
  return (
    <div className="hidden sm:flex sm:flex-col flex-1 overflow-x-auto overflow-y-hidden">
      <div className="flex flex-col h-full" style={{ minWidth: '480px' }}>
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

        <div ref={desktopScrollRef} className="flex-1 overflow-y-auto overflow-x-hidden">
          <div className="grid" style={{ gridTemplateColumns: '56px repeat(7, 1fr)' }}>
            <TimeLabelsColumn />
            {weekDays.map((day) => (
              <DayColumn
                key={day.dateStr}
                day={day}
                events={eventsByDay[day.dateStr] ?? []}
                completedTaskIds={completedTaskIds}
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
