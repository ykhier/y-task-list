'use client'

import { useState, useEffect } from 'react'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Trash2 } from 'lucide-react'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Select,
} from '@/components/ui/select'
import {
  HebrewSelectContent,
  HebrewSelectItem,
  HebrewSelectTrigger,
  HebrewSelectValue,
} from '@/components/ui/hebrew-select'
import { toDateStr } from '@/lib/date'
import type { CalendarEvent } from '@/types'

const DAY_OPTIONS = [
  { label: 'ראשון',  value: 0 },
  { label: 'שני',    value: 1 },
  { label: 'שלישי', value: 2 },
  { label: 'רביעי', value: 3 },
  { label: 'חמישי', value: 4 },
  { label: 'שישי',  value: 5 },
  { label: 'שבת',   value: 6 },
]

function getDateForWeekday(dayIndex: number): string {
  const now = new Date()
  const diff = dayIndex - now.getDay()
  const target = new Date(now)
  target.setDate(now.getDate() + diff)
  return toDateStr(target)
}

function getDayIndexFromDate(dateStr: string): number {
  return new Date(dateStr + 'T00:00:00').getDay()
}

interface TutorialModalProps {
  open: boolean
  tutorial: CalendarEvent | null
  onClose: () => void
  onSave: (id: string, data: { date: string; start_time: string; end_time: string; is_recurring: boolean }) => Promise<void>
  onDelete: (id: string) => Promise<void>
}

export default function TutorialModal({ open, tutorial, onClose, onSave, onDelete }: TutorialModalProps) {
  const [dayIndex, setDayIndex]     = useState(0)
  const [startTime, setStartTime]   = useState('10:00')
  const [endTime, setEndTime]       = useState('11:00')
  const [isRecurring, setIsRecurring] = useState(false)
  const [saving, setSaving]         = useState(false)

  useEffect(() => {
    if (tutorial) {
      setDayIndex(getDayIndexFromDate(tutorial.date))
      setStartTime(tutorial.start_time)
      setEndTime(tutorial.end_time)
      setIsRecurring(tutorial.is_recurring ?? false)
    }
  }, [tutorial, open])

  if (!tutorial) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    await onSave(tutorial.id, {
      date:         getDateForWeekday(dayIndex),
      start_time:   startTime,
      end_time:     endTime,
      is_recurring: isRecurring,
    })
    setSaving(false)
    onClose()
  }

  const handleDelete = () => {
    onClose()
    void onDelete(tutorial.id)
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>ערוך תרגול</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <p className="text-sm text-slate-500">{tutorial.title}</p>

          <div className="flex flex-col gap-1.5">
            <Label>יום</Label>
            <Select value={String(dayIndex)} onValueChange={(v) => setDayIndex(Number(v))}>
              <HebrewSelectTrigger><HebrewSelectValue /></HebrewSelectTrigger>
              <HebrewSelectContent>
                {DAY_OPTIONS.map((d) => (
                  <HebrewSelectItem key={d.value} value={String(d.value)}>{d.label}</HebrewSelectItem>
                ))}
              </HebrewSelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="tut-start">שעת התחלה</Label>
              <Input id="tut-start" type="time" value={startTime}
                onChange={(e) => setStartTime(e.target.value)} required />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="tut-end">שעת סיום</Label>
              <Input id="tut-end" type="time" value={endTime}
                onChange={(e) => setEndTime(e.target.value)} required />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Checkbox
              id="tut-recurring"
              checked={isRecurring}
              onCheckedChange={(v) => setIsRecurring(!!v)}
            />
            <Label htmlFor="tut-recurring" className="cursor-pointer">
              קבוע כל שבוע
            </Label>
          </div>

          <div className="flex gap-2 justify-between pt-1">
            <Button
              type="button" variant="outline"
              className="text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700"
              disabled={saving}
              onClick={handleDelete}
            >
              <Trash2 className="h-4 w-4" />
              מחק
            </Button>
            <div className="flex gap-2">
              <Button type="button" variant="outline" onClick={onClose} disabled={saving}>
                ביטול
              </Button>
              <Button type="submit" disabled={saving}>
                {saving ? 'שומר...' : 'שמור'}
              </Button>
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
