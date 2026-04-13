'use client'

import { useState } from 'react'
import { BookOpen, Clock } from 'lucide-react'
import { Button } from '@/components/ui/button'
import MaterialsPanel from '@/components/materials/MaterialsPanel'
import { parseTutorialTitle } from '@/components/materials/materials/materials-panel-utils'
import type { CalendarEvent } from '@/types'

interface MaterialsViewProps {
  tutorials: CalendarEvent[]
  events: CalendarEvent[]
}


/** Group items by course name, preserving first-occurrence order */
function groupByCourse(items: CalendarEvent[]): { courseName: string; items: CalendarEvent[] }[] {
  const map = new Map<string, CalendarEvent[]>()
  for (const item of items) {
    const { courseName } = parseTutorialTitle(item.title)
    if (!map.has(courseName)) map.set(courseName, [])
    map.get(courseName)!.push(item)
  }
  return Array.from(map.entries()).map(([courseName, items]) => ({ courseName, items }))
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
          {courses.map(({ courseName, items }) => (
            <div key={courseName} className="rounded-xl border border-slate-100 bg-white shadow-sm overflow-hidden">
              {/* Course header */}
              <div className="border-b border-slate-100 bg-slate-50 px-4 py-2">
                <span className="text-sm font-semibold text-slate-700">קורס {courseName}</span>
              </div>

              {/* Items within course */}
              <div className="divide-y divide-slate-50">
                {items.map((item) => {
                  const { type } = parseTutorialTitle(item.title)
                  const isTutorial = item.source === 'tutorial'
                  return (
                    <div
                      key={item.id}
                      className="flex items-center justify-between px-4 py-2.5"
                    >
                      <div className="flex flex-col gap-0.5">
                        <span className="text-xs font-medium text-slate-600">
                          {type || (isTutorial ? 'הרצאה' : 'הרצאה')}
                        </span>
                        <span className="flex items-center gap-1 text-xs text-slate-400">
                          <Clock className="h-3 w-3" />
                          {item.date}&nbsp;|&nbsp;{item.start_time.slice(0, 5)}–{item.end_time.slice(0, 5)}
                        </span>
                      </div>

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
                  )
                })}
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
