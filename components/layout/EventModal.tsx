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
import { Select } from '@/components/ui/select'
import {
  HebrewSelectContent,
  HebrewSelectItem,
  HebrewSelectTrigger,
  HebrewSelectValue,
} from '@/components/ui/hebrew-select'
import { defaultEndTime, toDateStr } from '@/lib/date'
import { VoiceInputButton } from '@/components/ui/VoiceInputButton'
import type { ParsedVoiceInput } from '@/hooks/useVoiceInput'
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
  const target = new Date(now)
  target.setDate(now.getDate() + (dayIndex - now.getDay()))
  return toDateStr(target)
}

function getDayIndexFromDate(dateStr: string): number {
  return new Date(dateStr + 'T00:00:00').getDay()
}

// ── Shared sub-components ────────────────────────────────

function DaySelect({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label>{label}</Label>
      <Select value={String(value)} onValueChange={(v) => onChange(Number(v))}>
        <HebrewSelectTrigger><HebrewSelectValue /></HebrewSelectTrigger>
        <HebrewSelectContent>
          {DAY_OPTIONS.map((d) => (
            <HebrewSelectItem key={d.value} value={String(d.value)}>{d.label}</HebrewSelectItem>
          ))}
        </HebrewSelectContent>
      </Select>
    </div>
  )
}

function TimeRangeFields({
  startId, endId,
  startLabel, endLabel,
  startValue, endValue,
  onStartChange, onEndChange,
}: {
  startId: string; endId: string
  startLabel: string; endLabel: string
  startValue: string; endValue: string
  onStartChange: (v: string) => void
  onEndChange: (v: string) => void
}) {
  return (
    <div className="grid grid-cols-2 gap-3">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor={startId}>{startLabel}</Label>
        <Input id={startId} type="time" value={startValue}
          onChange={(e) => onStartChange(e.target.value)} required />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor={endId}>{endLabel}</Label>
        <Input id={endId} type="time" value={endValue}
          onChange={(e) => onEndChange(e.target.value)} required />
      </div>
    </div>
  )
}

function RecurringCheckbox({ id, checked, onChange }: { id: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center gap-2">
      <Checkbox id={id} checked={checked} onCheckedChange={(v) => onChange(!!v)} />
      <Label htmlFor={id} className="cursor-pointer">קבוע כל שבוע</Label>
    </div>
  )
}

// ────────────────────────────────────────────────────────

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
  const [isRecurring, setIsRecurring] = useState(editEvent?.is_recurring ?? false)

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

  const handleDayChange = (idx: number) => {
    setDayIndex(idx)
    setTutorialDayIndex(idx)
  }

  const applyParsed = (data: ParsedVoiceInput) => {
    if (data.title !== null) setTitle(data.title)
    if (data.dayIndex !== null) handleDayChange(data.dayIndex)
    if (data.startTime !== null) handleStartChange(data.startTime)
    if (data.endTime !== null) setEndTime(data.endTime)
    if (data.isRecurring !== null) setIsRecurring(data.isRecurring)
    if (data.color !== null) setColor(data.color)
    if (data.tutorial !== null) {
      setTutorialEnabled(true)
      if (data.tutorial.dayIndex !== null) setTutorialDayIndex(data.tutorial.dayIndex)
      if (data.tutorial.startTime !== null) setTutorialStart(data.tutorial.startTime)
      if (data.tutorial.endTime !== null) setTutorialEnd(data.tutorial.endTime)
      if (data.tutorial.isRecurring !== null) setTutorialIsRecurring(data.tutorial.isRecurring)
    }
  }

  const handleSubmit = async (e: React.SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!title.trim()) return

    const lectureData: EventData = {
      title:        title.trim(),
      date:         getDateForWeekday(dayIndex),
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
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{editEvent ? 'ערוך הרצאה' : 'הרצאה חדשה'}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {/* Title */}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="ev-title">כותרת *</Label>
            <div className="flex gap-2">
              <Input
                id="ev-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="שם ההרצאה"
                autoFocus
                required
                className="flex-1"
              />
              <VoiceInputButton onParsed={applyParsed} />
            </div>
          </div>

          {/* Day */}
          <DaySelect label="יום" value={dayIndex} onChange={handleDayChange} />

          {/* Times */}
          <TimeRangeFields
            startId="ev-start" endId="ev-end"
            startLabel="שעת התחלה" endLabel="שעת סיום"
            startValue={startTime} endValue={endTime}
            onStartChange={handleStartChange}
            onEndChange={setEndTime}
          />

          {/* Color */}
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

          {/* Recurring */}
          <RecurringCheckbox id="lecture-recurring" checked={isRecurring} onChange={setIsRecurring} />

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
                  <DaySelect label="יום תרגול" value={tutorialDayIndex} onChange={setTutorialDayIndex} />
                  <TimeRangeFields
                    startId="tut-start" endId="tut-end"
                    startLabel="התחלת תרגול" endLabel="סיום תרגול"
                    startValue={tutorialStart} endValue={tutorialEnd}
                    onStartChange={(v) => { setTutorialStart(v); setTutorialEnd(defaultEndTime(v)) }}
                    onEndChange={setTutorialEnd}
                  />
                  <RecurringCheckbox id="tutorial-recurring" checked={tutorialIsRecurring} onChange={setTutorialIsRecurring} />
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
