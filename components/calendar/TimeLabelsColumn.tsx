'use client'

import { HOUR_HEIGHT, GRID_START_HOUR, buildHours, getGridEndHour } from './calendar-constants'

interface TimeLabelsColumnProps {
  gridStartHour?: number
  gridEndHour?: number
}

export default function TimeLabelsColumn({
  gridStartHour = GRID_START_HOUR,
  gridEndHour = getGridEndHour(gridStartHour),
}: TimeLabelsColumnProps) {
  const hours = buildHours(gridStartHour, gridEndHour)

  return (
    <div className="relative border-l border-slate-200 dark:border-slate-800">
      {hours.map((hour) => (
        <div
          key={hour}
          style={{ top: (hour - gridStartHour) * HOUR_HEIGHT, height: HOUR_HEIGHT }}
          className="absolute inset-x-0 flex items-center justify-end border-b border-slate-200 dark:border-slate-800 pr-2"
        >
          <span className="text-[10px] font-medium text-slate-500 dark:text-slate-500">
            {String(hour % 24).padStart(2, '0')}:00
          </span>
        </div>
      ))}
      <div style={{ height: hours.length * HOUR_HEIGHT }} />
    </div>
  )
}
