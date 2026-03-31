import { Repeat2 } from 'lucide-react'

export default function RecurringEmptyState() {
  return (
    <div className="flex flex-col items-center justify-center h-full text-center px-4">
      <Repeat2 className="h-10 w-10 text-slate-200 mb-3" />
      <p className="text-sm text-slate-400 font-medium">אין פריטים קבועים</p>
      <p className="text-xs text-slate-400 mt-1">סמן משימה, הרצאה או תרגול כ&quot;קבוע&quot; כדי שיופיע כאן</p>
    </div>
  )
}
