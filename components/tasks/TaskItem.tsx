'use client'

import { useState } from 'react'
import { Trash2, Clock, FileText, Pencil, Repeat2 } from 'lucide-react'
import { Checkbox } from '@/components/ui/checkbox'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { formatTime12 } from '@/lib/date'
import type { Task } from '@/types'

interface TaskItemProps {
  task: Task
  onToggle: (id: string, completed: boolean) => void
  onDelete: (id: string) => void
  onEdit: (task: Task) => void
}

export default function TaskItem({ task, onToggle, onDelete, onEdit }: TaskItemProps) {
  const [isDeleting, setIsDeleting] = useState(false)

  const handleDelete = async () => {
    setIsDeleting(true)
    await onDelete(task.id)
  }

  return (
    <div
      className={cn(
        'group flex items-center gap-3 px-4 py-3.5 rounded-xl border border-slate-200 bg-white shadow-sm hover:shadow-md hover:border-slate-300 transition-all duration-150 animate-fade-in mx-3 my-1.5',
        isDeleting && 'opacity-0 scale-95'
      )}
    >
      {/* Checkbox */}
      <div className="pt-0.5 flex-shrink-0">
        <Checkbox
          checked={task.is_completed}
          onCheckedChange={(checked) => onToggle(task.id, !!checked)}
          aria-label={`Mark "${task.title}" as ${task.is_completed ? 'incomplete' : 'complete'}`}
        />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <p
          className={cn(
            'text-sm font-medium text-slate-800 transition-all duration-200',
            task.is_completed && 'line-through text-slate-400 task-done'
          )}
        >
          {task.title}
        </p>

        {task.description && (
          <p className={cn(
            'mt-0.5 text-xs text-slate-500 flex items-center gap-1',
            task.is_completed && 'opacity-60'
          )}>
            <FileText className="h-3 w-3 flex-shrink-0" />
            <span className="truncate">{task.description}</span>
          </p>
        )}

        {(task.time && task.end_time || task.is_recurring) && (
          <div className="mt-1 flex items-center flex-wrap gap-x-2 gap-y-0.5">
            {task.time && task.end_time && (
              <div className="flex items-center gap-1">
                <Clock className="h-3 w-3 text-blue-400 flex-shrink-0" />
                <span className="text-xs text-blue-500 font-medium">
                  {formatTime12(task.time)} – {formatTime12(task.end_time)}
                </span>
                <Badge variant="default" className="text-[10px] px-1.5 py-0">
                  בלוח שנה
                </Badge>
              </div>
            )}
            {task.is_recurring && (
              <div className="flex items-center gap-1">
                <Repeat2 className="h-3 w-3 text-violet-400 flex-shrink-0" />
                <span className="text-xs text-violet-500 font-medium">חוזר כל שבוע</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Actions — reveal on hover */}
      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity duration-150 flex-shrink-0">
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 text-slate-400 hover:text-slate-600"
          onClick={() => onEdit(task)}
          aria-label="Edit task"
        >
          <Pencil className="h-3.5 w-3.5" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 text-slate-400 hover:text-red-500"
          onClick={handleDelete}
          aria-label="Delete task"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  )
}
