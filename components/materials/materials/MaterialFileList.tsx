"use client"

import { FileText, RefreshCw, Trash2 } from "lucide-react"
import Spinner from "@/components/ui/Spinner"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import type { TutorialMaterial } from "@/types"
import { STATUS_LABELS } from "./materials-panel-constants"
import { getStatusBadgeVariant } from "./materials-panel-utils"

interface MaterialFileListProps {
  materials: TutorialMaterial[]
  onDelete: (id: string) => void
  onRetry: (id: string) => void
  onView: (id: string, fileName: string) => void
}

export default function MaterialFileList({ materials, onDelete, onRetry, onView }: MaterialFileListProps) {
  if (materials.length === 0) return null

  return (
    <ul className="flex flex-col gap-2">
      {materials.map((m) => (
        <li
          key={m.id}
          className="flex items-center gap-3 rounded-lg border border-slate-100 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 shadow-sm"
        >
          <button
            type="button"
            className="flex flex-1 items-center gap-3 min-w-0 text-right hover:opacity-70 transition-opacity"
            onClick={() => onView(m.id, m.file_name)}
            aria-label={`פתח ${m.file_name}`}
          >
            {m.embedding_status === "processing" ? (
              <Spinner className="h-4 w-4 shrink-0 text-blue-500" />
            ) : (
              <FileText className="h-4 w-4 shrink-0 text-slate-400" />
            )}
            <span className="flex-1 truncate text-sm text-slate-700 dark:text-slate-200 text-right" title={m.file_name}>
              {m.file_name}
            </span>
          </button>

          <Badge
            variant={getStatusBadgeVariant(m.embedding_status)}
            className="shrink-0 text-xs"
            title={m.embedding_status === 'error' && m.embedding_error ? m.embedding_error : undefined}
          >
            {STATUS_LABELS[m.embedding_status]}
          </Badge>

          {m.embedding_status === "error" && (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-7 w-7 shrink-0 text-slate-400 hover:text-blue-500"
              onClick={() => onRetry(m.id)}
              aria-label="נסה שוב"
            >
              <RefreshCw className="h-3.5 w-3.5" />
            </Button>
          )}

          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-7 w-7 shrink-0 text-slate-300 hover:text-red-500"
            onClick={() => onDelete(m.id)}
            aria-label="מחק קובץ"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </li>
      ))}
    </ul>
  )
}
