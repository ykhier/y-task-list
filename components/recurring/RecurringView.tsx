'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import RecurringEmptyState from './recurring-view/RecurringEmptyState'
import RecurringGrid from './recurring-view/RecurringGrid'
import RecurringTaskDialog from './recurring-view/RecurringTaskDialog'
import {
  buildRecurringGridItems,
  buildRecurringTaskChips,
  groupGridItemsByDay,
  groupPatternsByDay,
  type GridItem,
} from './recurring-view/recurring-view-utils'
import type { CalendarEvent, Task } from '@/types'

interface RecurringViewProps {
  tasks: Task[]
  events: CalendarEvent[]
  tutorials: CalendarEvent[]
  onEditTask: (id: string, data: Partial<Task>) => Promise<void>
  onEditEvent: (event: CalendarEvent) => void
}

export default function RecurringView({
  tasks,
  events,
  tutorials,
  onEditTask,
  onEditEvent,
}: RecurringViewProps) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const mobileScrollRef = useRef<HTMLDivElement>(null)
  const [editingTask, setEditingTask] = useState<Task | null>(null)
  const [saving, setSaving] = useState(false)
  const [selected, setSelected] = useState<string | null>(null)

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

  const handleEditTimedItem = (item: GridItem) => {
    setSelected(null)
    if (item.type === 'task' && item.rawTask) {
      setEditingTask(item.rawTask)
      return
    }
    if (item.rawEvent) onEditEvent(item.rawEvent)
  }

  const handleEditTask = async (data: Omit<Task, 'id' | 'user_id' | 'created_at' | 'is_completed'>) => {
    if (!editingTask) return
    setSaving(true)
    await onEditTask(editingTask.id, data)
    setSaving(false)
    setEditingTask(null)
  }

  return (
    <div className="flex flex-col h-full overflow-hidden" onClick={() => setSelected(null)}>
      {!hasAnything ? (
        <RecurringEmptyState />
      ) : (
        <RecurringGrid
          byDay={byDay}
          chipsByDay={chipsByDay}
          selected={selected}
          scrollRef={scrollRef}
          mobileScrollRef={mobileScrollRef}
          onSelect={setSelected}
          onEditTimedItem={handleEditTimedItem}
          onEditChip={setEditingTask}
        />
      )}

      <RecurringTaskDialog
        open={!!editingTask}
        task={editingTask}
        tasks={tasks}
        isLoading={saving}
        onOpenChange={(open) => {
          if (!open) setEditingTask(null)
        }}
        onSubmit={handleEditTask}
        onCancel={() => setEditingTask(null)}
      />
    </div>
  )
}
