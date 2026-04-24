"use client"

import * as React from "react"
import { CalendarIcon } from "lucide-react"
import { he } from "date-fns/locale"
import { fromDateStr, toDateStr } from "@/lib/date"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"

interface DatePickerFieldProps {
  label: string
  /** YYYY-MM-DD */
  value: string
  onChange: (v: string) => void
  /** Earliest selectable date. Defaults to today (00:00). */
  minDate?: Date
}

export function DatePickerField({ label, value, onChange, minDate }: DatePickerFieldProps) {
  const [open, setOpen] = React.useState(false)

  const today = React.useMemo(() => {
    const d = new Date()
    d.setHours(0, 0, 0, 0)
    return d
  }, [])

  const selected = fromDateStr(value)
  const disabledBefore = minDate ?? today

  const displayLabel = selected.toLocaleDateString("he-IL", {
    weekday: "long",
    day: "numeric",
    month: "long",
  })

  return (
    <div className="flex flex-col gap-1.5">
      <Label>{label}</Label>

      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            aria-label={`בחר תאריך – ${displayLabel}`}
            className={cn(
              // match other form inputs in the project
              "flex w-full items-center gap-2 rounded-md border bg-white dark:bg-slate-800 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 shadow-sm",
              "transition-colors hover:border-slate-300 dark:hover:border-slate-600",
              "focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-0",
              open
                ? "border-blue-500 ring-2 ring-blue-500 ring-offset-0"
                : "border-slate-200 dark:border-slate-700",
            )}
          >
            <CalendarIcon className="h-4 w-4 text-slate-400 shrink-0" />
            <span className="flex-1 text-right">{displayLabel}</span>
          </button>
        </PopoverTrigger>

        {/* Mobile: full-width below trigger. Desktop: auto-width centred. */}
        <PopoverContent
          dir="rtl"
          align="center"
          sideOffset={6}
          className={cn(
            "p-0 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-xl",
            // full-width on small screens so it doesn't clip RTL
            "w-[calc(100vw-2rem)] max-w-[320px] sm:w-auto",
          )}
        >
          <Calendar
            mode="single"
            selected={selected}
            onSelect={(day) => {
              if (day) {
                onChange(toDateStr(day))
                setOpen(false)
              }
            }}
            disabled={(day) => day < disabledBefore}
            defaultMonth={selected}
            locale={he}
            dir="rtl"
            fixedWeeks
          />
        </PopoverContent>
      </Popover>
    </div>
  )
}
