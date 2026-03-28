'use client'

import { useState } from 'react'
import { cn } from '@/lib/utils'
import { formatTime12, timeToOffset, timeRangeToHeight, timeToMinutes } from '@/lib/date'
import { GRID_START_HOUR } from './DayColumn'
import type { CalendarEvent } from '@/types'

const EVENT_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  blue:   { bg: 'bg-blue-100',   text: 'text-blue-800',   border: 'border-l-blue-500' },
  green:  { bg: 'bg-green-100',  text: 'text-green-800',  border: 'border-l-green-500' },
  orange: { bg: 'bg-orange-100', text: 'text-orange-800', border: 'border-l-orange-500' },
  purple: { bg: 'bg-purple-100', text: 'text-purple-800', border: 'border-l-purple-500' },
  red:    { bg: 'bg-red-100',    text: 'text-red-800',    border: 'border-l-red-500' },
}

interface EventBlockProps {
  event: CalendarEvent
  isCompleted?: boolean
  hourHeight?: number
  onClick?: (event: CalendarEvent) => void
}

export default function EventBlock({
  event,
  isCompleted = false,
  hourHeight = 60,
  onClick,
}: EventBlockProps) {
  const [isDragging, setIsDragging] = useState(false)

  const top    = timeToOffset(event.start_time, hourHeight) - GRID_START_HOUR * hourHeight
  const height = timeRangeToHeight(event.start_time, event.end_time, hourHeight)
  const colorKey = event.color ?? (event.source === 'task' ? 'green' : 'blue')
  const colors = EVENT_COLORS[colorKey] ?? EVENT_COLORS.blue

  return (
    <div
      role="button"
      tabIndex={0}
      aria-label={`${event.title} at ${formatTime12(event.start_time)}`}
      draggable={!isCompleted}
      onClick={() => onClick?.(event)}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') onClick?.(event) }}
      onDragStart={(e) => {
        if (isCompleted) { e.preventDefault(); return }
        setIsDragging(true)
        const rect = e.currentTarget.getBoundingClientRect()
        const offsetY = e.clientY - rect.top
        const durationMins = timeToMinutes(event.end_time) - timeToMinutes(event.start_time)
        const offsetMins = Math.round((offsetY / hourHeight) * 60)
        e.dataTransfer.effectAllowed = 'move'
        e.dataTransfer.setData('application/json', JSON.stringify({
          eventId: event.id,
          isTutorial: event.source === 'tutorial',
          isTaskEvent: event.source === 'task',
          taskId: event.task_id ?? null,
          durationMins,
          offsetMins,
        }))
      }}
      onDragEnd={() => setIsDragging(false)}
      style={{ top, height: Math.max(height, 24), minHeight: 24 }}
      className={cn(
        'event-block border-l-2 select-none flex flex-col items-center justify-center text-center px-1',
        colors.bg,
        colors.text,
        colors.border,
        isCompleted && 'opacity-40 line-through',
        isDragging ? 'opacity-40 cursor-grabbing' : 'cursor-grab'
      )}
    >
      <p className="font-bold text-xs sm:text-sm leading-tight w-full text-center break-words whitespace-normal">{event.title}</p>
      {height >= 36 && (
        <p className="text-[10px] sm:text-xs opacity-70 mt-0.5 font-medium">
          {formatTime12(event.start_time)} – {formatTime12(event.end_time)}
        </p>
      )}
    </div>
  )
}
