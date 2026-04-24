"use client";

import { useMemo, useRef, useState } from "react";
import { CheckCircle2 } from "lucide-react";
import Spinner from "@/components/ui/Spinner";
import TaskItem from "./TaskItem";
import TaskListDialogs from "./task-list/TaskListDialogs";
import TaskListHeader from "./task-list/TaskListHeader";
import TaskStats from "./task-list/TaskStats";
import {
  formatMinutesLabel,
  getTaskStatsSummary,
} from "./task-list/task-stats-utils";
import { toDateStr } from "@/lib/date";
import {
  getFilteredTasks,
  type TaskFormPayload,
} from "./task-list/task-list-utils";
import type { CalendarEvent, Task, TaskFilter } from "@/types";

interface TaskListProps {
  tasks: Task[];
  events?: CalendarEvent[];
  selectedDate?: string;
  isLoading?: boolean;
  onAdd: (data: TaskFormPayload) => Promise<void>;
  onToggle: (id: string, completed: boolean) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onEdit: (id: string, data: Partial<Task>) => Promise<void>;
  onBeforeAdd?: (
    date: string,
    time?: string | null,
    endTime?: string | null,
  ) => string | null;
}

export default function TaskList({
  tasks,
  events = [],
  selectedDate,
  isLoading,
  onAdd,
  onToggle,
  onDelete,
  onEdit,
  onBeforeAdd,
}: TaskListProps) {
  const [filter, setFilter] = useState<TaskFilter>(
    selectedDate ? "all" : "today",
  );
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [saving, setSaving] = useState(false);
  const [addSuggestion, setAddSuggestion] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const addSuggestionShown = useRef(false);

  const today = toDateStr(new Date());
  const filtered = useMemo(
    () => getFilteredTasks(tasks, filter, selectedDate, today),
    [tasks, filter, selectedDate, today],
  );
  const stats = useMemo(() => getTaskStatsSummary(filtered), [filtered]);
  const statItems = useMemo(() => {
    const items = [
      {
        label: "לביצוע",
        value: String(stats.remaining),
        helper:
          stats.remaining === 0 ? "הכול תחת שליטה" : "משימות שעוד מחכות לך",
        tone: "blue" as const,
        icon: "todo" as const,
      },
      {
        label: "הושלמו",
        value: `${stats.completionRate}%`,
        helper: `${stats.completed} מתוך ${stats.total || 0} סומנו כהושלמו`,
        tone: "emerald" as const,
        icon: "done" as const,
      },
      {
        label: "מתוכננות",
        value: String(stats.scheduled),
        helper:
          stats.scheduled === 0
            ? "אין משימות עם שעת ביצוע"
            : "משימות שנקבעה להן שעת ביצוע",
        tone: "amber" as const,
        icon: "time" as const,
      },
      {
        label: "עומס יומי",
        value: formatMinutesLabel(stats.scheduledMinutes),
        helper:
          stats.scheduledMinutes === 0
            ? "עוד לא הוגדר זמן עבודה"
            : "זמן מתוכנן למשימות במסך",
        tone: "slate" as const,
        icon: "pace" as const,
      },
    ];

    if (filter === "active") {
      return items.filter((item) => item.label !== "הושלמו");
    }

    return items;
  }, [filter, stats]);
  const showBlockingSpinner = Boolean(isLoading && tasks.length === 0);

  const resetAddDialog = () => {
    setDialogOpen(false);
    setAddSuggestion(null);
    setSaveError(null);
    addSuggestionShown.current = false;
  };

  const handleAdd = async (data: TaskFormPayload) => {
    if (onBeforeAdd && !addSuggestionShown.current) {
      const suggestion = onBeforeAdd(data.date, data.time, data.end_time);
      if (suggestion) {
        setAddSuggestion(suggestion);
        addSuggestionShown.current = true;
        return;
      }
    }

    setAddSuggestion(null);
    setSaveError(null);
    addSuggestionShown.current = false;
    setSaving(true);
    try {
      await onAdd(data);
      setDialogOpen(false);
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'שגיאה בשמירה. נסה שוב.');
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = async (data: TaskFormPayload) => {
    if (!editingTask) return;
    setSaving(true);
    try {
      await onEdit(editingTask.id, data);
      setEditingTask(null);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex flex-col h-full">
      {!selectedDate && (
        <>
          <TaskListHeader
            filter={filter}
            onFilterChange={setFilter}
            onAddClick={() => setDialogOpen(true)}
          />
          <TaskStats items={statItems} />
        </>
      )}

      <div className="flex-1 overflow-y-auto py-2">
        {showBlockingSpinner ? (
          <div className="flex items-center justify-center py-12">
            <Spinner variant="ring" className="h-5 w-5 border-blue-500" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
            <CheckCircle2 className="mb-3 h-8 w-8 text-slate-200 dark:text-slate-700" />
            <p className="text-sm font-medium text-slate-400 dark:text-slate-500">אין משימות כאן</p>
            <p className="mt-1 text-xs text-slate-400 dark:text-slate-600">הוסף כדי להתחיל</p>
          </div>
        ) : (
          <ul className="flex flex-col">
            {filtered.map((task) => (
              <li key={task.id}>
                <TaskItem
                  task={task}
                  onToggle={onToggle}
                  onDelete={onDelete}
                  onEdit={setEditingTask}
                />
              </li>
            ))}
          </ul>
        )}
      </div>

      <TaskListDialogs
        addDialog={{
          open: dialogOpen,
          title: "משימה חדשה",
          suggestion: addSuggestion,
          error: saveError,
          initialDate: selectedDate ?? toDateStr(new Date()),
          tasks,
          events,
          isLoading: saving,
          onOpenChange: (open) => {
            if (!open) resetAddDialog();
          },
          onSubmit: handleAdd,
          onCancel: resetAddDialog,
        }}
        editDialog={{
          open: !!editingTask,
          title: "ערוך משימה",
          editTask: editingTask,
          initialDate:
            editingTask?.date ?? selectedDate ?? toDateStr(new Date()),
          tasks,
          events,
          isLoading: saving,
          onOpenChange: (open) => {
            if (!open) setEditingTask(null);
          },
          onSubmit: handleEdit,
          onCancel: () => setEditingTask(null),
        }}
      />
    </div>
  );
}
