"use client";

import { CheckCircle2, Clock3, ListTodo, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";

export interface TaskStatItem {
  label: string;
  value: string;
  helper: string;
  tone: "blue" | "emerald" | "amber" | "slate";
  icon: "todo" | "done" | "time" | "pace";
}

interface TaskStatsProps {
  items: TaskStatItem[];
}

const toneStyles = {
  blue: {
    card: "border-blue-200/70 dark:border-blue-700/30 bg-[linear-gradient(135deg,rgba(59,130,246,0.10),rgba(255,255,255,0.95))] dark:bg-[linear-gradient(135deg,rgba(59,130,246,0.12),rgba(30,41,59,0.95))]",
    icon: "bg-blue-500 text-white shadow-blue-200/80 dark:shadow-blue-900/60",
    helper: "text-blue-600 dark:text-blue-400",
  },
  emerald: {
    card: "border-emerald-200/80 dark:border-emerald-700/30 bg-[linear-gradient(135deg,rgba(16,185,129,0.10),rgba(255,255,255,0.95))] dark:bg-[linear-gradient(135deg,rgba(16,185,129,0.12),rgba(30,41,59,0.95))]",
    icon: "bg-emerald-500 text-white shadow-emerald-200/80 dark:shadow-emerald-900/60",
    helper: "text-emerald-600 dark:text-emerald-400",
  },
  amber: {
    card: "border-amber-200/80 dark:border-amber-700/30 bg-[linear-gradient(135deg,rgba(245,158,11,0.12),rgba(255,255,255,0.95))] dark:bg-[linear-gradient(135deg,rgba(245,158,11,0.14),rgba(30,41,59,0.95))]",
    icon: "bg-amber-500 text-white shadow-amber-200/80 dark:shadow-amber-900/60",
    helper: "text-amber-600 dark:text-amber-400",
  },
  slate: {
    card: "border-slate-200 dark:border-slate-700/50 bg-[linear-gradient(135deg,rgba(148,163,184,0.10),rgba(255,255,255,0.95))] dark:bg-[linear-gradient(135deg,rgba(148,163,184,0.08),rgba(30,41,59,0.95))]",
    icon: "bg-slate-700 dark:bg-slate-600 text-white shadow-slate-200/80 dark:shadow-slate-900/60",
    helper: "text-slate-500 dark:text-slate-400",
  },
} as const;

function StatIcon({ icon }: { icon: TaskStatItem["icon"] }) {
  if (icon === "done") return <CheckCircle2 className="h-4 w-4" />;
  if (icon === "time") return <Clock3 className="h-4 w-4" />;
  if (icon === "pace") return <TrendingUp className="h-4 w-4" />;
  return <ListTodo className="h-4 w-4" />;
}

export default function TaskStats({ items }: TaskStatsProps) {
  return (
    <div className="grid grid-cols-2 gap-2 px-3 py-3 sm:grid-cols-4">
      {items.map((item) => {
        const tone = toneStyles[item.tone];

        return (
          <article
            key={item.label}
            className={cn(
              "rounded-2xl border px-3 py-3 shadow-[0_10px_30px_-20px_rgba(15,23,42,0.45)]",
              tone.card,
            )}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400 dark:text-slate-500">
                  {item.label}
                </p>
                <p className="mt-2 text-2xl font-semibold leading-none text-slate-900 dark:text-slate-100">
                  {item.value}
                </p>
              </div>
              <div
                className={cn(
                  "flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-2xl shadow-lg",
                  tone.icon,
                )}
              >
                <StatIcon icon={item.icon} />
              </div>
            </div>
            <p className={cn("mt-3 text-xs font-medium", tone.helper)}>{item.helper}</p>
          </article>
        );
      })}
    </div>
  );
}
