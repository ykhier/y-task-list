"use client"

import { useState, useEffect } from "react"
import { ExternalLink, Loader2, Search, ShieldCheck } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useResearchAgent } from "@/hooks/useResearchAgent"

interface MaterialResearchPanelProps {
  tutorialId: string
  defaultTopic: string
  waitingForFiles?: boolean
}

// ── Markdown renderer ──────────────────────────────────────────────────────────
// Converts the agent's markdown output into clean React elements.
// Supports: ## headings, **bold**, [label](url) links, numbered items.

/** RTL if the line contains any Hebrew character; LTR only if purely Latin. */
function getLineDir(line: string): 'ltr' | 'rtl' {
  if (/[\u05D0-\u05EA]/.test(line)) return 'rtl'
  if (/[a-zA-Z]/.test(line)) return 'ltr'
  return 'rtl'
}

function renderLine(line: string, key: number) {
  // Category heading (##) — always RTL (Hebrew labels)
  if (line.startsWith('## ')) {
    return (
      <div key={key} dir="rtl" className="mt-5 mb-1 flex items-center gap-2">
        <span className="text-xs font-bold text-slate-600 uppercase tracking-wide">{line.slice(3)}</span>
        <div className="flex-1 h-px bg-slate-200" />
      </div>
    )
  }

  // Language sub-heading (###)
  if (line.startsWith('### ')) {
    const lang = line.slice(4).trim()
    const isHebrew = lang === 'עברית'
    return (
      <div key={key} dir="rtl">
        <span className={`mt-2 mb-0.5 inline-block text-[10px] font-semibold tracking-wide px-1.5 py-0.5 rounded ${
          isHebrew ? 'text-emerald-700 bg-emerald-50' : 'text-blue-700 bg-blue-50'
        }`}>
          {lang}
        </span>
      </div>
    )
  }

  // Empty line → small spacer
  if (!line.trim()) return <div key={key} className="h-0.5" />

  // Blockquote note ("> ...") — doc-relevance message
  if (line.startsWith('> ')) {
    return (
      <div key={key} dir="rtl" className="mb-3 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
        {parseLine(line.slice(2))}
      </div>
    )
  }

  // Auto-detect direction from the actual line content (title or description)
  const dir = getLineDir(line)
  const parts = parseLine(line)
  return (
    <p
      key={key}
      dir={dir}
      className={`text-sm leading-relaxed text-slate-600 ${dir === 'ltr' ? 'ml-1 text-left' : 'mr-1 text-right'}`}
    >
      {parts}
    </p>
  )
}

function parseLine(line: string): React.ReactNode[] {
  const result: React.ReactNode[] = []
  // [label](url) — label may contain one level of nested brackets (e.g. "AZ-104 [Hebrew]")
  // (?:[^\[\]]|\[[^\]]*\])+ matches: sequences of non-bracket chars OR inner [bracket] pairs
  const pattern = /\*\*([^*]+)\*\*|\[((?:[^\[\]]|\[[^\]]*\])+)\]\((https?:\/\/[^)]+)\)|(https?:\/\/\S+)/g
  let last = 0
  let match: RegExpExecArray | null

  while ((match = pattern.exec(line)) !== null) {
    if (match.index > last) {
      result.push(line.slice(last, match.index))
    }

    if (match[1] !== undefined) {
      // **bold**
      result.push(<strong key={match.index}>{match[1]}</strong>)
    } else if (match[2] !== undefined && match[3]) {
      // [label](url) → full label as the clickable link text
      result.push(
        <a
          key={match.index}
          href={match[3]}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-0.5 text-blue-600 hover:underline font-medium"
        >
          {match[2]} <ExternalLink className="h-3 w-3 shrink-0" />
        </a>
      )
    } else if (match[4]) {
      // bare URL — use the hostname as the visible label
      const label = (() => {
        try { return new URL(match[4]).hostname.replace(/^www\./, '') }
        catch { return match[4] }
      })()
      result.push(
        <a
          key={match.index}
          href={match[4]}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-0.5 text-blue-600 hover:underline font-medium"
        >
          {label} <ExternalLink className="h-3 w-3 shrink-0" />
        </a>
      )
    }

    last = match.index + match[0].length
  }

  if (last < line.length) result.push(line.slice(last))
  return result
}

function ResearchContent({ content }: { content: string; streaming?: boolean }) {
  const lines = content.replace(/—/g, '-').split('\n')
  return (
    <div className="flex flex-col">
      {lines.map((line, i) => renderLine(line, i))}
    </div>
  )
}

// ── Component ──────────────────────────────────────────────────────────────────
export default function MaterialResearchPanel({ tutorialId, defaultTopic, waitingForFiles = false }: MaterialResearchPanelProps) {
  const [topic, setTopic] = useState(defaultTopic)
  const { steps, rawContent, streaming, error, startResearch, reset } = useResearchAgent(tutorialId)

  // Keep topic in sync when the panel opens for a different item
  useEffect(() => {
    if (defaultTopic) setTopic(defaultTopic)
  }, [defaultTopic])

  return (
    <div className="flex flex-col gap-3">
      <h3 className="text-sm font-semibold text-slate-700">חיפוש מקורות</h3>

      <div className="flex gap-2">
        <Input
          value={topic}
          onChange={(e) => setTopic(e.target.value)}
          placeholder="נושא לחיפוש..."
          className="h-8 flex-1 text-sm"
          dir="rtl"
          disabled={streaming}
        />
        <Button
          type="button"
          size="sm"
          className="h-8 gap-1.5 text-xs"
          disabled={streaming || !topic.trim() || waitingForFiles}
          title={waitingForFiles ? "ממתין לסיום עיבוד הקבצים..." : undefined}
          onClick={() => { reset(); startResearch(topic.trim()) }}
        >
          {streaming ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Search className="h-3.5 w-3.5" />}
          <span className="hidden sm:inline">מצא מקורות</span>
        </Button>
      </div>

      {error && (
        <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-600">{error}</p>
      )}

      {/* Agent thinking steps */}
      {steps.length > 0 && !rawContent && (
        <div className="flex flex-col gap-1">
          {steps.map((step, i) => {
            const isValidation = step.tool === 'validate_url'
            return (
              <div key={i} className="flex items-center gap-1.5 text-xs text-slate-400">
                {isValidation
                  ? <ShieldCheck className="h-3 w-3 shrink-0 text-emerald-400" />
                  : <Search className="h-3 w-3 shrink-0" />}
                <span className="truncate">{isValidation ? `מאמת: ${step.input}` : step.input}</span>
              </div>
            )
          })}
        </div>
      )}

      {/* Rendered results */}
      {rawContent && (
        <div className="rounded-xl border border-slate-100 bg-slate-50 px-4 py-3">
          <ResearchContent content={rawContent} />
          {streaming && (
            <span className="inline-block h-4 w-0.5 animate-pulse bg-blue-500 align-middle ml-0.5" />
          )}
        </div>
      )}
    </div>
  )
}
