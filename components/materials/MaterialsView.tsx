'use client'

import { useState } from 'react'
import { BookOpen } from 'lucide-react'
import { Button } from '@/components/ui/button'
import MaterialsPanel from '@/components/materials/MaterialsPanel'
import { parseTutorialTitle } from '@/components/materials/materials/materials-panel-utils'
import type { CalendarEvent } from '@/types'

interface MaterialsViewProps {
  tutorials: CalendarEvent[]
  events: CalendarEvent[]
}

interface CourseGroup {
  courseName: string
  /** One representative item per unique session type (הרצאה, תרגול, etc.) */
  sessionTypes: { type: string; item: CalendarEvent }[]
}

/**
 * Groups items by course name, then deduplicates within each course by session type.
 * A lecture that repeats weekly appears only once.
 */
function groupByCourse(items: CalendarEvent[]): CourseGroup[] {
  const courseMap = new Map<string, Map<string, CalendarEvent>>()

  for (const item of items) {
    const { courseName, type } = parseTutorialTitle(item.title)
    const typeKey = type || 'הרצאה'

    if (!courseMap.has(courseName)) courseMap.set(courseName, new Map())
    const typeMap = courseMap.get(courseName)!
    if (!typeMap.has(typeKey)) typeMap.set(typeKey, item)
  }

  return Array.from(courseMap.entries()).map(([courseName, typeMap]) => ({
    courseName,
    sessionTypes: Array.from(typeMap.entries()).map(([type, item]) => ({ type, item })),
  }))
}

export default function MaterialsView({ tutorials, events }: MaterialsViewProps) {
  const [selected, setSelected] = useState<CalendarEvent | null>(null)

  const allItems = [...tutorials, ...events]

  if (allItems.length === 0) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 text-slate-400">
        <BookOpen className="h-10 w-10 opacity-30" />
        <p className="text-sm">אין שיעורים עדיין</p>
        <p className="text-xs text-slate-300">הוסף הרצאות ותרגולים בלוח השבועי כדי לנהל חומרי לימוד</p>
      </div>
    )
  }

  const courses = groupByCourse(allItems)

  return (
    <>
      <div className="h-full overflow-y-auto px-4 py-5" dir="rtl">
        <h2 className="mb-4 text-base font-semibold text-slate-700">קורסים</h2>
        <div className="flex flex-col gap-4">
          {courses.map(({ courseName, sessionTypes }) => (
            <div key={courseName} className="rounded-xl border border-slate-100 bg-white shadow-sm overflow-hidden">
              {/* Course header */}
              <div className="border-b border-slate-100 bg-slate-50 px-4 py-2">
                <span className="text-sm font-semibold text-slate-700">{courseName}</span>
              </div>

              {/* One row per unique session type */}
              <div className="divide-y divide-slate-50">
                {sessionTypes.map(({ type, item }) => (
                  <div key={type} className="flex items-center justify-between px-4 py-3">
                    <span className="text-sm text-slate-600">{type}</span>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="gap-1.5 text-xs"
                      onClick={() => setSelected(item)}
                    >
                      <BookOpen className="h-3.5 w-3.5" />
                      חומרי לימוד
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {selected && (
        <MaterialsPanel
          tutorialId={selected.id}
          tutorialTitle={selected.title}
          onClose={() => setSelected(null)}
        />
      )}
    </>
  )
}
