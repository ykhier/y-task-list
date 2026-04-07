'use client'

import { HOUR_HEIGHT, GRID_START_HOUR, buildHours } from './calendar-constants'

interface TimeLabelsColumnProps {
  gridStartHour?: number
}

export default function TimeLabelsColumn({ gridStartHour = GRID_START_HOUR }: TimeLabelsColumnProps) {
  const hours = buildHours(gridStartHour)

  return (
    <div className="relative border-l border-slate-200">
      {hours.map((h) => (
        <div
          key={h}
          style={{ top: (h - gridStartHour) * HOUR_HEIGHT, height: HOUR_HEIGHT }}
          className="absolute inset-x-0 flex items-center justify-end pr-2 border-b border-slate-200"
        >
          <span className="text-[10px] text-slate-500 font-medium">
            {String(h % 24).padStart(2, '0')}:00
          </span>
        </div>
      ))}
      <div style={{ height: hours.length * HOUR_HEIGHT }} />
    </div>
  )
}
