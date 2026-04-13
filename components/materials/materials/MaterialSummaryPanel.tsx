"use client"

import { Sparkles } from "lucide-react"
import Spinner from "@/components/ui/Spinner"
import { Button } from "@/components/ui/button"
import { useSummarize } from "@/hooks/useSummarize"

interface MaterialSummaryPanelProps {
  tutorialId: string
  hasMaterials: boolean
}

export default function MaterialSummaryPanel({ tutorialId, hasMaterials }: MaterialSummaryPanelProps) {
  const { summary, streaming, error, startSummarize, reset } = useSummarize(tutorialId)

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-slate-700">סיכום חכם</h3>
        <div className="flex gap-2">
          {summary && (
            <Button type="button" variant="ghost" size="sm" className="h-7 text-xs text-slate-400" onClick={reset}>
              נקה
            </Button>
          )}
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-7 gap-1.5 text-xs"
            disabled={streaming || !hasMaterials}
            onClick={startSummarize}
          >
            {streaming ? (
              <>
                <Spinner className="h-3 w-3" />
                מסכם...
              </>
            ) : (
              <>
                <Sparkles className="h-3 w-3" />
                סכם חומר
              </>
            )}
          </Button>
        </div>
      </div>

      {error && (
        <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-600">
          {error}
        </p>
      )}

      {!hasMaterials && !summary && (
        <p className="text-xs text-slate-400">העלה חומרי לימוד כדי ליצור סיכום אוטומטי.</p>
      )}

      {(summary || streaming) && (
        <div
          dir="rtl"
          className="rounded-xl border border-slate-100 bg-slate-50 px-4 py-3 text-sm text-slate-700 leading-relaxed whitespace-pre-wrap"
        >
          {summary}
          {streaming && <span className="inline-block h-4 w-0.5 animate-pulse bg-blue-500 align-middle ml-0.5" />}
        </div>
      )}
    </div>
  )
}
