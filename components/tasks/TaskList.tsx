"use client";

import { useState, useMemo } from "react";
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
}: TaskListProps) {
  const [filter, setFilter] = useState<TaskFilter>(
    selectedDate ? "all" : "today",
  );
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [saving, setSaving] = useState(false);

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
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>משימה חדשה</DialogTitle>
          </DialogHeader>
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
