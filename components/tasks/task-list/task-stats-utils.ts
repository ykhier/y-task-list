import type { Task } from "@/types";

export interface TaskStatsSummary {
  total: number;
  completed: number;
  remaining: number;
  scheduled: number;
  completionRate: number;
  scheduledMinutes: number;
}

function timeToMinutes(time: string) {
  const [hours, minutes] = time.split(":").map(Number);
  return hours * 60 + minutes;
}

export function getTaskStatsSummary(tasks: Task[]): TaskStatsSummary {
  const total = tasks.length;
  const completed = tasks.filter((task) => task.is_completed).length;
  const remaining = total - completed;
  const scheduledTasks = tasks.filter((task) => task.time && task.end_time);
  const scheduled = scheduledTasks.length;
  const scheduledMinutes = scheduledTasks.reduce((sum, task) => {
    if (!task.time || !task.end_time) return sum;
    return sum + Math.max(timeToMinutes(task.end_time) - timeToMinutes(task.time), 0);
  }, 0);

  return {
    total,
    completed,
    remaining,
    scheduled,
    completionRate: total === 0 ? 0 : Math.round((completed / total) * 100),
    scheduledMinutes,
  };
}

export function formatMinutesLabel(totalMinutes: number) {
  if (totalMinutes <= 0) return "0 דק";

  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  if (hours === 0) return `${minutes} דק`;
  if (minutes === 0) return `${hours} ש׳`;
  return `${hours} ש׳ ${minutes} דק`;
}
