'use client'

import { useEffect, useMemo, useRef } from 'react'
import RecurringEmptyState from './recurring-view/RecurringEmptyState'
import RecurringGrid from './recurring-view/RecurringGrid'
import {
  buildRecurringGridItems,
  buildRecurringTaskChips,
  groupGridItemsByDay,
  groupPatternsByDay,
} from './recurring-view/recurring-view-utils'
import type { CalendarEvent, Task } from '@/types'

interface RecurringViewProps {
  tasks: Task[]
  events: CalendarEvent[]
  tutorials: CalendarEvent[]
}

export default function RecurringView({ tasks, events, tutorials }: RecurringViewProps) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const mobileScrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = 0
    if (mobileScrollRef.current) mobileScrollRef.current.scrollTop = 0
  }, [])

  const gridItems = useMemo(
    () => buildRecurringGridItems(tasks, events, tutorials),
    [tasks, events, tutorials],
  )
  const taskChips = useMemo(() => buildRecurringTaskChips(tasks), [tasks])
  const byDay = useMemo(() => groupGridItemsByDay(gridItems), [gridItems])
  const chipsByDay = useMemo(() => groupPatternsByDay(taskChips), [taskChips])
  const hasAnything = gridItems.length > 0 || taskChips.length > 0

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {!hasAnything ? (
        <RecurringEmptyState />
      ) : (
        <RecurringGrid
          byDay={byDay}
          chipsByDay={chipsByDay}
          scrollRef={scrollRef}
          mobileScrollRef={mobileScrollRef}
        />
      )}
    </div>
  )
}
