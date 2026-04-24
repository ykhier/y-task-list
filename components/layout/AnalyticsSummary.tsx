'use client'

import { CheckCircle2, Circle, CalendarDays, TrendingUp } from 'lucide-react'
import { toDateStr } from '@/lib/date'
import type { Task, CalendarEvent } from '@/types'

interface StatCardProps {
  label: string
  value: number | string
  sub?: string
  icon: React.ElementType
  color: string
}

function StatCard({ label, value, sub, icon: Icon, color }: StatCardProps) {
  return (
    <div className="rounded-xl border border-slate-100 dark:border-slate-700/50 bg-white dark:bg-slate-800 p-4 flex items-start gap-3">
      <div className={`h-9 w-9 rounded-lg flex items-center justify-center flex-shrink-0 ${color}`}>
        <Icon className="h-4 w-4" />
      </div>
      <div>
        <p className="text-2xl font-semibold text-slate-800 dark:text-slate-100">{value}</p>
        <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mt-0.5">{label}</p>
        {sub && <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">{sub}</p>}
      </div>
    </div>
  )
}

interface AnalyticsSummaryProps {
  tasks: Task[]
  events: CalendarEvent[]
}

export default function AnalyticsSummary({ tasks, events }: AnalyticsSummaryProps) {
  const today = toDateStr(new Date())
  const now = new Date()
  const weekStart = toDateStr(new Date(new Date(now).setDate(now.getDate() - now.getDay())))
  const weekEnd   = toDateStr(new Date(new Date(now).setDate(now.getDate() + (6 - now.getDay()))))

  const todayTasks      = tasks.filter((t) => t.date === today)
  const weekTasks       = tasks.filter((t) => t.date >= weekStart && t.date <= weekEnd)
  const completedToday  = todayTasks.filter((t) => t.is_completed).length
  const completedWeek   = weekTasks.filter((t) => t.is_completed).length
  const completionRate  = weekTasks.length > 0
    ? Math.round((completedWeek / weekTasks.length) * 100)
    : 0
  const weekEvents      = events.filter((e) => e.date >= weekStart && e.date <= weekEnd)
  const taskSyncedCount = tasks.filter((t) => t.time).length

  // Day-by-day breakdown
  const daysOfWeek = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(now)
    d.setDate(now.getDate() - now.getDay() + i)
    const str = toDateStr(d)
    const dayTasks = tasks.filter((t) => t.date === str)
    return {
      label:     d.toLocaleDateString('he-IL', { weekday: 'short' }),
      total:     dayTasks.length,
      completed: dayTasks.filter((t) => t.is_completed).length,
    }
  })

  const maxTasks = Math.max(...daysOfWeek.map((d) => d.total), 1)

  return (
    <div className="flex flex-col gap-6 p-4 overflow-y-auto h-full animate-fade-in">
      <div>
        <h2 className="text-base font-semibold text-slate-800 dark:text-slate-100">סיכום שבועי</h2>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">הפרודוקטיביות שלך במבט אחד</p>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard
          label="הושלמו היום"
          value={`${completedToday}/${todayTasks.length}`}
          icon={CheckCircle2}
          color="bg-green-50 text-green-600"
        />
        <StatCard
          label="השבוע"
          value={`${completedWeek}/${weekTasks.length}`}
          sub={`${completionRate}% הושלם`}
          icon={TrendingUp}
          color="bg-blue-50 text-blue-600"
        />
        <StatCard
          label="אירועי לוח שנה"
          value={weekEvents.length}
          sub="השבוע"
          icon={CalendarDays}
          color="bg-orange-50 text-orange-600"
        />
        <StatCard
          label="משימות בלוח שנה"
          value={taskSyncedCount}
          sub="עם שעה מוגדרת"
          icon={Circle}
          color="bg-purple-50 text-purple-600"
        />
      </div>

      {/* Day-by-day bar chart */}
      <div className="rounded-xl border border-slate-100 dark:border-slate-700/50 bg-white dark:bg-slate-800 p-4">
        <h3 className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-4">משימות ליום</h3>
        <div className="flex items-end gap-2 h-24">
          {daysOfWeek.map((day) => {
            const totalH    = day.total > 0 ? (day.total / maxTasks) * 100 : 0
            const doneH     = day.total > 0 ? (day.completed / maxTasks) * 100 : 0
            const isToday   = day.label === new Date().toLocaleDateString('he-IL', { weekday: 'short' })
            return (
              <div key={day.label} className="flex-1 flex flex-col items-center gap-1">
                <div className="relative w-full flex-1 flex items-end">
                  {/* Total bar */}
                  <div
                    className="w-full rounded-t bg-slate-100 transition-all duration-500"
                    style={{ height: `${totalH}%`, minHeight: day.total > 0 ? 4 : 0 }}
                  />
                  {/* Completed overlay */}
                  <div
                    className="absolute bottom-0 left-0 right-0 rounded-t bg-blue-400 transition-all duration-500"
                    style={{ height: `${doneH}%`, minHeight: day.completed > 0 ? 4 : 0 }}
                  />
                </div>
                <span className={`text-[10px] font-medium ${isToday ? 'text-blue-500' : 'text-slate-400'}`}>
                  {day.label}
                </span>
              </div>
            )
          })}
        </div>
        <div className="flex items-center gap-3 mt-3">
          <span className="flex items-center gap-1 text-[10px] text-slate-500 dark:text-slate-400">
            <span className="h-2 w-2 rounded-full bg-blue-400 inline-block" /> הושלמו
          </span>
          <span className="flex items-center gap-1 text-[10px] text-slate-500 dark:text-slate-400">
            <span className="h-2 w-2 rounded-full bg-slate-100 dark:bg-slate-700 inline-block border border-slate-200 dark:border-slate-600" /> סה״כ
          </span>
        </div>
      </div>
    </div>
  )
}
