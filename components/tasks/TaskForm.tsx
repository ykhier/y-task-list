"use client";

import { useEffect, useRef, useState } from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { toDateStr, nextOccurrenceOfDay } from "@/lib/date";
import { DatePickerField } from "@/components/ui/DatePickerField";
import { VoiceInputButton } from "@/components/ui/VoiceInputButton";
import type { ParsedVoiceInput } from "@/hooks/useVoiceInput";
import type { CalendarEvent, Task } from "@/types";

function timeToMinutes(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}

function nextDayStr(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  d.setDate(d.getDate() + 1);
  return toDateStr(d);
}

/** Splits a time range into {date, s, e} segments (e > s always), handling midnight crossing. */
function toSegments(dateStr: string, startTime: string, endTime: string) {
  const s = timeToMinutes(startTime);
  const e = timeToMinutes(endTime);
  if (e === 0) return [{ date: dateStr, s, e: 24 * 60 }];
  if (s >= e)
    return [
      { date: dateStr, s, e: 24 * 60 },
      { date: nextDayStr(dateStr), s: 0, e },
    ];
  return [{ date: dateStr, s, e }];
}

function segmentsOverlap(
  d1: string, t1s: string, t1e: string,
  d2: string, t2s: string, t2e: string,
): boolean {
  const segs1 = toSegments(d1, t1s, t1e);
  const segs2 = toSegments(d2, t2s, t2e);
  return segs1.some((a) =>
    segs2.some((b) => a.date === b.date && a.s < b.e && a.e > b.s),
  );
}

function findConflict(
  date: string,
  startTime: string,
  endTime: string,
  events: CalendarEvent[],
  tasks: Task[],
  excludeTaskId?: string,
): string | null {
  const completedTaskIds = new Set(
    tasks.filter((t) => t.is_completed).map((t) => t.id),
  );

  for (const ev of events) {
    if (
      ev.task_id &&
      (completedTaskIds.has(ev.task_id) || ev.task_id === excludeTaskId)
    )
      continue;
    if (segmentsOverlap(date, startTime, endTime, ev.date, ev.start_time, ev.end_time)) {
      return `חופף עם האירוע "${ev.title}" (${ev.start_time.slice(0, 5)}-${ev.end_time.slice(0, 5)})`;
    }
  }

  for (const task of tasks) {
    if (task.id === excludeTaskId || task.is_completed) continue;
    if (!task.time || !task.end_time) continue;
    if (segmentsOverlap(date, startTime, endTime, task.date, task.time, task.end_time)) {
      return `חופף עם המשימה "${task.title}" (${task.time}-${task.end_time})`;
    }
  }

  return null;
}

interface TaskFormProps {
  initialDate?: string;
  editTask?: Task | null;
  events?: CalendarEvent[];
  tasks?: Task[];
  onSubmit: (
    data: Omit<Task, "id" | "user_id" | "created_at" | "is_completed">,
  ) => void;
  onCancel: () => void;
  isLoading?: boolean;
}

export default function TaskForm({
  initialDate,
  editTask,
  events = [],
  tasks = [],
  onSubmit,
  onCancel,
  isLoading,
}: TaskFormProps) {
  const today = toDateStr(new Date());

  const [title, setTitle] = useState(editTask?.title ?? "");
  const [description, setDescription] = useState(editTask?.description ?? "");
  const [selectedDate, setSelectedDate] = useState<string>(
    editTask?.date ?? initialDate ?? today,
  );
  const [time, setTime] = useState(editTask?.time ?? "");
  const [endTime, setEndTime] = useState(editTask?.end_time ?? "");
  const [isRecurring, setIsRecurring] = useState(
    editTask?.is_recurring ?? false,
  );
  const [conflict, setConflict] = useState<string | null>(null);
  const [timeError, setTimeError] = useState<string | null>(null);
  const [voiceFeedback, setVoiceFeedback] = useState<string | null>(null);
  const voiceFeedbackTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleVoiceFeedback = (text: string) => {
    if (voiceFeedbackTimerRef.current) clearTimeout(voiceFeedbackTimerRef.current);
    setVoiceFeedback(text);
    voiceFeedbackTimerRef.current = setTimeout(() => setVoiceFeedback(null), 4500);
  };

  useEffect(() => {
    if (!editTask) return;
    setTitle(editTask.title);
    setDescription(editTask.description ?? "");
    setSelectedDate(editTask.date);
    setTime(editTask.time ?? "");
    setEndTime(editTask.end_time ?? "");
    setIsRecurring(editTask.is_recurring ?? false);
  }, [editTask]);

  const applyParsed = (data: ParsedVoiceInput) => {
    if (data.title !== null) setTitle(data.title);
    if (data.description !== null) setDescription(data.description ?? "");
    if (data.dayIndex !== null) setSelectedDate(nextOccurrenceOfDay(data.dayIndex));
    if (data.startTime !== null) {
      setTime(data.startTime);
      setConflict(null);
    }
    if (data.endTime !== null) {
      setEndTime(data.endTime);
      setConflict(null);
    }
    if (data.isRecurring !== null) setIsRecurring(data.isRecurring);
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!time || !endTime) {
      setTimeError("יש למלא שעת התחלה ושעת סיום");
      return;
    }

    if (endTime === time) {
      setTimeError("שעת הסיום לא יכולה להיות זהה לשעת ההתחלה");
      setConflict(null);
      return;
    }

    setTimeError(null);

    const currentConflict = findConflict(
      selectedDate,
      time,
      endTime,
      events,
      tasks,
      editTask?.id,
    );
    setConflict(currentConflict);

    if (!title.trim() || currentConflict) return;

    onSubmit({
      title: title.trim(),
      description: description.trim() || null,
      date: selectedDate,
      time,
      end_time: endTime,
      is_recurring: isRecurring,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="task-title">כותרת משימה *</Label>
        <div className="flex gap-2">
          <Input
            id="task-title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="מה צריך לעשות?"
            autoFocus
            required
            className="flex-1"
          />
          <VoiceInputButton onParsed={applyParsed} onFeedback={handleVoiceFeedback} />
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="task-desc">תיאור</Label>
        <Textarea
          id="task-desc"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="פרטים נוספים..."
          rows={2}
        />
      </div>

      <DatePickerField
        label="יום"
        value={selectedDate}
        onChange={setSelectedDate}
      />

      <div className="flex flex-col gap-1.5">
        <Label>
          שעות *
          <span className="ms-1 text-xs text-slate-400 font-normal">
            (מוסיף ללוח שנה)
          </span>
        </Label>
        <div className="flex items-center gap-2">
          <Input
            id="task-time"
            type="time"
            value={time}
            onChange={(e) => {
              setTime(e.target.value);
              setConflict(null);
            }}
            required
            className="flex-1"
          />
          <span className="text-slate-400 dark:text-slate-500 text-sm flex-shrink-0">עד</span>
          <Input
            id="task-end-time"
            type="time"
            value={endTime}
            onChange={(e) => {
              setEndTime(e.target.value);
              setConflict(null);
            }}
            required
            className="flex-1"
          />
        </div>
      </div>

      <div className="flex items-center gap-2">
        <Checkbox
          id="task-recurring"
          checked={isRecurring}
          onCheckedChange={(value) => setIsRecurring(!!value)}
        />
        <Label htmlFor="task-recurring" className="cursor-pointer font-normal">
          חוזר כל שבוע
        </Label>
      </div>

      {timeError && (
        <div className="rounded-lg border border-red-200 dark:border-red-700/40 bg-red-50 dark:bg-red-950/30 px-3 py-2 text-xs font-medium text-red-600 dark:text-red-400">
          ⚠️ {timeError}
        </div>
      )}

      {conflict && (
        <div className="rounded-lg border border-red-200 dark:border-red-700/40 bg-red-50 dark:bg-red-950/30 px-3 py-2 text-xs font-medium text-red-600 dark:text-red-400">
          ⚠️ {conflict}
        </div>
      )}

      {voiceFeedback && (
        <p className="rounded-md px-3 py-1.5 text-xs bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-700/40 text-right">
          {voiceFeedback}
        </p>
      )}
      <div className="flex justify-end gap-2 pt-1">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          disabled={isLoading}
        >
          ביטול
        </Button>
        <Button type="submit" disabled={isLoading || !title.trim()}>
          {isLoading ? "שומר..." : editTask ? "שמור שינויים" : "הוסף משימה"}
        </Button>
      </div>
    </form>
  );
}
