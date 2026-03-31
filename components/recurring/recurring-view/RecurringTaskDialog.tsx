import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import TaskForm from '@/components/tasks/TaskForm'
import type { Task } from '@/types'

interface RecurringTaskDialogProps {
  open: boolean
  task: Task | null
  tasks: Task[]
  isLoading: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (data: Omit<Task, 'id' | 'user_id' | 'created_at' | 'is_completed'>) => Promise<void>
  onCancel: () => void
}

export default function RecurringTaskDialog({
  open,
  task,
  tasks,
  isLoading,
  onOpenChange,
  onSubmit,
  onCancel,
}: RecurringTaskDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>ערוך משימה קבועה</DialogTitle>
        </DialogHeader>
        <TaskForm
          editTask={task}
          tasks={tasks}
          onSubmit={onSubmit}
          onCancel={onCancel}
          isLoading={isLoading}
        />
      </DialogContent>
    </Dialog>
  )
}
