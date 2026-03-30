"use client";

import { useState, useMemo, useRef } from "react";
import { Plus, SlidersHorizontal, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import TaskItem from "./TaskItem";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import TaskForm from "./TaskForm";
import { toDateStr } from "@/lib/date";
import { cn } from "@/lib/utils";
import type { Task, CalendarEvent, TaskFilter } from "@/types";

interface TaskListProps {
  tasks: Task[];
  events?: CalendarEvent[];
  selectedDate?: string;
  isLoading?: boolean;
  onAdd: (
    data: Omit<Task, "id" | "user_id" | "created_at" | "is_completed">,
  ) => Promise<void>;
  onToggle: (id: string, completed: boolean) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onEdit: (id: string, data: Partial<Task>) => Promise<void>;
  onBeforeAdd?: (date: string, time?: string | null, endTime?: string | null) => string | null;
}

const FILTERS: { label: string; value: TaskFilter }[] = [
  { label: "הכל", value: "all" },
  { label: "היום", value: "today" },
  { label: "השבוע", value: "week" },
  { label: "פעיל", value: "active" },
  { label: "הושלמו", value: "completed" },
];

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
  const addSuggestionShown = useRef(false);

  const today = toDateStr(new Date());

  const filtered = useMemo(() => {
    let list = tasks;
    if (selectedDate) {
      list = list.filter((t) => t.date === selectedDate);
    } else {
      if (filter === "today") list = list.filter((t) => t.date === today);
      if (filter === "week") {
        const now = new Date();
        const weekStart = toDateStr(
          new Date(now.setDate(now.getDate() - now.getDay())),
        );
        const weekEnd = toDateStr(
          new Date(
            new Date().setDate(
              new Date().getDate() + (6 - new Date().getDay()),
            ),
          ),
        );
        list = list.filter((t) => t.date >= weekStart && t.date <= weekEnd);
      }
      if (filter === "active") list = list.filter((t) => !t.is_completed);
      if (filter === "completed") list = list.filter((t) => t.is_completed);
    }
    return [...list].sort((a, b) => {
      // Sort: active first, then by time, then by created_at
      if (a.is_completed !== b.is_completed) return a.is_completed ? 1 : -1;
      if (a.time && b.time) return a.time.localeCompare(b.time);
      if (a.time && !b.time) return -1;
      if (!a.time && b.time) return 1;
      return a.created_at.localeCompare(b.created_at);
    });
  }, [tasks, filter, selectedDate, today]);


  const handleAdd = async (
    data: Omit<Task, "id" | "user_id" | "created_at" | "is_completed">,
  ) => {
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

  const handleEdit = async (
    data: Omit<Task, "id" | "user_id" | "created_at" | "is_completed">,
  ) => {
    if (!editingTask) return;
    setSaving(true);
    await onEdit(editingTask.id, data);
    setSaving(false);
    setEditingTask(null);
  };

  const openEdit = (task: Task) => setEditingTask(task);

  return (
    <div className="flex flex-col h-full">
      {/* Filters + Add button */}
      {!selectedDate && (
        <div className="flex items-center justify-between px-4 py-2 border-b border-slate-100 bg-white flex-shrink-0 overflow-x-auto">
          <div className="flex items-center gap-1">
            <SlidersHorizontal className="h-3.5 w-3.5 text-slate-400 flex-shrink-0 ml-1" />
            {FILTERS.map(({ label, value }) => (
              <button
                key={value}
                onClick={() => setFilter(value)}
                className={cn(
                  "px-2.5 py-1 rounded-md text-xs font-medium whitespace-nowrap transition-colors duration-150 cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500",
                  filter === value
                    ? "bg-blue-500 text-white"
                    : "text-slate-500 hover:text-slate-700 hover:bg-slate-100",
                )}
              >
                {label}
              </button>
            ))}
          </div>
          <Button size="sm" onClick={() => setDialogOpen(true)}>
            <Plus className="h-3.5 w-3.5" />
            הוסף משימה
          </Button>
        </div>
      )}

      {/* Task list */}
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
                  onEdit={openEdit}
                />
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Add Task Dialog */}
      <Dialog open={dialogOpen} onOpenChange={(o) => { if (!o) { setDialogOpen(false); setAddSuggestion(null); addSuggestionShown.current = false; } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>משימה חדשה</DialogTitle>
          </DialogHeader>
          {addSuggestion && (
            <div className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-md px-3 py-2 flex flex-col gap-1">
              <p className="font-semibold">שים לב — קיים תוכן קבוע מהשבוע הקודם</p>
              <p>{addSuggestion}</p>
              <p className="text-xs text-amber-600">{'לחץ "הוסף משימה" שוב כדי להוסיף ידנית, או סגור ולחץ "צרף קבועות".'}</p>
            </div>
          )}
          <TaskForm
            initialDate={selectedDate ?? toDateStr(new Date())}
            events={events}
            tasks={tasks}
            onSubmit={handleAdd}
            onCancel={() => setDialogOpen(false)}
            isLoading={saving}
          />
        </DialogContent>
      </Dialog>

      {/* Edit Task Dialog */}
      <Dialog
        open={!!editingTask}
        onOpenChange={(o) => !o && setEditingTask(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>ערוך משימה</DialogTitle>
          </DialogHeader>
          <TaskForm
            editTask={editingTask}
            events={events}
            tasks={tasks}
            onSubmit={handleEdit}
            onCancel={() => setEditingTask(null)}
            isLoading={saving}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
