'use client'

export const dynamic = 'force-dynamic'

import { useState, useCallback } from 'react'
import Navbar from '@/components/layout/Navbar'
import EventModal from '@/components/layout/EventModal'
import TutorialModal from '@/components/layout/TutorialModal'
import CalendarView from '@/components/calendar/CalendarView'
import TaskList from '@/components/tasks/TaskList'
import { useWeekSync } from '@/hooks/useWeekSync'
import { timeToMinutes } from '@/lib/date'
import type { CalendarEvent, TabView } from '@/types'

export default function AppPage() {
  const {
    tasks, events, tutorials, loading,
    addTask, toggleTask, deleteTask, updateTask,
    addEvent, updateEvent, deleteEvent, addTutorial, updateTutorial, deleteTutorial,
  } = useWeekSync()

  const [activeTab, setActiveTab] = useState<TabView>('calendar')

  // Event modal state
  const [eventModalOpen, setEventModalOpen] = useState(false)
  const [eventModalDate, setEventModalDate] = useState<string | undefined>()
  const [eventModalHour, setEventModalHour] = useState<number | undefined>()
  const [editingEvent, setEditingEvent]     = useState<CalendarEvent | null>(null)
  const [savingEvent, setSavingEvent]       = useState(false)
  const [eventError, setEventError]         = useState<string | null>(null)

  // Tutorial modal state
  const [tutorialModalOpen, setTutorialModalOpen] = useState(false)
  const [editingTutorial, setEditingTutorial]     = useState<CalendarEvent | null>(null)

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

  const openAddEvent = (dateStr: string, hour?: number) => {
    setEditingEvent(null)
    setEventError(null)
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
            title:      tutorial.title,
            date:       tutorial.date,
            start_time: tutorial.start_time,
            end_time:   tutorial.end_time,
            color:      data.color,
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
    <div className="flex flex-col h-screen overflow-hidden bg-[#F8FAFC]">
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
        onClose={() => setEventModalOpen(false)}
        initialDate={eventModalDate}
        initialHour={eventModalHour}
        editEvent={editingEvent}
        onSubmit={handleEventSubmit}
        onDelete={deleteEvent}
        error={eventError}
        isLoading={savingEvent}
      />
    </div>
  )
}
