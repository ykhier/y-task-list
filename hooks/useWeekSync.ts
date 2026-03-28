'use client'

import { useCallback } from 'react'
import { useTasks } from './useTasks'
import { useEvents } from './useEvents'
import { useTutorials } from './useTutorials'
import type { Task, CalendarEvent, Tutorial } from '@/types'

/**
 * useWeekSync ties together useTasks + useEvents and implements
 * the smart sync rules:
 *
 *  1. When a task with `time` is added → auto-create a calendar event
 *  2. When a task `time` is updated → update or create/delete its event
 *  3. When a task is marked DONE → hide its event (keep in DB for history)
 *  4. When a task is deleted → delete its linked event
 */
export function useWeekSync() {
  const {
    tasks, loading: tasksLoading, error: tasksError,
    addTask, toggleTask, deleteTask, updateTask,
  } = useTasks()

  const {
    events, loading: eventsLoading, error: eventsError,
    addEvent, updateEvent, deleteEvent, deleteEventByTaskId,
  } = useEvents()

  const {
    tutorials: rawTutorials, loading: tutorialsLoading, error: tutorialsError,
    addTutorial, updateTutorial, deleteTutorial, deleteTutorialBySessionId,
  } = useTutorials()

  // Map tutorials to CalendarEvent shape for display
  const tutorials: CalendarEvent[] = rawTutorials.map((t: Tutorial) => ({
    id:         t.id,
    user_id:    t.user_id,
    title:      t.title,
    date:       t.date,
    start_time: t.start_time,
    end_time:   t.end_time,
    source:     'tutorial',
    task_id:    null,
    color:      t.color ?? 'orange',
    created_at: t.created_at,
  }))

  // -- Tasks --

  const handleAddTask = useCallback(
    async (data: Omit<Task, 'id' | 'user_id' | 'created_at' | 'is_completed'>) => {
      const task = await addTask(data)
      if (!task) return

      // If task has time → auto-create event
      if (task.time && task.end_time) {
        await addEvent({
          title:      task.title,
          date:       task.date,
          start_time: task.time,
          end_time:   task.end_time,
          source:     'task',
          task_id:    task.id,
          color:      'green',
        }).then(({ error }) => { if (error) console.error('auto-create event failed:', error) })
      }
    },
    [addTask, addEvent]
  )

  const handleToggleTask = useCallback(
    async (id: string, completed: boolean) => {
      await toggleTask(id, completed)
      // Event visibility is handled in CalendarView by filtering out events
      // whose task_id is in the completedTaskIds set — no DB update needed.
    },
    [toggleTask]
  )

  const handleDeleteTask = useCallback(
    async (id: string) => {
      await deleteTask(id)
      // Remove linked event(s) for this task
      await deleteEventByTaskId(id)
    },
    [deleteTask, deleteEventByTaskId]
  )

  const handleUpdateTask = useCallback(
    async (id: string, data: Partial<Task>) => {
      const original = tasks.find((t) => t.id === id)
      await updateTask(id, data)

      // Sync time change → update linked event
      if (data.time !== undefined || data.title !== undefined || data.date !== undefined) {
        const existingEvent = events.find((e) => e.task_id === id)
        const newTime = data.time ?? original?.time
        const newEndTime = data.end_time ?? original?.end_time
        const newTitle = data.title ?? original?.title ?? ''
        const newDate = data.date ?? original?.date ?? ''

        if (newTime && newEndTime) {
          if (existingEvent) {
            // Update existing event
            await updateEvent(existingEvent.id, {
              title:      newTitle,
              date:       newDate,
              start_time: newTime,
              end_time:   newEndTime,
            })
          } else {
            // Task now has a time — create new event
            await addEvent({
              title:      newTitle,
              date:       newDate,
              start_time: newTime,
              end_time:   newEndTime,
              source:     'task',
              task_id:    id,
              color:      'green',
            }).then(({ error }) => { if (error) console.error('create event on task update failed:', error) })
          }
        } else if (existingEvent) {
          // Time was removed — delete linked event
          await deleteEvent(existingEvent.id)
        }
      }
    },
    [tasks, events, updateTask, updateEvent, addEvent, deleteEvent]
  )

  // -- Events --

  const handleAddEvent = useCallback(
    async (data: Omit<CalendarEvent, 'id' | 'user_id' | 'created_at'>): Promise<{ data: CalendarEvent | null; error: string | null }> => {
      return await addEvent(data)
    },
    [addEvent]
  )

  const handleUpdateEvent = useCallback(
    async (id: string, data: Partial<CalendarEvent>) => {
      await updateEvent(id, data)
    },
    [updateEvent]
  )

  const handleDeleteEvent = useCallback(
    async (id: string) => {
      await deleteTutorialBySessionId(id)
      await deleteEvent(id)
    },
    [deleteEvent, deleteTutorialBySessionId]
  )

  const handleAddTutorial = useCallback(
    async (data: Omit<Tutorial, 'id' | 'user_id' | 'created_at'>) => {
      return await addTutorial(data)
    },
    [addTutorial]
  )

  const handleUpdateTutorial = useCallback(
    async (id: string, data: Partial<Tutorial>) => {
      await updateTutorial(id, data)
    },
    [updateTutorial]
  )

  const handleDeleteTutorial = useCallback(
    async (id: string) => {
      await deleteTutorial(id)
    },
    [deleteTutorial]
  )

  return {
    // Data
    tasks,
    events,
    tutorials,
    loading: tasksLoading || eventsLoading || tutorialsLoading,
    error:   tasksError ?? eventsError ?? tutorialsError,

    // Task actions
    addTask:    handleAddTask,
    toggleTask: handleToggleTask,
    deleteTask: handleDeleteTask,
    updateTask: handleUpdateTask,

    // Event actions
    addEvent:    handleAddEvent,
    updateEvent: handleUpdateEvent,
    deleteEvent: handleDeleteEvent,

    // Tutorial actions
    addTutorial:               handleAddTutorial,
    updateTutorial:            handleUpdateTutorial,
    deleteTutorial:            handleDeleteTutorial,
    deleteTutorialBySessionId,
  }
}
