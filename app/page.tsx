'use client'

export const dynamic = 'force-dynamic'

import Navbar from '@/components/layout/Navbar'
import EventModal from '@/components/layout/EventModal'
import TutorialModal from '@/components/layout/TutorialModal'
import CalendarView from '@/components/calendar/CalendarView'
import TaskList from '@/components/tasks/TaskList'
import RecurringView from '@/components/recurring/RecurringView'
import MaterialsView from '@/components/materials/MaterialsView'
import { usePlannerPage } from '@/hooks/planner/usePlannerPage'

export default function AppPage() {
  const {
    tasks,
    events,
    tutorials,
    loadingState,
    activeTab,
    setActiveTab,
    taskActions,
    recurringActions,
    eventModal,
    tutorialModal,
    calendarActions,
    openEditEvent,
    getRecurringHint,
  } = usePlannerPage()

  return (
    <div className="flex flex-col h-[100dvh] overflow-hidden bg-[#F8FAFC]">
      {/* Safe-area spacer for iPhone notch / Dynamic Island */}
      <div className="flex-shrink-0 bg-white h-[env(safe-area-inset-top,0px)]" />
      <Navbar activeTab={activeTab} onTabChange={setActiveTab} />

      <main className="flex-1 overflow-hidden">
        {activeTab === 'calendar' && (
          <div className="h-full">
            <CalendarView
              events={[...events, ...tutorials]}
              tasks={tasks}
              onEventClick={calendarActions.onEventClick}
              onAddEvent={calendarActions.onAddEvent}
              onEventDrop={calendarActions.onEventDrop}
              onAddRecurringToWeek={calendarActions.onAddRecurringToWeek}
            />
          </div>
        )}

        {activeTab === 'tasks' && (
          <div className="h-full overflow-hidden">
            <TaskList
              tasks={tasks}
              events={events}
              isLoading={loadingState.tasks}
              onAdd={taskActions.addTask}
              onToggle={taskActions.toggleTask}
              onDelete={taskActions.deleteTask}
              onEdit={taskActions.updateTask}
              onBeforeAdd={getRecurringHint}
            />
          </div>
        )}

        {activeTab === 'recurring' && (
          <div className="h-full overflow-hidden">
            <RecurringView
              tasks={tasks}
              events={events}
              tutorials={tutorials}
            />
          </div>
        )}

        {activeTab === 'materials' && (
          <div className="h-full overflow-hidden">
            <MaterialsView
              tutorials={tutorials}
              events={events.filter((e) => e.source === 'manual')}
            />
          </div>
        )}
      </main>

      <TutorialModal {...tutorialModal} />
      <EventModal {...eventModal} />
    </div>
  )
}
