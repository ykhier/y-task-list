'use client'

import { useState } from 'react'
import { Repeat2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { formatTime12, timeToMinutes } from '@/lib/date'
import { HOUR_HEIGHT, GRID_START_HOUR } from './calendar-constants'
import type { CalendarEvent } from '@/types'

const EVENT_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  blue:   { bg: 'bg-blue-100 dark:bg-blue-900/50',   text: 'text-blue-800 dark:text-blue-200',   border: 'border-l-blue-500' },
  green:  { bg: 'bg-green-100 dark:bg-green-900/50',  text: 'text-green-800 dark:text-green-200',  border: 'border-l-green-500' },
  orange: { bg: 'bg-orange-100 dark:bg-orange-900/50', text: 'text-orange-800 dark:text-orange-200', border: 'border-l-orange-500' },
  purple: { bg: 'bg-purple-100 dark:bg-purple-900/50', text: 'text-purple-800 dark:text-purple-200', border: 'border-l-purple-500' },
  red:    { bg: 'bg-red-100 dark:bg-red-900/50',    text: 'text-red-800 dark:text-red-200',    border: 'border-l-red-500' },
}

interface EventBlockProps {
  event: CalendarEvent
  isCompleted?: boolean
  hourHeight?: number
  gridStartHour?: number
  onClick?: (event: CalendarEvent) => void
}

export default function EventBlock({
  event,
  isCompleted = false,
  hourHeight = HOUR_HEIGHT,
  gridStartHour = GRID_START_HOUR,
  onClick,
}: EventBlockProps) {
  const [isDragging, setIsDragging] = useState(false)

  const isSplitStart = event.splitContinuation === 'start'
  const isSplitEnd   = event.splitContinuation === 'end'

  // Post-midnight times (e.g. 01:00) are treated as 25:00 so they position
  // correctly below midnight in the extended grid.
  const [evH, evM] = event.start_time.split(':').map(Number)
  const absH = evH < gridStartHour ? evH + 24 : evH

  let top: number
  let height: number

  if (isSplitEnd) {
    // Continuation segment: anchored at midnight (absolute hour 24), runs to end_time
    top    = (24 - gridStartHour) * hourHeight
    height = (timeToMinutes(event.end_time.slice(0, 5)) / 60) * hourHeight
  } else if (isSplitStart) {
    // First segment: from start_time to midnight (24:00 absolute)
    top    = (absH + evM / 60) * hourHeight - gridStartHour * hourHeight
    height = ((24 * 60 - timeToMinutes(event.start_time.slice(0, 5))) / 60) * hourHeight
  } else {
    top = (absH + evM / 60) * hourHeight - gridStartHour * hourHeight
    const startMinsNorm = timeToMinutes(event.start_time.slice(0, 5))
    const endMinsNorm   = timeToMinutes(event.end_time.slice(0, 5))
    // Correctly handle events ending exactly at midnight (00:00) or crossing midnight
    const durationMins =
      endMinsNorm > startMinsNorm
        ? endMinsNorm - startMinsNorm           // normal: e.g. 09:00–10:30
        : endMinsNorm === 0
        ? 24 * 60 - startMinsNorm               // ends at midnight: e.g. 23:00–00:00 → 60 min
        : (24 * 60 - startMinsNorm) + endMinsNorm // crosses midnight: e.g. 23:00–01:00 → 120 min
    height = (durationMins / 60) * hourHeight
  }

  const colorKey = event.color ?? (event.source === 'task' ? 'green' : 'blue')
  const colors = EVENT_COLORS[colorKey] ?? EVENT_COLORS.blue

  return (
    <div
      role="button"
      tabIndex={0}
      aria-label={`${event.title} at ${formatTime12(event.start_time)}`}
      draggable={!isCompleted && !isSplitEnd}
      onClick={() => onClick?.(event)}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') onClick?.(event) }}
      onDragStart={(e) => {
        if (isCompleted || isSplitEnd) { e.preventDefault(); return }
        setIsDragging(true)
        const rect = e.currentTarget.getBoundingClientRect()
        const offsetY = e.clientY - rect.top
        const startMins = timeToMinutes(event.start_time.slice(0, 5))
        const endMins   = timeToMinutes(event.end_time.slice(0, 5))
        // Handle midnight-crossing duration correctly
        const durationMins = endMins >= startMins ? endMins - startMins : (24 * 60 - startMins) + endMins
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
        'event-block relative border-l-2 select-none flex flex-col items-center justify-center text-center px-1',
        colors.bg,
        colors.text,
        colors.border,
        isCompleted && 'opacity-40 line-through',
        isSplitEnd ? 'cursor-pointer' : isDragging ? 'opacity-40 cursor-grabbing' : 'cursor-grab',
        // Dashed edge where the event is cut: bottom for 'start', top for 'end'
        isSplitStart && 'border-b-2 border-b-dashed border-b-current',
        isSplitEnd   && 'border-t-2 border-t-dashed border-t-current',
      )}
    >
      {event.is_recurring && (
        <Repeat2 className="absolute top-1 left-1 h-3 w-3 opacity-60" />
      )}
      <p className="font-bold text-xs sm:text-sm leading-tight text-center break-words whitespace-normal w-full">{event.title}</p>
      {height >= 36 && (
        <p className="text-[10px] sm:text-xs opacity-70 mt-0.5 font-medium">
          {isSplitStart
            ? `${formatTime12(event.start_time)} – 00:00`
            : isSplitEnd
            ? `00:00 – ${formatTime12(event.end_time)}`
            : `${formatTime12(event.start_time)} – ${formatTime12(event.end_time)}`}
        </p>
      )}
    </div>
  )
}
