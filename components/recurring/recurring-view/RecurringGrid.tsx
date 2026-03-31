'use client'

import { useState } from 'react'
import type { RefObject } from 'react'
import { Pencil, Trash2 } from 'lucide-react'
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
  selected: string | null
  scrollRef: RefObject<HTMLDivElement | null>
  mobileScrollRef: RefObject<HTMLDivElement | null>
  onSelect: (key: string | null) => void
  onEditTimedItem: (item: GridItem) => void
  onDeleteTimedItem: (item: GridItem) => void
  onEditChip: (task: Task) => void
  onDeleteChip: (taskIds: string[]) => void
}

export default function RecurringGrid({
  byDay,
  chipsByDay,
  selected,
  scrollRef,
  mobileScrollRef,
  onSelect,
  onEditTimedItem,
  onDeleteTimedItem,
  onEditChip,
  onDeleteChip,
}: RecurringGridProps) {
  const [selectedDayIndex, setSelectedDayIndex] = useState(new Date().getDay())

  const renderDayColumn = (dayIndex: number) => (
    <div
      key={dayIndex}
      className="relative border-l border-slate-200"
      style={{ height: RECURRING_HOURS.length * RECURRING_HOUR_HEIGHT }}
    >
      {RECURRING_HOURS.map((hour) => (
        <div
          key={hour}
          className="absolute inset-x-0 border-b border-slate-200"
          style={{
            top: (hour - RECURRING_GRID_START_HOUR) * RECURRING_HOUR_HEIGHT,
            height: RECURRING_HOUR_HEIGHT,
          }}
        />
      ))}

      {chipsByDay[dayIndex].map((pattern) => (
        <div key={pattern.key} className="absolute inset-x-1 top-1 flex flex-col gap-0.5 z-10">
          <div className="flex items-center gap-1 bg-green-50 border border-green-200 rounded px-1.5 py-0.5">
            <span className="text-[10px] text-green-700 font-medium truncate flex-1">
              {pattern.item.title}
            </span>
            <button
              className="text-slate-400 hover:text-blue-500 flex-shrink-0"
              onClick={() => onEditChip(pattern.item)}
            >
              <Pencil className="h-2.5 w-2.5" />
            </button>
            <button
              className="text-slate-400 hover:text-red-500 flex-shrink-0"
              onClick={() => onDeleteChip(pattern.allIds)}
            >
              <Trash2 className="h-2.5 w-2.5" />
            </button>
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
        const isSelected = selected === item.key

        return (
          <div
            key={item.key}
            onClick={(event) => {
              event.stopPropagation()
              onSelect(isSelected ? null : item.key)
            }}
            style={{ top, height, minHeight: 28 }}
            className={cn(
              'absolute inset-x-0.5 border-l-2 rounded-sm cursor-pointer select-none',
              'flex flex-col items-center justify-center text-center px-1 overflow-hidden',
              colors.bg,
              colors.text,
              colors.border,
              isSelected && 'ring-2 ring-offset-0 ring-blue-400',
            )}
          >
            <p className="font-bold text-[10px] sm:text-xs leading-tight text-center break-words whitespace-normal w-full">
              {item.title}
            </p>
            {height >= 36 && (
              <p className="text-[9px] sm:text-[10px] opacity-70 mt-0.5">
                <span dir="ltr">
                  {hhmm(item.startTime)}–{hhmm(item.endTime)}
                </span>
              </p>
            )}

            {isSelected && (
              <div
                className="absolute inset-0 flex items-center justify-center gap-1 bg-white/80 rounded-sm"
                onClick={(event) => event.stopPropagation()}
              >
                <button
                  className="p-1 rounded hover:bg-blue-100 text-blue-600"
                  onClick={() => onEditTimedItem(item)}
                >
                  <Pencil className="h-3.5 w-3.5" />
                </button>
                <button
                  className="p-1 rounded hover:bg-red-100 text-red-500"
                  onClick={() => onDeleteTimedItem(item)}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )

  return (
    <>
      {/* Mobile: day picker strip + single column */}
      <div className="flex sm:hidden flex-col flex-1 overflow-hidden">
        <div className="flex-shrink-0 bg-white border-b border-slate-100">
          <div className="flex py-2 px-1">
            {RECURRING_DAY_LABELS.map((label, index) => (
              <button
                key={index}
                onClick={() => setSelectedDayIndex(index)}
                className={cn(
                  'flex items-center justify-center flex-1 py-1.5 rounded-xl transition-colors duration-150',
                  selectedDayIndex === index && 'bg-blue-50',
                )}
              >
                <span
                  className={cn(
                    'text-sm font-semibold',
                    selectedDayIndex === index ? 'text-blue-600' : 'text-slate-400',
                  )}
                >
                  {label}
                </span>
              </button>
            ))}
          </div>
        </div>

        <div ref={mobileScrollRef} className="flex-1 overflow-y-auto overflow-x-hidden">
          <div className="grid" style={{ gridTemplateColumns: '40px 1fr' }}>
            <TimeLabelsColumn />
            {renderDayColumn(selectedDayIndex)}
          </div>
        </div>
      </div>

      {/* Desktop: full 7-column grid */}
      <div className="hidden sm:flex flex-col flex-1 overflow-y-hidden min-w-0">
        <div className="flex flex-col h-full">
          <div
            className="grid flex-shrink-0 bg-white border-b border-slate-100"
            style={{ gridTemplateColumns: '40px repeat(7, 1fr)' }}
          >
            <div className="border-l border-slate-200" />
            {RECURRING_DAY_LABELS.map((label, index) => (
              <div
                key={index}
                className="flex items-center justify-center py-2 border-l border-slate-200"
              >
                <span className="text-xs font-medium text-slate-500">{label}</span>
              </div>
            ))}
          </div>

          <div ref={scrollRef} className="flex-1 overflow-y-auto overflow-x-hidden">
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
