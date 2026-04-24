import { ArrowLeft, ArrowRight, ChevronLeft, ChevronRight, Plus, Repeat2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface SharedToolbarProps {
  weekLabel: string
  isCurrentWeek: boolean
  recurringDone: boolean
  addingRecurring: boolean
  hasRecurringAction: boolean
  onPrevWeek: () => void
  onNextWeek: () => void
  onToday: () => void
  onAddRecurring: () => void
  onAddEvent: () => void
}

interface MobileWeekNavigationProps {
  prevWeekLabel: string
  nextWeekLabel: string
  onPrevWeek: () => void
  onNextWeek: () => void
}

export function CalendarDesktopToolbar({
  weekLabel,
  isCurrentWeek,
  recurringDone,
  addingRecurring,
  hasRecurringAction,
  onPrevWeek,
  onNextWeek,
  onToday,
  onAddRecurring,
  onAddEvent,
}: SharedToolbarProps) {
  return (
    <div className="hidden sm:flex items-center justify-between px-4 py-2 border-b border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 flex-shrink-0 gap-2">
      <span className="text-xs text-slate-500 dark:text-slate-400 font-medium min-w-0 truncate">{weekLabel}</span>
      <div className="flex items-center gap-0.5 flex-shrink-0">
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onPrevWeek}>
          <ChevronRight className="h-4 w-4" />
        </Button>
        {!isCurrentWeek && (
          <Button variant="ghost" size="sm" className="h-7 text-xs text-blue-500 px-2" onClick={onToday}>
            היום
          </Button>
        )}
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onNextWeek}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
      </div>
      <div className="flex items-center gap-1.5 flex-shrink-0">
        {hasRecurringAction && (
          <Button
            size="sm"
            variant={recurringDone ? 'default' : 'outline'}
            className={cn(recurringDone && 'bg-green-500 hover:bg-green-600 border-green-500 text-white')}
            onClick={onAddRecurring}
            disabled={addingRecurring}
          >
            <Repeat2 className="h-3.5 w-3.5 flex-shrink-0" />
            <span>{addingRecurring ? 'מצרף...' : recurringDone ? 'נוסף!' : 'צרף קבועות'}</span>
          </Button>
        )}
        <Button size="sm" onClick={onAddEvent}>
          <Plus className="h-3.5 w-3.5 flex-shrink-0" />
          <span>הוסף הרצאה</span>
        </Button>
      </div>
    </div>
  )
}

export function CalendarMobileToolbar({
  weekLabel,
  isCurrentWeek,
  recurringDone,
  addingRecurring,
  hasRecurringAction,
  onToday,
  onAddRecurring,
  onAddEvent,
}: Omit<SharedToolbarProps, 'onPrevWeek' | 'onNextWeek'>) {
  return (
    <div className="flex sm:hidden items-center justify-between px-3 py-2 border-b border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 flex-shrink-0 gap-2">
      <div className="flex items-center gap-2 min-w-0">
        <span className="text-xs text-slate-500 dark:text-slate-400 font-medium truncate">{weekLabel}</span>
        {!isCurrentWeek && (
          <button
            onClick={onToday}
            className="flex-shrink-0 text-[10px] font-semibold text-blue-500 bg-blue-50 border border-blue-200 rounded-full px-2 py-0.5 cursor-pointer"
          >
            היום
          </button>
        )}
      </div>
      <div className="flex items-center gap-1.5 flex-shrink-0">
        {hasRecurringAction && (
          <Button
            size="sm"
            variant={recurringDone ? 'default' : 'outline'}
            className={cn('min-h-[44px]', recurringDone && 'bg-green-500 hover:bg-green-600 border-green-500 text-white')}
            onClick={onAddRecurring}
            disabled={addingRecurring}
          >
            <Repeat2 className="h-3.5 w-3.5" />
          </Button>
        )}
        <Button size="sm" className="min-h-[44px]" onClick={onAddEvent}>
          <Plus className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  )
}

export function MobileWeekNavigation({
  prevWeekLabel,
  nextWeekLabel,
  onPrevWeek,
  onNextWeek,
}: MobileWeekNavigationProps) {
  return (
    <div className="flex sm:hidden flex-shrink-0 bg-white dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800 px-3 py-2.5 gap-2.5">
      <button
        onClick={onPrevWeek}
        className="group relative flex-1 flex items-center gap-3 px-3.5 py-3 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 overflow-hidden cursor-pointer transition-all duration-200 active:scale-[0.97] hover:border-blue-200 dark:hover:border-blue-700 hover:bg-blue-50/60 dark:hover:bg-blue-950/30"
      >
        <div className="relative flex-shrink-0 w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow-sm shadow-blue-200 dark:shadow-blue-900">
          <ArrowRight className="h-4.5 w-4.5 text-white" style={{ width: 18, height: 18 }} />
        </div>
        <div className="relative flex flex-col items-start min-w-0">
          <span className="text-xs font-bold text-slate-800 dark:text-slate-100 leading-tight">שבוע קודם</span>
          <span className="text-[10px] text-slate-400 font-medium mt-0.5 truncate max-w-[90px]">{prevWeekLabel}</span>
        </div>
      </button>

      <div className="flex items-center flex-shrink-0">
        <div className="w-1 h-1 rounded-full bg-slate-300 dark:bg-slate-600" />
      </div>

      <button
        onClick={onNextWeek}
        className="group relative flex-1 flex items-center justify-end gap-3 px-3.5 py-3 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 overflow-hidden cursor-pointer transition-all duration-200 active:scale-[0.97] hover:border-violet-200 dark:hover:border-violet-700 hover:bg-violet-50/60 dark:hover:bg-violet-950/30"
      >
        <div className="relative flex flex-col items-end min-w-0">
          <span className="text-xs font-bold text-slate-800 dark:text-slate-100 leading-tight">שבוע הבא</span>
          <span className="text-[10px] text-slate-400 font-medium mt-0.5 truncate max-w-[90px]">{nextWeekLabel}</span>
        </div>
        <div className="relative flex-shrink-0 w-9 h-9 rounded-xl bg-gradient-to-br from-violet-500 to-violet-600 flex items-center justify-center shadow-sm shadow-violet-200">
          <ArrowLeft className="text-white" style={{ width: 18, height: 18 }} />
        </div>
      </button>
    </div>
  )
}
