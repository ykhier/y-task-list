import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import TaskForm from '../TaskForm'
import type { TaskDialogState } from './task-list-utils'

interface TaskListDialogsProps {
  addDialog: TaskDialogState
  editDialog: TaskDialogState
}

function TaskDialog({
  open,
  title,
  suggestion,
  editTask,
  initialDate,
  tasks,
  events,
  isLoading,
  onOpenChange,
  onSubmit,
  onCancel,
}: TaskDialogState) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        {suggestion && (
          <div className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-md px-3 py-2 flex flex-col gap-1">
            <p className="font-semibold">שים לב - קיים תוכן קבוע מהשבוע הקודם</p>
            <p>{suggestion}</p>
            <p className="text-xs text-amber-600">
              לחץ &quot;הוסף משימה&quot; שוב כדי להוסיף ידנית, או סגור ולחץ &quot;צרף קבועות&quot;.
            </p>
          </div>
        )}
        <TaskForm
          initialDate={initialDate}
          editTask={editTask}
          events={events}
          tasks={tasks}
          onSubmit={onSubmit}
          onCancel={onCancel}
          isLoading={isLoading}
        />
      </DialogContent>
    </Dialog>
  )
}

export default function TaskListDialogs({ addDialog, editDialog }: TaskListDialogsProps) {
  return (
    <>
      <TaskDialog {...addDialog} />
      <TaskDialog {...editDialog} />
    </>
  )
}
