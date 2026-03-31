'use client'

import { HOUR_HEIGHT, HOURS, GRID_START_HOUR } from './calendar-constants'

const TIME_LABELS = HOURS.map((h) => `${String(h).padStart(2, '0')}:00`)

export default function TimeLabelsColumn() {
  return (
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
  )
}

