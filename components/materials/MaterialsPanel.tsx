"use client"

import { useEffect, useState } from "react"
import { X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useMaterials } from "@/hooks/useMaterials"
import MaterialUploadZone from "./materials/MaterialUploadZone"
import MaterialFileList from "./materials/MaterialFileList"
import MaterialSummaryPanel from "./materials/MaterialSummaryPanel"
import MaterialResearchPanel from "./materials/MaterialResearchPanel"
import { parseTutorialTitle } from "./materials/materials-panel-utils"

interface MaterialsPanelProps {
  tutorialId: string
  tutorialTitle: string
  onClose: () => void
}

export default function MaterialsPanel({ tutorialId, tutorialTitle, onClose }: MaterialsPanelProps) {
  const { materials, loading: materialsLoading, uploading, error, uploadFile, deleteFile, retryEmbed } = useMaterials(tutorialId)
  const { courseName } = parseTutorialTitle(tutorialTitle)
  const hasDoneMaterials = materials.some((m) => m.embedding_status === "done")
  const hasProcessingMaterials = materialsLoading || (materials.length > 0 && !hasDoneMaterials)
  const [viewError, setViewError] = useState<string | null>(null)

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose() }
    window.addEventListener("keydown", handler)
    return () => window.removeEventListener("keydown", handler)
  }, [onClose])

  const handleViewFile = async (materialId: string, fileName: string) => {
    setViewError(null)
    try {
      const params = new URLSearchParams({ materialId, fileName })
      const res = await fetch(`/api/materials/signed-url?${params}`)
      if (!res.ok) throw new Error("לא ניתן להוריד את הקובץ")
      const { url } = await res.json() as { url: string }
      const a = document.createElement("a")
      a.href = url
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
    } catch {
      setViewError("לא ניתן להוריד את הקובץ כרגע. נסה שוב.")
    }
  }

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/30 sm:bg-transparent"
        onClick={onClose}
        aria-hidden
      />

      {/* Panel — bottom sheet on mobile, right side sheet on desktop */}
      <div
        dir="rtl"
        className="fixed inset-x-0 bottom-0 z-50 flex max-h-[90dvh] flex-col rounded-t-2xl bg-white shadow-2xl
          sm:inset-x-auto sm:inset-y-0 sm:right-0 sm:w-[420px] sm:rounded-none sm:rounded-l-2xl sm:max-h-none"
      >
        {/* Drag handle (mobile only) */}
        <div className="mx-auto mt-2 h-1 w-10 rounded-full bg-slate-200 sm:hidden" />

        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
          <h2 className="text-base font-semibold text-slate-800">חומרי לימוד</h2>
          <div className="flex items-center gap-1">
            <p className="max-w-[200px] truncate text-xs text-slate-400" title={tutorialTitle}>
              {tutorialTitle}
            </p>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-slate-400 hover:text-slate-700"
              onClick={onClose}
              aria-label="סגור"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-5">
          {/* Upload */}
          <section>
            <h3 className="mb-2 text-sm font-semibold text-slate-700">קבצים</h3>
            <MaterialUploadZone uploading={uploading} onUpload={uploadFile} />
            {error && (
              <p className="mt-2 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-600">
                {error}
              </p>
            )}
            {viewError && (
              <p className="mt-2 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-600">
                {viewError}
              </p>
            )}
            {materials.length > 0 && (
              <div className="mt-3">
                <MaterialFileList
                  materials={materials}
                  onDelete={deleteFile}
                  onRetry={retryEmbed}
                  onView={handleViewFile}
                />
              </div>
            )}
          </section>

          {/* Divider */}
          <div className="h-px bg-slate-100" />

          {/* Summary */}
          <section>
            <MaterialSummaryPanel tutorialId={tutorialId} tutorialTitle={tutorialTitle} hasMaterials={hasDoneMaterials} />
          </section>

          {/* Divider */}
          <div className="h-px bg-slate-100" />

          {/* Research */}
          <section>
            <MaterialResearchPanel tutorialId={tutorialId} defaultTopic={courseName || tutorialTitle} waitingForFiles={hasProcessingMaterials} />
          </section>
        </div>

        {/* Safe area padding (iPhone home indicator) */}
        <div className="h-[env(safe-area-inset-bottom,0px)] sm:hidden" />
      </div>
    </>
  )
}
