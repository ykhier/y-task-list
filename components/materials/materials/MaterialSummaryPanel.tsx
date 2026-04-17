"use client";

import { Fragment } from "react";
import { Download, Sparkles } from "lucide-react";
import Spinner from "@/components/ui/Spinner";
import { Button } from "@/components/ui/button";
import { useSummarize } from "@/hooks/useSummarize";
import { buildSummaryDocumentHtml } from "@/lib/materials/summary-document";

interface MaterialSummaryPanelProps {
  tutorialId: string;
  tutorialTitle: string;
  hasMaterials: boolean;
}

export default function MaterialSummaryPanel({
  tutorialId,
  tutorialTitle,
  hasMaterials,
}: MaterialSummaryPanelProps) {
  const { summary, streaming, error, startSummarize } =
    useSummarize(tutorialId);

  const handleDownloadPdf = () => {
    if (!summary || typeof window === "undefined") return;

    const html = buildSummaryDocumentHtml(tutorialTitle, summary);
    const iframe = document.createElement("iframe");
    iframe.style.position = "fixed";
    iframe.style.right = "0";
    iframe.style.bottom = "0";
    iframe.style.width = "0";
    iframe.style.height = "0";
    iframe.style.border = "0";
    iframe.setAttribute("aria-hidden", "true");
    document.body.appendChild(iframe);

    const cleanup = () => {
      window.setTimeout(() => {
        iframe.remove();
      }, 1000);
    };

    iframe.onload = () => {
      const frameWindow = iframe.contentWindow;
      if (!frameWindow) {
        cleanup();
        return;
      }

      frameWindow.focus();
      frameWindow.print();
      cleanup();
    };

    const doc = iframe.contentDocument;
    if (!doc) {
      cleanup();
      return;
    }

    doc.open();
    doc.write(html);
    doc.close();
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-slate-700">סיכום חכם</h3>
        <div className="flex gap-2">
          {summary && !streaming && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-8 gap-1.5 text-xs font-semibold"
              onClick={handleDownloadPdf}
            >
              <Download className="h-3.5 w-3.5" />
              הורד כ-PDF
            </Button>
          )}
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-8 gap-1.5 text-xs font-semibold border-violet-200 bg-gradient-to-l from-violet-50 to-white text-violet-700 hover:from-violet-100 hover:to-violet-50 hover:border-violet-300 disabled:opacity-50"
            disabled={streaming || !hasMaterials}
            onClick={startSummarize}
          >
            {streaming ? (
              <Fragment>
                <Spinner className="h-3 w-3 text-violet-500" />
                מסכם לעומק...
              </Fragment>
            ) : (
              <Fragment>
                <Sparkles className="h-3.5 w-3.5 text-amber-400" />
                סכם חומר
              </Fragment>
            )}
          </Button>
        </div>
      </div>

      {error && (
        <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-600">
          {error}
        </p>
      )}
    </div>
  );
}
