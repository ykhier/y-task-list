'use client'

import { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Trash2 } from 'lucide-react'
import {
  Select,
} from '@/components/ui/select'
import {
  HebrewSelectContent,
  HebrewSelectItem,
  HebrewSelectTrigger,
  HebrewSelectValue,
} from '@/components/ui/hebrew-select'
import { defaultEndTime, toDateStr } from '@/lib/date'
import type { CalendarEvent } from '@/types'

const COLOR_OPTIONS = [
  { label: 'כחול',  value: 'blue' },
  { label: 'ירוק',  value: 'green' },
  { label: 'כתום',  value: 'orange' },
  { label: 'סגול',  value: 'purple' },
  { label: 'אדום',  value: 'red' },
]

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

type EventData = Omit<CalendarEvent, 'id' | 'user_id' | 'created_at'>

interface EventModalProps {
  open: boolean
  onClose: () => void
  initialDate?: string
  initialHour?: number
  editEvent?: CalendarEvent | null
  onSubmit: (data: EventData, tutorial?: EventData) => Promise<void>
  onDelete?: (id: string) => Promise<void>
  error?: string | null
  suggestion?: string | null
  isLoading?: boolean
}

export default function EventModal({
  open,
  onClose,
  initialDate,
  initialHour,
  editEvent,
  suggestion,
  onSubmit,
  onDelete,
  error,
  isLoading,
}: EventModalProps) {
  const pad = (n: number) => String(n).padStart(2, '0')
  const defaultStart = initialHour != null ? `${pad(initialHour)}:00` : '09:00'

  const [title, setTitle]         = useState(editEvent?.title ?? '')
  const [dayIndex, setDayIndex]   = useState<number>(
    editEvent ? getDayIndexFromDate(editEvent.date)
    : initialDate ? getDayIndexFromDate(initialDate)
    : new Date().getDay()
  )
  const [startTime, setStartTime] = useState(editEvent?.start_time ?? defaultStart)
  const [endTime, setEndTime]     = useState(editEvent?.end_time ?? defaultEndTime(defaultStart))
  const [color, setColor]         = useState(editEvent?.color ?? 'blue')

  const [isRecurring, setIsRecurring]           = useState(editEvent?.is_recurring ?? false)

  const [tutorialEnabled, setTutorialEnabled]         = useState(false)
  const [tutorialDayIndex, setTutorialDayIndex]       = useState<number>(new Date().getDay())
  const [tutorialStart, setTutorialStart]             = useState('11:00')
  const [tutorialEnd, setTutorialEnd]                 = useState('12:00')
  const [tutorialIsRecurring, setTutorialIsRecurring] = useState(false)

  useEffect(() => {
    if (editEvent) {
      setTitle(editEvent.title)
      setDayIndex(getDayIndexFromDate(editEvent.date))
      setStartTime(editEvent.start_time)
      setEndTime(editEvent.end_time)
      setColor(editEvent.color ?? 'blue')
      setIsRecurring(editEvent.is_recurring ?? false)
    } else {
      const s = initialHour != null ? `${pad(initialHour)}:00` : '09:00'
      const initDay = initialDate ? getDayIndexFromDate(initialDate) : new Date().getDay()
      setTitle('')
      setDayIndex(initDay)
      setStartTime(s)
      const end = defaultEndTime(s)
      setEndTime(end)
      setTutorialDayIndex(initDay)
      setTutorialStart(end)
      setTutorialEnd(defaultEndTime(end))
      setIsRecurring(false)
    }
    setTutorialEnabled(false)
    setTutorialIsRecurring(false)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editEvent, initialDate, initialHour, open])

  const handleStartChange = (val: string) => {
    setStartTime(val)
    if (!editEvent) {
      const newEnd = defaultEndTime(val)
      setEndTime(newEnd)
      setTutorialStart(newEnd)
      setTutorialEnd(defaultEndTime(newEnd))
    }
  }

  const handleDayChange = (val: string) => {
    const idx = Number(val)
    setDayIndex(idx)
    setTutorialDayIndex(idx)
  }

  const handleSubmit = async (e: React.SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!title.trim()) return
    const date = getDateForWeekday(dayIndex)

    const lectureData: EventData = {
      title:        title.trim(),
      date,
      start_time:   startTime,
      end_time:     endTime,
      source:       'manual',
      task_id:      null,
      color,
      is_recurring: isRecurring,
    }

    const tutorialData: EventData | undefined =
      tutorialEnabled && !editEvent
        ? {
            title:        `תרגול – ${title.trim()}`,
            date:         getDateForWeekday(tutorialDayIndex),
            start_time:   tutorialStart,
            end_time:     tutorialEnd,
            source:       'manual',
            task_id:      null,
            color:        'orange',
            is_recurring: tutorialIsRecurring,
          }
        : undefined

    await onSubmit(lectureData, tutorialData)
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{editEvent ? 'ערוך הרצאה' : 'הרצאה חדשה'}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {/* Lecture fields */}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="ev-title">כותרת *</Label>
            <Input
              id="ev-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="שם ההרצאה"
              autoFocus
              required
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label>יום</Label>
            <Select value={String(dayIndex)} onValueChange={handleDayChange}>
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
              <Label htmlFor="ev-start">שעת התחלה</Label>
              <Input id="ev-start" type="time" value={startTime}
                onChange={(e) => handleStartChange(e.target.value)} required />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="ev-end">שעת סיום</Label>
              <Input id="ev-end" type="time" value={endTime}
                onChange={(e) => setEndTime(e.target.value)} required />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label>צבע</Label>
            <Select value={color} onValueChange={setColor}>
              <HebrewSelectTrigger><HebrewSelectValue /></HebrewSelectTrigger>
              <HebrewSelectContent>
                {COLOR_OPTIONS.map((c) => (
                  <HebrewSelectItem key={c.value} value={c.value}>{c.label}</HebrewSelectItem>
                ))}
              </HebrewSelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-2">
            <Checkbox
              id="lecture-recurring"
              checked={isRecurring}
              onCheckedChange={(v) => setIsRecurring(!!v)}
            />
            <Label htmlFor="lecture-recurring" className="cursor-pointer">
              קבוע כל שבוע
            </Label>
          </div>

          {/* Tutorial section — only on create */}
          {!editEvent && (
            <div className="flex flex-col gap-3 border border-slate-200 rounded-lg p-3 bg-slate-50">
              <div className="flex items-center gap-2">
                <Checkbox
                  id="tutorial-toggle"
                  checked={tutorialEnabled}
                  onCheckedChange={(v) => setTutorialEnabled(!!v)}
                />
                <Label htmlFor="tutorial-toggle" className="cursor-pointer font-medium">
                  הוסף תרגול
                </Label>
              </div>

              {tutorialEnabled && (
                <div className="flex flex-col gap-3">
                  <div className="flex flex-col gap-1.5">
                    <Label>יום תרגול</Label>
                    <Select
                      value={String(tutorialDayIndex)}
                      onValueChange={(v) => setTutorialDayIndex(Number(v))}
                    >
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
                      <Label htmlFor="tut-start">התחלת תרגול</Label>
                      <Input
                        id="tut-start"
                        type="time"
                        value={tutorialStart}
                        onChange={(e) => {
                          setTutorialStart(e.target.value)
                          setTutorialEnd(defaultEndTime(e.target.value))
                        }}
                        required
                      />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <Label htmlFor="tut-end">סיום תרגול</Label>
                      <Input id="tut-end" type="time" value={tutorialEnd}
                        onChange={(e) => setTutorialEnd(e.target.value)} required />
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="tutorial-recurring"
                      checked={tutorialIsRecurring}
                      onCheckedChange={(v) => setTutorialIsRecurring(!!v)}
                    />
                    <Label htmlFor="tutorial-recurring" className="cursor-pointer">
                      קבוע כל שבוע
                    </Label>
                  </div>
                </div>
              )}
            </div>
          )}

          {suggestion && (
            <div className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-md px-3 py-2 flex flex-col gap-1">
              <p className="font-semibold">שים לב — קיים תוכן קבוע מהשבוע הקודם</p>
              <p>{suggestion}</p>
              <p className="text-xs text-amber-600">{'לחץ "המשך בכל זאת" כדי להוסיף ידנית, או סגור ולחץ "צרף קבועות".'}</p>
            </div>
          )}

          {error && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2">
              {error}
            </p>
          )}

          <div className="flex gap-2 justify-between pt-1">
            {editEvent && onDelete ? (
              <Button
                type="button" variant="outline"
                className="text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700"
                disabled={isLoading}
                onClick={async () => { await onDelete(editEvent.id); onClose() }}
              >
                <Trash2 className="h-4 w-4" />
                מחק
              </Button>
            ) : <span />}
            <div className="flex gap-2">
              <Button type="button" variant="outline" onClick={onClose} disabled={isLoading}>
                ביטול
              </Button>
              <Button type="submit" disabled={isLoading || !title.trim()}>
                {isLoading ? 'שומר...' : suggestion ? 'המשך בכל זאת' : editEvent ? 'שמור שינויים' : 'צור הרצאה'}
              </Button>
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
