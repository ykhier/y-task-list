'use client'

import { useState } from 'react'
import type { RefObject } from 'react'
import { timeRangeToHeight, timeToOffset } from '@/lib/date'
import { cn } from '@/lib/utils'
import TimeLabelsColumn from '@/components/calendar/TimeLabelsColumn'
import {
  RECURRING_DAY_LABELS,
  RECURRING_EVENT_COLORS,
  RECURRING_GRID_START_HOUR,
  RECURRING_HOUR_HEIGHT,
  RECURRING_HOURS,
} from './recurring-view-constants'
import { hhmm, type GridItem, type Pattern } from './recurring-view-utils'
import type { Task } from '@/types'

interface RecurringGridProps {
  byDay: Record<number, GridItem[]>
  chipsByDay: Record<number, Pattern<Task>[]>
  scrollRef: RefObject<HTMLDivElement | null>
  mobileScrollRef: RefObject<HTMLDivElement | null>
}

export default function RecurringGrid({
  byDay,
  chipsByDay,
  scrollRef,
  mobileScrollRef,
}: RecurringGridProps) {
  const [selectedDayIndex, setSelectedDayIndex] = useState(new Date().getDay())

  const renderDayColumn = (dayIndex: number) => (
    <div
      key={dayIndex}
      className="relative border-l border-slate-200 dark:border-slate-700"
      style={{ height: RECURRING_HOURS.length * RECURRING_HOUR_HEIGHT }}
    >
      {RECURRING_HOURS.map((hour) => (
        <div
          key={hour}
          className="absolute inset-x-0 border-b border-slate-200 dark:border-slate-700"
          style={{
            top: (hour - RECURRING_GRID_START_HOUR) * RECURRING_HOUR_HEIGHT,
            height: RECURRING_HOUR_HEIGHT,
          }}
        />
      ))}

      {chipsByDay[dayIndex].map((pattern) => (
        <div key={pattern.key} className="absolute inset-x-1 top-1 z-10 flex flex-col gap-0.5">
          <div className="flex items-center gap-2 rounded border border-green-200 dark:border-green-700/50 bg-green-50 dark:bg-green-900/30 px-2 py-1.5 text-right">
            <span className="flex-1 truncate text-[10px] font-medium text-green-700 dark:text-green-300">
              {pattern.item.title}
            </span>
          </div>
        </div>
      ))}

      {byDay[dayIndex].map((item) => {
        const top =
          timeToOffset(hhmm(item.startTime), RECURRING_HOUR_HEIGHT) -
          RECURRING_GRID_START_HOUR * RECURRING_HOUR_HEIGHT
        const height = Math.max(
          timeRangeToHeight(hhmm(item.startTime), hhmm(item.endTime), RECURRING_HOUR_HEIGHT),
          28,
        )
        const colors = RECURRING_EVENT_COLORS[item.color] ?? RECURRING_EVENT_COLORS.blue

        return (
          <div
            key={item.key}
            style={{ top, height, minHeight: 28 }}
            className={cn(
              'absolute inset-x-0.5 overflow-hidden rounded-sm border-l-2 px-1 text-center select-none',
              'flex flex-col items-center justify-center',
              colors.bg,
              colors.text,
              colors.border,
            )}
          >
            <p className="w-full break-words whitespace-normal text-center text-[10px] font-bold leading-tight sm:text-xs">
              {item.title}
            </p>
            {height >= 36 && (
              <p className="mt-0.5 text-[9px] opacity-70 sm:text-[10px]">
                <span dir="ltr">
                  {hhmm(item.startTime)}-{hhmm(item.endTime)}
                </span>
              </p>
            )}
          </div>
        )
      })}
    </div>
  )

  return (
    <>
      <div className="flex flex-1 flex-col overflow-hidden sm:hidden">
        <div className="flex-shrink-0 border-b border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900">
          <div className="flex px-1 py-2">
            {RECURRING_DAY_LABELS.map((label, index) => (
              <button
                key={index}
                onClick={() => setSelectedDayIndex(index)}
                className={cn(
                  'flex flex-1 items-center justify-center rounded-xl py-1.5 transition-colors duration-150',
                  selectedDayIndex === index && 'bg-blue-50 dark:bg-blue-950/40',
                )}
              >
                <span
                  className={cn(
                    'text-sm font-semibold',
                    selectedDayIndex === index ? 'text-blue-600 dark:text-blue-400' : 'text-slate-400',
                  )}
                >
                  {label}
                </span>
              </button>
            ))}
          </div>
        </div>

        <div ref={mobileScrollRef} className="flex-1 overflow-x-hidden overflow-y-auto">
          <div className="grid" style={{ gridTemplateColumns: '40px 1fr' }}>
            <TimeLabelsColumn />
            {renderDayColumn(selectedDayIndex)}
          </div>
        </div>
      </div>

      <div className="hidden min-w-0 flex-1 flex-col overflow-y-hidden sm:flex">
        <div className="flex h-full flex-col">
          <div
            className="grid flex-shrink-0 border-b border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900"
            style={{ gridTemplateColumns: '40px repeat(7, 1fr)' }}
          >
            <div className="border-l border-slate-200 dark:border-slate-700" />
            {RECURRING_DAY_LABELS.map((label, index) => (
              <div
                key={index}
                className="flex items-center justify-center border-l border-slate-200 dark:border-slate-700 py-2"
              >
                <span className="text-xs font-medium text-slate-500 dark:text-slate-400">{label}</span>
              </div>
            ))}
          </div>

          <div ref={scrollRef} className="flex-1 overflow-x-hidden overflow-y-auto">
            <div className="grid" style={{ gridTemplateColumns: '40px repeat(7, 1fr)' }}>
              <TimeLabelsColumn />
              {RECURRING_DAY_LABELS.map((_, dayIndex) => renderDayColumn(dayIndex))}
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
