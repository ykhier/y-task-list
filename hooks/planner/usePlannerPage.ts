'use client'

import { useCallback, useRef, useState } from 'react'
import { useWeekSync } from '@/hooks/useWeekSync'
import {
  getRecurringEventsInWeek,
  getRecurringSuggestion,
  getTimedTasksInWeek,
  hasTimedConflict,
  overlaps,
  targetRecurringDate,
} from '@/lib/planner/page-helpers'
import type { CalendarEvent, TabView, WeekDay } from '@/types'

type EventPayload = Omit<CalendarEvent, 'id' | 'user_id' | 'created_at'>

export function usePlannerPage() {
  const {
    tasks,
    events,
    tutorials,
    loading,
    loadingState,
    addTask,
    addTasksBatch,
    toggleTask,
    deleteTask,
    updateTask,
    addEvent,
    addEventsBatch,
    updateEvent,
    deleteEvent,
    addTutorial,
    addTutorialsBatch,
    updateTutorial,
    deleteTutorial,
  } = useWeekSync()

  const [activeTab, setActiveTab] = useState<TabView>('calendar')
  const [eventModalOpen, setEventModalOpen] = useState(false)
  const [eventModalDate, setEventModalDate] = useState<string | undefined>()
  const [eventModalHour, setEventModalHour] = useState<number | undefined>()
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null)
  const [savingEvent, setSavingEvent] = useState(false)
  const [eventError, setEventError] = useState<string | null>(null)
  const [eventSuggestion, setEventSuggestion] = useState<string | null>(null)
  const eventSuggestionShown = useRef(false)

  const [tutorialModalOpen, setTutorialModalOpen] = useState(false)
  const [editingTutorial, setEditingTutorial] = useState<CalendarEvent | null>(null)

  const handleAddRecurringToWeek = useCallback(async (weekDays: WeekDay[]): Promise<string[]> => {
    const conflicts: string[] = []
    const allEventsInWeek = getRecurringEventsInWeek(events, tutorials, weekDays)
    const tasksWithTimeInWeek = getTimedTasksInWeek(tasks, weekDays)

    type NewTaskData = Parameters<typeof addTasksBatch>[0][number]
    type NewEventData = Parameters<typeof addEventsBatch>[0][number]
    type NewTutorialData = Parameters<typeof addTutorialsBatch>[0][number]

    const newTasks: NewTaskData[] = []
    for (const task of tasks.filter((item) => item.is_recurring && !item.is_completed)) {
      const date = targetRecurringDate(weekDays, task.date)
      if (!date) continue
      if (tasks.some((item) => item.is_recurring && item.title === task.title && item.date === date)) continue

      if (task.time && task.end_time) {
        const clash =
          allEventsInWeek.find(
            (event) => event.date === date && overlaps(task.time!, task.end_time!, event.start_time, event.end_time),
          ) ??
          tasksWithTimeInWeek.find(
            (item) =>
              item.date === date &&
              item.title !== task.title &&
              overlaps(task.time!, task.end_time!, item.time!, item.end_time!),
          )

        if (clash) {
          conflicts.push(`"${task.title}" חופפת עם "${clash.title}" (${task.time}–${task.end_time})`)
          continue
        }
      }

      newTasks.push({
        title: task.title,
        description: task.description,
        date,
        time: task.time,
        end_time: task.end_time,
        is_recurring: true,
      })
    }

    const newEvents: NewEventData[] = []
    for (const event of events.filter((item) => item.is_recurring && item.source === 'manual')) {
      const date = targetRecurringDate(weekDays, event.date)
      if (!date) continue
      if (events.some((item) => item.is_recurring && item.source === 'manual' && item.title === event.title && item.date === date)) continue

      const clash = allEventsInWeek.find(
        (item) =>
          item.date === date &&
          item.id !== event.id &&
          overlaps(event.start_time, event.end_time, item.start_time, item.end_time),
      )
      if (clash) {
        conflicts.push(`"${event.title}" חופפת עם "${clash.title}" (${event.start_time}–${event.end_time})`)
        continue
      }

      newEvents.push({
        title: event.title,
        date,
        start_time: event.start_time,
        end_time: event.end_time,
        source: 'manual',
        task_id: null,
        color: event.color,
        is_recurring: true,
      })
    }

    const newTutorials: NewTutorialData[] = []
    for (const tutorial of tutorials.filter((item) => item.is_recurring && item.source === 'tutorial')) {
      const date = targetRecurringDate(weekDays, tutorial.date)
      if (!date) continue
      if (tutorials.some((item) => item.is_recurring && item.title === tutorial.title && item.date === date)) continue

      const clash = tutorials.find(
        (item) =>
          item.date === date &&
          item.id !== tutorial.id &&
          overlaps(tutorial.start_time, tutorial.end_time, item.start_time, item.end_time),
      )
      if (clash) {
        conflicts.push(`"${tutorial.title}" חופפת עם "${clash.title}" (${tutorial.start_time}–${tutorial.end_time})`)
        continue
      }

      newTutorials.push({
        session_id: null,
        title: tutorial.title,
        date,
        start_time: tutorial.start_time,
        end_time: tutorial.end_time,
        color: tutorial.color ?? 'orange',
        is_recurring: true,
      })
    }

    const [insertedTasks] = await Promise.all([
      addTasksBatch(newTasks),
      addEventsBatch(newEvents),
      addTutorialsBatch(newTutorials),
    ])

    const linkedEvents: NewEventData[] = insertedTasks
      .filter((task) => task.time && task.end_time)
      .map((task) => ({
        title: task.title,
        date: task.date,
        start_time: task.time!,
        end_time: task.end_time!,
        source: 'task' as const,
        task_id: task.id,
        color: 'green',
      }))

    if (linkedEvents.length > 0) {
      await addEventsBatch(linkedEvents)
    }

    return conflicts
  }, [tasks, events, tutorials, addTasksBatch, addEventsBatch, addTutorialsBatch])

  const openAddEvent = useCallback((dateStr: string, hour?: number) => {
    setEditingEvent(null)
    setEventError(null)
    setEventSuggestion(null)
    eventSuggestionShown.current = false
    setEventModalDate(dateStr)
    setEventModalHour(hour)
    setEventModalOpen(true)
  }, [])

  const openEditEvent = useCallback((event: CalendarEvent) => {
    if (event.source === 'tutorial') {
      setEditingTutorial(event)
      setTutorialModalOpen(true)
      return
    }

    setEditingEvent(event)
    setEventError(null)
    setEventModalOpen(true)
  }, [])

  const getRecurringHint = useCallback((date: string, time?: string | null, endTime?: string | null) => {
    if (!time || !endTime) return null
    return getRecurringSuggestion(date, time, endTime, events, tutorials, tasks)
  }, [events, tutorials, tasks])

  const handleEventDrop = useCallback(async (
    eventId: string,
    isTutorial: boolean,
    isTaskEvent: boolean,
    taskId: string | null,
    newDate: string,
    newStartTime: string,
    newEndTime: string,
  ) => {
    const completedTaskIds = new Set(tasks.filter((t) => t.is_completed).map((t) => t.id))
    const visibleEvents = events.filter((ev) => !ev.task_id || !completedTaskIds.has(ev.task_id))

    if (isTutorial) {
      if (hasTimedConflict(tutorials, newDate, newStartTime, newEndTime, eventId)) return
      await updateTutorial(eventId, { date: newDate, start_time: newStartTime, end_time: newEndTime })
      return
    }

    if (isTaskEvent && taskId) {
      if (hasTimedConflict(visibleEvents, newDate, newStartTime, newEndTime, eventId)) return
      await updateTask(taskId, { date: newDate, time: newStartTime })
      return
    }

    const event = events.find((e) => e.id === eventId)
    if (!event) return
    if (hasTimedConflict(visibleEvents, newDate, newStartTime, newEndTime, eventId)) return

    await updateEvent(eventId, { date: newDate, start_time: newStartTime, end_time: newEndTime })
  }, [events, tutorials, updateEvent, updateTask, updateTutorial])

  const handleEventSubmit = useCallback(async (
    data: EventPayload,
    tutorial?: EventPayload,
  ) => {
    const completedTaskIds = new Set(tasks.filter((t) => t.is_completed).map((t) => t.id))
    const visibleEvents = events.filter((ev) => !ev.task_id || !completedTaskIds.has(ev.task_id))
    const conflicting = visibleEvents.find(
      (ev) =>
        (!editingEvent?.id || ev.id !== editingEvent.id) &&
        ev.date === data.date &&
        overlaps(data.start_time, data.end_time, ev.start_time, ev.end_time),
    )
    if (conflicting) {
      setEventError(`חופף עם "${conflicting.title}" (${conflicting.start_time}–${conflicting.end_time}). אנא בחר שעה אחרת.`)
      return
    }

    if (!editingEvent && !eventSuggestionShown.current) {
      const suggestion = getRecurringSuggestion(
        data.date,
        data.start_time,
        data.end_time,
        events,
        tutorials,
        tasks,
      )

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
            session_id: result.id,
            title: tutorial.title,
            date: tutorial.date,
            start_time: tutorial.start_time,
            end_time: tutorial.end_time,
            color: data.color,
            is_recurring: tutorial.is_recurring ?? false,
          })
        }
      }

      setEventModalOpen(false)
    } catch (error) {
      setEventError(error instanceof Error ? error.message : 'שגיאה בשמירה')
    } finally {
      setSavingEvent(false)
    }
  }, [addEvent, addTutorial, editingEvent, events, tasks, tutorials, updateEvent])

  const closeEventModal = useCallback(() => {
    setEventModalOpen(false)
    setEventSuggestion(null)
    eventSuggestionShown.current = false
  }, [])

  return {
    tasks,
    events,
    tutorials,
    loading,
    loadingState,
    activeTab,
    setActiveTab,
    taskActions: {
      addTask,
      toggleTask,
      deleteTask,
      updateTask,
    },
    recurringActions: {
      deleteTask,
      deleteEvent,
      deleteTutorial,
      updateTask,
    },
    eventModal: {
      open: eventModalOpen,
      initialDate: eventModalDate,
      initialHour: eventModalHour,
      editEvent: editingEvent,
      error: eventError,
      suggestion: eventSuggestion,
      isLoading: savingEvent,
      onClose: closeEventModal,
      onSubmit: handleEventSubmit,
      onDelete: deleteEvent,
    },
    tutorialModal: {
      open: tutorialModalOpen,
      tutorial: editingTutorial,
      onClose: () => setTutorialModalOpen(false),
      onSave: async (
        id: string,
        data: { date: string; start_time: string; end_time: string; is_recurring: boolean; color: string },
      ) => {
        await updateTutorial(id, data)
      },
      onDelete: async (id: string) => {
        await deleteTutorial(id)
      },
    },
    calendarActions: {
      onEventClick: openEditEvent,
      onAddEvent: openAddEvent,
      onEventDrop: handleEventDrop,
      onAddRecurringToWeek: handleAddRecurringToWeek,
    },
    openEditEvent,
    getRecurringHint,
  }
}
