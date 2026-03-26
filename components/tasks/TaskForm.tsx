"use client";

import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toDateStr } from "@/lib/date";
import type { Task, CalendarEvent } from "@/types";

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
  events: CalendarEvent[],
  tasks: Task[],
  excludeTaskId?: string,
): string | null {
  const start = timeToMinutes(startTime);
  const end = start + 60; // default 1hr block

  for (const ev of events) {
    if (ev.date !== date) continue;
    const evStart = timeToMinutes(ev.start_time);
    const evEnd = timeToMinutes(ev.end_time);
    if (start < evEnd && end > evStart) {
      return `חופף עם האירוע "${ev.title}" (${ev.start_time}–${ev.end_time})`;
    }
  }

  for (const task of tasks) {
    if (task.id === excludeTaskId) continue;
    if (task.date !== date || !task.time) continue;
    const taskStart = timeToMinutes(task.time);
    const taskEnd = taskStart + 60;
    if (start < taskEnd && end > taskStart) {
      return `חופף עם המשימה "${task.title}" (${task.time})`;
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
    return new Date(dateStr + "T00:00:00").getDay();
  };

  const [title, setTitle] = useState(editTask?.title ?? "");
  const [description, setDescription] = useState(editTask?.description ?? "");
  const [dayIndex, setDayIndex] = useState<number>(initDay);
  const [time, setTime] = useState(editTask?.time ?? "");
  const [conflict, setConflict] = useState<string | null>(null);

  useEffect(() => {
    if (editTask) {
      setTitle(editTask.title);
      setDescription(editTask.description ?? "");
      setDayIndex(new Date(editTask.date + "T00:00:00").getDay());
      setTime(editTask.time ?? "");
    }
  }, [editTask]);

  // Live conflict check
  useEffect(() => {
    if (!time) {
      setConflict(null);
      return;
    }
    const date = getDateForWeekday(dayIndex);
    const result = findConflict(date, time, events, tasks, editTask?.id);
    setConflict(result);
  }, [dayIndex, time, events, tasks, editTask?.id]);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!title.trim()) return;
    if (conflict) return;
    const date = getDateForWeekday(dayIndex);
    onSubmit({
      title: title.trim(),
      description: description.trim() || null,
      date,
      time: time || null,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="task-title">כותרת משימה *</Label>
        <Input
          id="task-title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="מה צריך לעשות?"
          autoFocus
          required
        />
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
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {DAY_OPTIONS.map((d) => (
              <SelectItem key={d.value} value={String(d.value)}>
                {d.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="task-time">
          שעה
          <span className="ms-1 text-xs text-slate-400 font-normal">
            (מוסיף ללוח שנה)
          </span>
        </Label>
        <Input
          id="task-time"
          type="time"
          value={time}
          onChange={(e) => setTime(e.target.value)}
        />
      </div>

      {conflict && (
        <div className="rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-xs text-red-600 font-medium">
          ⚠️ {conflict}
        </div>
      )}

      <div className="flex gap-2 justify-end pt-1">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          disabled={isLoading}
        >
          ביטול
        </Button>
        <Button
          type="submit"
          disabled={isLoading || !title.trim() || !!conflict}
        >
          {isLoading ? "שומר..." : editTask ? "שמור שינויים" : "הוסף משימה"}
        </Button>
      </div>
    </form>
  );
}
