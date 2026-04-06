"use client";

import { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Select } from "@/components/ui/select";
import {
  HebrewSelectContent,
  HebrewSelectItem,
  HebrewSelectTrigger,
  HebrewSelectValue,
} from "@/components/ui/hebrew-select";
import { toDateStr } from "@/lib/date";
import { VoiceInputButton } from "@/components/ui/VoiceInputButton";
import type { ParsedVoiceInput } from "@/hooks/useVoiceInput";
import type { CalendarEvent, Task } from "@/types";

const DAY_OPTIONS = [
  { label: "ראשון", value: 0 },
  { label: "שני", value: 1 },
  { label: "שלישי", value: 2 },
  { label: "רביעי", value: 3 },
  { label: "חמישי", value: 4 },
  { label: "שישי", value: 5 },
  { label: "שבת", value: 6 },
];

function getDateForWeekday(dayIndex: number): string {
  const now = new Date();
  const diff = dayIndex - now.getDay();
  const target = new Date(now);
  target.setDate(now.getDate() + diff);
  return toDateStr(target);
}

function timeToMinutes(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}

function findConflict(
  date: string,
  startTime: string,
  endTime: string,
  events: CalendarEvent[],
  tasks: Task[],
  excludeTaskId?: string,
): string | null {
  const start = timeToMinutes(startTime);
  const end = timeToMinutes(endTime);

  const completedTaskIds = new Set(
    tasks.filter((t) => t.is_completed).map((t) => t.id),
  );

  for (const ev of events) {
    if (ev.date !== date) continue;
    if (
      ev.task_id &&
      (completedTaskIds.has(ev.task_id) || ev.task_id === excludeTaskId)
    ) {
      continue;
    }

    const evStart = timeToMinutes(ev.start_time);
    const evEnd = timeToMinutes(ev.end_time);
    if (start < evEnd && end > evStart) {
      return `חופף עם האירוע "${ev.title}" (${ev.start_time}-${ev.end_time})`;
    }
  }

  for (const task of tasks) {
    if (task.id === excludeTaskId) continue;
    if (task.is_completed) continue;
    if (task.date !== date || !task.time || !task.end_time) continue;

    const taskStart = timeToMinutes(task.time);
    const taskEnd = timeToMinutes(task.end_time);
    if (start < taskEnd && end > taskStart) {
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

  const initDay = () => {
    const dateStr = editTask?.date ?? initialDate ?? today;
    return new Date(`${dateStr}T00:00:00`).getDay();
  };

  const [title, setTitle] = useState(editTask?.title ?? "");
  const [description, setDescription] = useState(editTask?.description ?? "");
  const [dayIndex, setDayIndex] = useState<number>(initDay);
  const [time, setTime] = useState(editTask?.time ?? "");
  const [endTime, setEndTime] = useState(editTask?.end_time ?? "");
  const [isRecurring, setIsRecurring] = useState(
    editTask?.is_recurring ?? false,
  );
  const [conflict, setConflict] = useState<string | null>(null);
  const [timeError, setTimeError] = useState<string | null>(null);

  useEffect(() => {
    if (!editTask) return;

    setTitle(editTask.title);
    setDescription(editTask.description ?? "");
    setDayIndex(new Date(`${editTask.date}T00:00:00`).getDay());
    setTime(editTask.time ?? "");
    setEndTime(editTask.end_time ?? "");
    setIsRecurring(editTask.is_recurring ?? false);
  }, [editTask]);

  const applyParsed = (data: ParsedVoiceInput) => {
    if (data.title !== null) setTitle(data.title);
    if (data.description !== null) setDescription(data.description ?? "");
    if (data.dayIndex !== null) setDayIndex(data.dayIndex);
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

    if (endTime <= time) {
      setTimeError("שעת הסיום חייבת להיות אחרי שעת ההתחלה");
      setConflict(null);
      return;
    }

    setTimeError(null);

    const date = getDateForWeekday(dayIndex);
    const currentConflict = findConflict(
      date,
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
      date,
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
          <VoiceInputButton onParsed={applyParsed} />
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

      <div className="flex flex-col gap-1.5">
        <Label>יום</Label>
        <Select
          value={String(dayIndex)}
          onValueChange={(v) => setDayIndex(Number(v))}
        >
          <HebrewSelectTrigger>
            <HebrewSelectValue />
          </HebrewSelectTrigger>
          <HebrewSelectContent>
            {DAY_OPTIONS.map((day) => (
              <HebrewSelectItem key={day.value} value={String(day.value)}>
                {day.label}
              </HebrewSelectItem>
            ))}
          </HebrewSelectContent>
        </Select>
      </div>

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
          <span className="text-slate-400 text-sm flex-shrink-0">עד</span>
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
        <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-medium text-red-600">
          ⚠️ {timeError}
        </div>
      )}

      {conflict && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-medium text-red-600">
          ⚠️ {conflict}
        </div>
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
