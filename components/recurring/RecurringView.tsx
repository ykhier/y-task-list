'use client'

import { useMemo, useRef, useEffect, useState } from 'react'
import { Pencil, Trash2, Repeat2 } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import TaskForm from '@/components/tasks/TaskForm'
import { timeToOffset, timeRangeToHeight } from '@/lib/date'
import { cn } from '@/lib/utils'
import type { Task, CalendarEvent } from '@/types'

const HOUR_HEIGHT = 60
const GRID_START_HOUR = 8
const HOURS = Array.from({ length: 16 }, (_, i) => i + GRID_START_HOUR) // 08–23
const TIME_LABELS = HOURS.map((h) => `${String(h).padStart(2, '0')}:00`)
const DAY_LABELS = ['א׳', 'ב׳', 'ג׳', 'ד׳', 'ה׳', 'ו׳', 'ש׳']

const hhmm = (t: string) => t.slice(0, 5)

const EVENT_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  blue:   { bg: 'bg-blue-100',   text: 'text-blue-800',   border: 'border-l-blue-500' },
  green:  { bg: 'bg-green-100',  text: 'text-green-800',  border: 'border-l-green-500' },
  orange: { bg: 'bg-orange-100', text: 'text-orange-800', border: 'border-l-orange-500' },
  purple: { bg: 'bg-purple-100', text: 'text-purple-800', border: 'border-l-purple-500' },
  red:    { bg: 'bg-red-100',    text: 'text-red-800',    border: 'border-l-red-500' },
}

function getDayOfWeek(dateStr: string) {
  return new Date(dateStr + 'T00:00:00').getDay()
}

interface Pattern<T> {
  key: string
  item: T
  dayOfWeek: number
  allIds: string[]
}

function buildPatterns<T extends { id: string; title: string; date: string }>(
  items: T[],
  getTime: (item: T) => string,
): Pattern<T>[] {
  const map = new Map<string, Pattern<T>>()
  for (const item of items) {
    const day = getDayOfWeek(item.date)
    const time = getTime(item)
    const key = `${item.title}|${day}|${time}`
    if (!map.has(key)) {
      map.set(key, { key, item, dayOfWeek: day, allIds: [item.id] })
    } else {
      map.get(key)!.allIds.push(item.id)
    }
  }
  return Array.from(map.values())
}

// Unified item for grid rendering
interface GridItem {
  key: string
  allIds: string[]
  title: string
  startTime: string
  endTime: string
  color: string
  type: 'task' | 'event' | 'tutorial'
  dayOfWeek: number
  rawTask?: Task
  rawEvent?: CalendarEvent
}

interface RecurringViewProps {
  tasks: Task[]
  events: CalendarEvent[]
  tutorials: CalendarEvent[]
  onDeleteTask: (id: string) => Promise<void>
  onDeleteEvent: (id: string) => Promise<void>
  onDeleteTutorial: (id: string) => Promise<void>
  onEditTask: (id: string, data: Partial<Task>) => Promise<void>
  onEditEvent: (event: CalendarEvent) => void
}

export default function RecurringView({
  tasks,
  events,
  tutorials,
  onDeleteTask,
  onDeleteEvent,
  onDeleteTutorial,
  onEditTask,
  onEditEvent,
}: RecurringViewProps) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const [editingTask, setEditingTask] = useState<Task | null>(null)
  const [saving, setSaving] = useState(false)
  const [selected, setSelected] = useState<string | null>(null) // key of selected block

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = 0
  }, [])

  // Build deduplicated grid items
  const gridItems = useMemo<GridItem[]>(() => {
    const items: GridItem[] = []

    // Recurring tasks with time
    for (const p of buildPatterns(
      tasks.filter(t => t.is_recurring && !t.is_completed && !!t.time && !!t.end_time),
      t => t.time ?? '',
    )) {
      items.push({
        key: `task|${p.key}`,
        allIds: p.allIds,
        title: p.item.title,
        startTime: p.item.time!,
        endTime: p.item.end_time!,
        color: 'green',
        type: 'task',
        dayOfWeek: p.dayOfWeek,
        rawTask: p.item,
      })
    }

    // Recurring manual events
    for (const p of buildPatterns(
      events.filter(e => e.is_recurring && e.source === 'manual'),
      e => e.start_time,
    )) {
      items.push({
        key: `event|${p.key}`,
        allIds: p.allIds,
        title: p.item.title,
        startTime: p.item.start_time,
        endTime: p.item.end_time,
        color: p.item.color ?? 'blue',
        type: 'event',
        dayOfWeek: p.dayOfWeek,
        rawEvent: p.item,
      })
    }

    // Recurring tutorials
    for (const p of buildPatterns(
      tutorials.filter(t => t.is_recurring),
      t => t.start_time,
    )) {
      items.push({
        key: `tutorial|${p.key}`,
        allIds: p.allIds,
        title: p.item.title,
        startTime: p.item.start_time,
        endTime: p.item.end_time,
        color: p.item.color ?? 'orange',
        type: 'tutorial',
        dayOfWeek: p.dayOfWeek,
        rawEvent: p.item,
      })
    }

    return items
  }, [tasks, events, tutorials])

  // Recurring tasks WITHOUT time — shown as chips above the grid
  const taskChips = useMemo(() =>
    buildPatterns(
      tasks.filter(t => t.is_recurring && !t.is_completed && !t.time),
      () => '',
    ),
    [tasks],
  )

  const byDay = useMemo(() => {
    const map: Record<number, GridItem[]> = {}
    for (let i = 0; i < 7; i++) map[i] = []
    for (const item of gridItems) map[item.dayOfWeek].push(item)
    return map
  }, [gridItems])

  const chipsByDay = useMemo(() => {
    const map: Record<number, typeof taskChips> = {}
    for (let i = 0; i < 7; i++) map[i] = []
    for (const p of taskChips) map[p.dayOfWeek].push(p)
    return map
  }, [taskChips])

  const hasAnything = gridItems.length > 0 || taskChips.length > 0

  const handleDelete = async (item: GridItem) => {
    setSelected(null)
    const deleteFn = item.type === 'task'
      ? onDeleteTask
      : item.type === 'tutorial'
        ? onDeleteTutorial
        : onDeleteEvent
    await Promise.all(item.allIds.map(id => deleteFn(id)))
  }

  const handleEdit = (item: GridItem) => {
    setSelected(null)
    if (item.type === 'task' && item.rawTask) {
      setEditingTask(item.rawTask)
    } else if (item.rawEvent) {
      onEditEvent(item.rawEvent)
    }
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
        <div className="flex flex-col items-center justify-center h-full text-center px-4">
          <Repeat2 className="h-10 w-10 text-slate-200 mb-3" />
          <p className="text-sm text-slate-400 font-medium">אין פריטים קבועים</p>
          <p className="text-xs text-slate-400 mt-1">{'סמן משימה, הרצאה או תרגול כ"קבוע" כדי שיופיע כאן'}</p>
        </div>
      ) : (
        <>
          {/* Day header */}
          <div
            className="grid flex-shrink-0 bg-white border-b border-slate-100"
            style={{ gridTemplateColumns: '56px repeat(7, 1fr)' }}
          >
            <div className="border-l border-slate-200" />
            {DAY_LABELS.map((label, i) => (
              <div
                key={i}
                className="flex items-center justify-center py-2 border-l border-slate-200"
              >
                <span className="text-xs font-medium text-slate-500">{label}</span>
              </div>
            ))}
          </div>

          {/* Scrollable grid */}
          <div ref={scrollRef} className="flex-1 overflow-y-auto overflow-x-hidden">
            <div
              className="grid"
              style={{ gridTemplateColumns: '56px repeat(7, 1fr)' }}
            >
              {/* Time labels column — identical to CalendarView */}
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

              {/* Day columns */}
              {DAY_LABELS.map((_, dayIndex) => (
                <div
                  key={dayIndex}
                  className="relative border-l border-slate-200"
                  style={{ height: HOURS.length * HOUR_HEIGHT }}
                  onClick={(e) => e.stopPropagation()}
                >
                  {/* Hour grid lines — identical to DayColumn */}
                  {HOURS.map((h) => (
                    <div
                      key={h}
                      className="absolute inset-x-0 border-b border-slate-200"
                      style={{ top: (h - GRID_START_HOUR) * HOUR_HEIGHT, height: HOUR_HEIGHT }}
                    />
                  ))}

                  {/* Chips (tasks without time) */}
                  {chipsByDay[dayIndex].map((p) => (
                    <div
                      key={p.key}
                      className="absolute inset-x-1 top-1 flex flex-col gap-0.5 z-10"
                    >
                      <div className="flex items-center gap-1 bg-green-50 border border-green-200 rounded px-1.5 py-0.5">
                        <span className="text-[10px] text-green-700 font-medium truncate flex-1">{p.item.title}</span>
                        <button
                          className="text-slate-400 hover:text-blue-500 flex-shrink-0"
                          onClick={() => setEditingTask(p.item)}
                        >
                          <Pencil className="h-2.5 w-2.5" />
                        </button>
                        <button
                          className="text-slate-400 hover:text-red-500 flex-shrink-0"
                          onClick={() => Promise.all(p.allIds.map(id => onDeleteTask(id)))}
                        >
                          <Trash2 className="h-2.5 w-2.5" />
                        </button>
                      </div>
                    </div>
                  ))}

                  {/* Timed items */}
                  {byDay[dayIndex].map((item) => {
                    const top = timeToOffset(hhmm(item.startTime), HOUR_HEIGHT) - GRID_START_HOUR * HOUR_HEIGHT
                    const height = Math.max(timeRangeToHeight(hhmm(item.startTime), hhmm(item.endTime), HOUR_HEIGHT), 28)
                    const colors = EVENT_COLORS[item.color] ?? EVENT_COLORS.blue
                    const isSelected = selected === item.key

                    return (
                      <div
                        key={item.key}
                        onClick={(e) => { e.stopPropagation(); setSelected(isSelected ? null : item.key) }}
                        style={{ top, height, minHeight: 28 }}
                        className={cn(
                          'absolute inset-x-0.5 border-l-2 rounded-sm cursor-pointer select-none',
                          'flex flex-col items-center justify-center text-center px-1 overflow-hidden',
                          colors.bg, colors.text, colors.border,
                          isSelected && 'ring-2 ring-offset-0 ring-blue-400',
                        )}
                      >
                        <p className="font-bold text-[10px] sm:text-xs leading-tight text-center break-words whitespace-normal w-full">
                          {item.title}
                        </p>
                        {height >= 36 && (
                          <p className="text-[9px] sm:text-[10px] opacity-70 mt-0.5">
                            <span dir="ltr">{hhmm(item.startTime)}–{hhmm(item.endTime)}</span>
                          </p>
                        )}

                        {/* Actions overlay on select */}
                        {isSelected && (
                          <div
                            className="absolute inset-0 flex items-center justify-center gap-1 bg-white/80 rounded-sm"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <button
                              className="p-1 rounded hover:bg-blue-100 text-blue-600"
                              onClick={() => handleEdit(item)}
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </button>
                            <button
                              className="p-1 rounded hover:bg-red-100 text-red-500"
                              onClick={() => handleDelete(item)}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {/* Edit task dialog */}
      <Dialog open={!!editingTask} onOpenChange={o => !o && setEditingTask(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>ערוך משימה קבועה</DialogTitle>
          </DialogHeader>
          <TaskForm
            editTask={editingTask}
            tasks={tasks}
            onSubmit={handleEditTask}
            onCancel={() => setEditingTask(null)}
            isLoading={saving}
          />
        </DialogContent>
      </Dialog>
    </div>
  )
}
