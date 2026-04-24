import { Plus } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { TaskFilter } from '@/types'
import { TASK_LIST_FILTERS } from './task-list-constants'

interface TaskListHeaderProps {
  filter: TaskFilter
  onFilterChange: (filter: TaskFilter) => void
  onAddClick: () => void
}

export default function TaskListHeader({
  filter,
  onFilterChange,
  onAddClick,
}: TaskListHeaderProps) {
  return (
    <div className="flex items-center gap-2 px-3 py-2.5 border-b border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 flex-shrink-0">
      <div className="flex-1 flex items-center gap-1 min-w-0">
        {TASK_LIST_FILTERS.map(({ label, value }) => (
          <button
            key={value}
            onClick={() => onFilterChange(value)}
            className={cn(
              'flex-1 px-1.5 py-1.5 rounded-full text-[11px] font-semibold whitespace-nowrap transition-all duration-150 cursor-pointer min-h-[34px] focus:outline-none focus:ring-2 focus:ring-blue-500',
              filter === value
                ? 'bg-blue-500 text-white shadow-sm shadow-blue-200'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 hover:text-slate-700 dark:hover:text-slate-200',
            )}
          >
            {label}
          </button>
        ))}
      </div>

      <button
        onClick={onAddClick}
        className="flex-shrink-0 flex items-center gap-1.5 min-h-[44px] sm:min-h-[34px] px-3 sm:px-3.5 rounded-full bg-blue-500 hover:bg-blue-600 active:scale-95 text-white text-xs font-semibold shadow-sm shadow-blue-200 transition-all duration-150 cursor-pointer"
      >
        <Plus className="h-4 w-4 flex-shrink-0" />
        <span className="hidden sm:inline">הוסף משימה</span>
      </button>
    </div>
  )
}
