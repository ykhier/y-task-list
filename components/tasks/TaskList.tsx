"use client";

import { useMemo, useRef, useState } from "react";
import { CheckCircle2 } from "lucide-react";
import TaskItem from "./TaskItem";
import TaskListDialogs from "./task-list/TaskListDialogs";
import TaskListHeader from "./task-list/TaskListHeader";
import { toDateStr } from "@/lib/date";
import { getFilteredTasks, type TaskFormPayload } from "./task-list/task-list-utils";
import type { Task, CalendarEvent, TaskFilter } from "@/types";

interface TaskListProps {
  tasks: Task[];
  events?: CalendarEvent[];
  selectedDate?: string;
  isLoading?: boolean;
  onAdd: (data: TaskFormPayload) => Promise<void>;
  onToggle: (id: string, completed: boolean) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onEdit: (id: string, data: Partial<Task>) => Promise<void>;
  onBeforeAdd?: (date: string, time?: string | null, endTime?: string | null) => string | null;
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
  const [filter, setFilter] = useState<TaskFilter>(selectedDate ? "all" : "today");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [saving, setSaving] = useState(false);
  const [addSuggestion, setAddSuggestion] = useState<string | null>(null);
  const addSuggestionShown = useRef(false);

  const today = toDateStr(new Date());
  const filtered = useMemo(
    () => getFilteredTasks(tasks, filter, selectedDate, today),
    [tasks, filter, selectedDate, today],
  );

  const resetAddDialog = () => {
    setDialogOpen(false);
    setAddSuggestion(null);
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
    addSuggestionShown.current = false;
    setSaving(true);
    await onAdd(data);
    setSaving(false);
    setDialogOpen(false);
  };

  const handleEdit = async (data: TaskFormPayload) => {
    if (!editingTask) return;
    setSaving(true);
    await onEdit(editingTask.id, data);
    setSaving(false);
    setEditingTask(null);
  };

  return (
    <div className="flex flex-col h-full">
      {!selectedDate && (
        <TaskListHeader
          filter={filter}
          onFilterChange={setFilter}
          onAddClick={() => setDialogOpen(true)}
        />
      )}

      <div className="flex-1 overflow-y-auto py-2">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="h-5 w-5 rounded-full border-2 border-blue-500 border-t-transparent animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center px-4">
            <CheckCircle2 className="h-8 w-8 text-slate-200 mb-3" />
            <p className="text-sm text-slate-400 font-medium">אין משימות כאן</p>
            <p className="text-xs text-slate-400 mt-1">הוסף כדי להתחיל</p>
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
          initialDate: editingTask?.date ?? selectedDate ?? toDateStr(new Date()),
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
