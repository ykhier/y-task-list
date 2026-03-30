'use client'

export const dynamic = 'force-dynamic'

import { useState, useCallback, useRef } from 'react'
import { toDateStr } from '@/lib/date'
import Navbar from '@/components/layout/Navbar'
import EventModal from '@/components/layout/EventModal'
import TutorialModal from '@/components/layout/TutorialModal'
import CalendarView from '@/components/calendar/CalendarView'
import TaskList from '@/components/tasks/TaskList'
import RecurringView from '@/components/recurring/RecurringView'
import { useWeekSync } from '@/hooks/useWeekSync'
import type { Task, CalendarEvent, TabView, WeekDay } from '@/types'

export default function AppPage() {
  const {
    tasks, events, tutorials, loading,
    addTask, addTasksBatch, toggleTask, deleteTask, updateTask,
    addEvent, addEventsBatch, updateEvent, deleteEvent,
    addTutorial, addTutorialsBatch, updateTutorial, deleteTutorial,
  } = useWeekSync()

  const [activeTab, setActiveTab] = useState<TabView>('calendar')

  // Event modal state
  const [eventModalOpen, setEventModalOpen] = useState(false)
  const [eventModalDate, setEventModalDate] = useState<string | undefined>()
  const [eventModalHour, setEventModalHour] = useState<number | undefined>()
  const [editingEvent, setEditingEvent]     = useState<CalendarEvent | null>(null)
  const [savingEvent, setSavingEvent]             = useState(false)
  const [eventError, setEventError]               = useState<string | null>(null)
  const [eventSuggestion, setEventSuggestion]     = useState<string | null>(null)
  const eventSuggestionShown                      = useRef(false)

  // Tutorial modal state
  const [tutorialModalOpen, setTutorialModalOpen] = useState(false)
  const [editingTutorial, setEditingTutorial]     = useState<CalendarEvent | null>(null)

  const handleAddRecurringToWeek = useCallback(async (weekDays: WeekDay[]): Promise<string[]> => {
    const conflicts: string[] = []
    const overlaps = (s1: string, e1: string, s2: string, e2: string) => s1 < e2 && e1 > s2
    const targetDate = (dateStr: string) =>
      weekDays.find((d) => d.date.getDay() === new Date(dateStr + 'T00:00:00').getDay())?.dateStr

    const allEventsInWeek = [
      ...events.filter((e) => weekDays.some((d) => d.dateStr === e.date)),
      ...tutorials.filter((t) => weekDays.some((d) => d.dateStr === t.date)),
    ]
    const tasksWithTimeInWeek = tasks.filter(
      (t) => t.time && t.end_time && weekDays.some((d) => d.dateStr === t.date)
    )

    // ── Phase 1: collect items to insert (with conflict checks) ──

    type NewTaskData = Parameters<typeof addTasksBatch>[0][number]
    type NewEventData = Parameters<typeof addEventsBatch>[0][number]
    type NewTutorialData = Parameters<typeof addTutorialsBatch>[0][number]

    const newTasks: NewTaskData[] = []
    for (const task of tasks.filter((t) => t.is_recurring && !t.is_completed)) {
      const date = targetDate(task.date)
      if (!date) continue
      if (tasks.some((t) => t.is_recurring && t.title === task.title && t.date === date)) continue
      if (task.time && task.end_time) {
        const clash =
          allEventsInWeek.find((e) => e.date === date && overlaps(task.time!, task.end_time!, e.start_time, e.end_time)) ??
          tasksWithTimeInWeek.find((t) => t.date === date && t.title !== task.title && overlaps(task.time!, task.end_time!, t.time!, t.end_time!))
        if (clash) {
          conflicts.push(`"${task.title}" חופפת עם "${'title' in clash ? clash.title : ''}" (${task.time}–${task.end_time})`)
          continue
        }
      }
      newTasks.push({ title: task.title, description: task.description, date, time: task.time, end_time: task.end_time, is_recurring: true })
    }

    const newEvents: NewEventData[] = []
    for (const ev of events.filter((e) => e.is_recurring && e.source === 'manual')) {
      const date = targetDate(ev.date)
      if (!date) continue
      if (events.some((e) => e.is_recurring && e.source === 'manual' && e.title === ev.title && e.date === date)) continue
      const clash = allEventsInWeek.find(
        (e) => e.date === date && e.id !== ev.id && overlaps(ev.start_time, ev.end_time, e.start_time, e.end_time)
      )
      if (clash) {
        conflicts.push(`"${ev.title}" חופפת עם "${clash.title}" (${ev.start_time}–${ev.end_time})`)
        continue
      }
      newEvents.push({ title: ev.title, date, start_time: ev.start_time, end_time: ev.end_time, source: 'manual', task_id: null, color: ev.color, is_recurring: true })
    }

    const newTutorials: NewTutorialData[] = []
    for (const tut of tutorials.filter((t) => t.is_recurring && t.source === 'tutorial')) {
      const date = targetDate(tut.date)
      if (!date) continue
      if (tutorials.some((t) => t.is_recurring && t.title === tut.title && t.date === date)) continue
      const clash = tutorials.find(
        (t) => t.date === date && t.id !== tut.id && overlaps(tut.start_time, tut.end_time, t.start_time, t.end_time)
      )
      if (clash) {
        conflicts.push(`"${tut.title}" חופפת עם "${clash.title}" (${tut.start_time}–${tut.end_time})`)
        continue
      }
      newTutorials.push({ session_id: null, title: tut.title, date, start_time: tut.start_time, end_time: tut.end_time, color: tut.color ?? 'orange', is_recurring: true })
    }

    // ── Phase 2: batch insert all at once (parallel) ──
    const [insertedTasks] = await Promise.all([
      addTasksBatch(newTasks),
      addEventsBatch(newEvents),
      addTutorialsBatch(newTutorials),
    ])

    // ── Phase 3: create linked calendar events for tasks with time ──
    const linkedEvents: NewEventData[] = insertedTasks
      .filter((t) => t.time && t.end_time)
      .map((t) => ({ title: t.title, date: t.date, start_time: t.time!, end_time: t.end_time!, source: 'task' as const, task_id: t.id, color: 'green' }))
    if (linkedEvents.length > 0) await addEventsBatch(linkedEvents)

    return conflicts
  }, [tasks, events, tutorials, addTasksBatch, addEventsBatch, addTutorialsBatch])

  const checkOverlap = (
    date: string, startTime: string, endTime: string, excludeId?: string
  ) =>
    events.some(
      (ev) =>
        ev.id !== excludeId &&
        ev.date === date &&
        startTime < ev.end_time &&
        endTime > ev.start_time
    )

  const handleEventDrop = useCallback(async (
    eventId: string,
    isTutorial: boolean,
    isTaskEvent: boolean,
    taskId: string | null,
    newDate: string,
    newStartTime: string,
    newEndTime: string,
  ) => {
    if (isTutorial) {
      // Check overlap against other tutorials on that day
      const conflict = tutorials.some(t =>
        t.id !== eventId && t.date === newDate &&
        newStartTime < t.end_time && newEndTime > t.start_time
      )
      if (conflict) return
      await updateTutorial(eventId, { date: newDate, start_time: newStartTime, end_time: newEndTime })
      return
    }

    if (isTaskEvent && taskId) {
      // Check overlap against other sessions on that day
      const conflict = events.some(e =>
        e.id !== eventId && e.date === newDate &&
        newStartTime < e.end_time && newEndTime > e.start_time
      )
      if (conflict) return
      // Update the task; useWeekSync cascades to the linked event
      await updateTask(taskId, { date: newDate, time: newStartTime })
      return
    }

    // Manual lecture
    const event = events.find(e => e.id === eventId)
    if (!event) return

    const conflict = events.some(e =>
      e.id !== eventId && e.date === newDate &&
      newStartTime < e.end_time && newEndTime > e.start_time
    )
    if (conflict) return

    await updateEvent(eventId, { date: newDate, start_time: newStartTime, end_time: newEndTime })
  }, [events, tutorials, updateEvent, updateTutorial, updateTask])

  // Returns a suggestion message if a recurring item from the previous week overlaps
  const getRecurringSuggestion = useCallback((date: string, startTime: string, endTime: string): string | null => {
    const prev = new Date(date + 'T00:00:00')
    prev.setDate(prev.getDate() - 7)
    const prevDate = toDateStr(prev)
    const ov = (s1: string, e1: string, s2: string, e2: string) => s1 < e2 && e1 > s2

    const match =
      [...events, ...tutorials].find(e => e.date === prevDate && e.is_recurring && ov(startTime, endTime, e.start_time, e.end_time)) ??
      tasks.find(t => t.date === prevDate && t.is_recurring && t.time && t.end_time && ov(startTime, endTime, t.time, t.end_time))

    if (!match) return null
    const startDisplay = 'start_time' in match ? match.start_time : (match as Task).time
    return `"${match.title}" קבועה מהשבוע הקודם באותה שעה (${startDisplay}–${match.end_time}). השתמש ב"צרף קבועות" כדי לצרף את כל הקבועות בבת אחת.`
  }, [events, tutorials, tasks])

  const openAddEvent = (dateStr: string, hour?: number) => {
    setEditingEvent(null)
    setEventError(null)
    setEventSuggestion(null)
    eventSuggestionShown.current = false
    setEventModalDate(dateStr)
    setEventModalHour(hour)
    setEventModalOpen(true)
  }

  const openEditEvent = (event: CalendarEvent) => {
    if (event.source === 'tutorial') {
      setEditingTutorial(event)
      setTutorialModalOpen(true)
      return
    }
    setEditingEvent(event)
    setEventError(null)
    setEventModalOpen(true)
  }

  const handleEventSubmit = async (
    data: Omit<CalendarEvent, 'id' | 'user_id' | 'created_at'>,
    tutorial?: Omit<CalendarEvent, 'id' | 'user_id' | 'created_at'>
  ) => {
    if (checkOverlap(data.date, data.start_time, data.end_time, editingEvent?.id)) {
      setEventError('קיים אירוע חופף בשעות אלו. אנא בחר שעה אחרת.')
      return
    }
    // Check if a recurring item from the previous week matches — show suggestion once
    if (!editingEvent && !eventSuggestionShown.current) {
      const suggestion = getRecurringSuggestion(data.date, data.start_time, data.end_time)
      if (suggestion) {
        setEventSuggestion(suggestion)
        eventSuggestionShown.current = true
        return
      }
    }
    setEventSuggestion(null)
    eventSuggestionShown.current = false
    setEventError(null)
    setSavingEvent(true)
    try {
      if (editingEvent) {
        await updateEvent(editingEvent.id, data)
      } else {
        const { data: result, error: saveError } = await addEvent(data)
        if (!result) {
          setEventError(saveError ?? 'שגיאה בשמירה לדאטה בייס.')
          return
        }
        if (tutorial) {
          await addTutorial({
            session_id:   result.id,
            title:        tutorial.title,
            date:         tutorial.date,
            start_time:   tutorial.start_time,
            end_time:     tutorial.end_time,
            color:        data.color,
            is_recurring: tutorial.is_recurring ?? false,
          })
        }
      }
      setEventModalOpen(false)
    } catch (err) {
      setEventError(err instanceof Error ? err.message : 'שגיאה בשמירה')
    } finally {
      setSavingEvent(false)
    }
  }

  return (
    <div className="flex flex-col h-[100dvh] overflow-hidden bg-[#F8FAFC]">
      <Navbar activeTab={activeTab} onTabChange={setActiveTab} />

      <main className="flex-1 overflow-hidden">
        {activeTab === 'calendar' && (
          <div className="h-full">
            <CalendarView
              events={[...events, ...tutorials]}
              tasks={tasks}
              onEventClick={openEditEvent}
              onAddEvent={openAddEvent}
              onEventDrop={handleEventDrop}
              onAddRecurringToWeek={handleAddRecurringToWeek}
            />
          </div>
        )}

        {activeTab === 'tasks' && (
          <div className="h-full overflow-hidden">
            <TaskList
              tasks={tasks}
              events={events}
              isLoading={loading}
              onAdd={addTask}
              onToggle={toggleTask}
              onDelete={deleteTask}
              onEdit={updateTask}
              onBeforeAdd={(date, time, endTime) =>
                time && endTime ? getRecurringSuggestion(date, time, endTime) : null
              }
            />
          </div>
        )}

        {activeTab === 'recurring' && (
          <div className="h-full overflow-hidden">
            <RecurringView
              tasks={tasks}
              events={events}
              tutorials={tutorials}
              onDeleteTask={deleteTask}
              onDeleteEvent={deleteEvent}
              onDeleteTutorial={deleteTutorial}
              onEditTask={updateTask}
              onEditEvent={openEditEvent}
            />
          </div>
        )}

      </main>

      <TutorialModal
        open={tutorialModalOpen}
        tutorial={editingTutorial}
        onClose={() => setTutorialModalOpen(false)}
        onSave={async (id, data) => { await updateTutorial(id, data) }}
        onDelete={async (id) => { await deleteTutorial(id) }}
      />

      <EventModal
        open={eventModalOpen}
        onClose={() => { setEventModalOpen(false); setEventSuggestion(null); eventSuggestionShown.current = false }}
        initialDate={eventModalDate}
        initialHour={eventModalHour}
        editEvent={editingEvent}
        onSubmit={handleEventSubmit}
        onDelete={deleteEvent}
        error={eventError}
        suggestion={eventSuggestion}
        isLoading={savingEvent}
      />
    </div>
  )
}
