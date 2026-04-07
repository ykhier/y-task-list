"use client"

import * as React from "react"
import { ChevronRight, ChevronLeft } from "lucide-react"
import { DayPicker } from "react-day-picker"
import { cn } from "@/lib/utils"

export type CalendarProps = React.ComponentProps<typeof DayPicker>

function Calendar({ className, classNames, showOutsideDays = true, ...props }: CalendarProps) {
  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      className={cn("p-3 select-none", className)}
      classNames={{
        months: "flex flex-col",
        month: "space-y-3",
        caption: "flex justify-center relative items-center h-8",
        caption_label: "text-sm font-semibold text-slate-800",
        nav: "flex items-center gap-1",
        nav_button: cn(
          "inline-flex items-center justify-center rounded-md w-7 h-7",
          "border border-slate-200 bg-white text-slate-600",
          "hover:bg-slate-50 hover:text-slate-900 transition-colors",
          "disabled:opacity-30 disabled:cursor-not-allowed",
        ),
        nav_button_previous: "absolute right-0",
        nav_button_next: "absolute left-0",
        table: "w-full border-collapse",
        head_row: "flex",
        head_cell: "text-slate-400 rounded-md w-9 h-8 font-medium text-[0.75rem] flex items-center justify-center",
        row: "flex w-full mt-1",
        cell: "relative w-9 h-9 flex items-center justify-center p-0 text-sm",
        day: cn(
          "w-9 h-9 rounded-full font-normal text-slate-800 transition-colors",
          "hover:bg-slate-100 hover:text-slate-900",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500",
        ),
        day_selected:
          "!bg-blue-600 !text-white hover:!bg-blue-700 hover:!text-white font-bold shadow-sm",
        day_today: "border-2 border-blue-400 font-bold text-blue-600",
        day_outside: "text-slate-300 hover:bg-transparent hover:text-slate-300 pointer-events-none",
        day_disabled: "text-slate-300 line-through cursor-not-allowed opacity-40 hover:bg-transparent hover:text-slate-300",
        day_range_middle: "rounded-none",
        day_hidden: "invisible",
        ...classNames,
      }}
      components={{
        // RTL: right = previous month, left = next month
        IconLeft: () => <ChevronRight className="h-4 w-4" />,
        IconRight: () => <ChevronLeft className="h-4 w-4" />,
      }}
      {...props}
    />
  )
}
Calendar.displayName = "Calendar"

export { Calendar }
