"use client"

import { useRef, useState } from "react"
import { UploadCloud } from "lucide-react"
import Spinner from "@/components/ui/Spinner"
import { ACCEPTED_FILE_TYPES, MAX_SIZE_LABEL } from "./materials-panel-constants"
import { ACCEPTED_MIME_TYPES, MAX_FILE_BYTES } from "@/lib/materials/materials-constants"

interface MaterialUploadZoneProps {
  uploading: boolean
  onUpload: (file: File) => void
}

const MAX_MB = MAX_FILE_BYTES / 1_048_576

export default function MaterialUploadZone({ uploading, onUpload }: MaterialUploadZoneProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragging, setDragging] = useState(false)
  const [validationError, setValidationError] = useState<string | null>(null)

  const handleFile = (file: File) => {
    if (uploading) return

    if (!ACCEPTED_MIME_TYPES.includes(file.type as (typeof ACCEPTED_MIME_TYPES)[number])) {
      setValidationError("סוג קובץ לא נתמך. ניתן להעלות קבצי PDF, Word, PowerPoint או TXT בלבד.")
      return
    }

    if (file.size > MAX_FILE_BYTES) {
      setValidationError(`הקובץ גדול מדי. הגודל המרבי הוא ${MAX_MB} MB (הקובץ שלך: ${(file.size / 1_048_576).toFixed(1)} MB).`)
      return
    }

    setValidationError(null)
    onUpload(file)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) handleFile(file)
  }

  return (
    <div
      role="button"
      tabIndex={0}
      aria-label="העלה קובץ לימוד"
      onClick={() => inputRef.current?.click()}
      onKeyDown={(e) => e.key === "Enter" && inputRef.current?.click()}
      onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
      onDragLeave={() => setDragging(false)}
      onDrop={handleDrop}
      className={`flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed px-4 py-8 text-center cursor-pointer transition-colors ${
        validationError
          ? "border-red-300 dark:border-red-600/50 bg-red-50 dark:bg-red-950/20"
          : dragging
            ? "border-blue-400 bg-blue-50 dark:bg-blue-950/30"
            : "border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 hover:border-blue-300 dark:hover:border-blue-600 hover:bg-blue-50/50 dark:hover:bg-blue-950/20"
      } ${uploading ? "pointer-events-none opacity-60" : ""}`}
    >
      {uploading ? (
        <Spinner className="h-6 w-6 text-blue-500" />
      ) : (
        <UploadCloud className="h-8 w-8 text-slate-400" />
      )}
      <p className="text-sm font-medium text-slate-600 dark:text-slate-300">
        {uploading ? "מעלה קובץ..." : "גרור לכאן או לחץ להעלאה"}
      </p>
      {validationError ? (
        <p className="text-xs font-medium text-red-600 dark:text-red-400">{validationError}</p>
      ) : (
        <p className="text-xs text-slate-400 dark:text-slate-500">PDF, Word, PowerPoint, TXT · עד {MAX_SIZE_LABEL}</p>
      )}
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPTED_FILE_TYPES}
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0]
          if (file) handleFile(file)
          e.target.value = ""
        }}
      />
    </div>
  )
}
