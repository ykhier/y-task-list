"use client"

import { useRef, useState } from "react"
import { UploadCloud } from "lucide-react"
import Spinner from "@/components/ui/Spinner"
import { ACCEPTED_FILE_TYPES, MAX_SIZE_LABEL } from "./materials-panel-constants"

interface MaterialUploadZoneProps {
  uploading: boolean
  onUpload: (file: File) => void
}

export default function MaterialUploadZone({ uploading, onUpload }: MaterialUploadZoneProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragging, setDragging] = useState(false)

  const handleFile = (file: File) => {
    if (!uploading) onUpload(file)
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
        dragging
          ? "border-blue-400 bg-blue-50"
          : "border-slate-200 bg-slate-50 hover:border-blue-300 hover:bg-blue-50/50"
      } ${uploading ? "pointer-events-none opacity-60" : ""}`}
    >
      {uploading ? (
        <Spinner className="h-6 w-6 text-blue-500" />
      ) : (
        <UploadCloud className="h-8 w-8 text-slate-400" />
      )}
      <p className="text-sm font-medium text-slate-600">
        {uploading ? "מעלה קובץ..." : "גרור לכאן או לחץ להעלאה"}
      </p>
      <p className="text-xs text-slate-400">PDF, Word, TXT · עד {MAX_SIZE_LABEL}</p>
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
