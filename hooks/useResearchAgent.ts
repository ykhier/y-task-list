"use client"

import { useCallback, useRef, useState } from "react"
import type { AgentStep, ResearchResult } from "@/types"

type SseEvent =
  | { type: "step"; tool: string; input: string }
  | { type: "chunk"; content: string }
  | { type: "done" }
  | { type: "error"; message: string }

export function useResearchAgent(tutorialId: string | null) {
  const [results, setResults] = useState<ResearchResult[]>([])
  const [steps, setSteps] = useState<AgentStep[]>([])
  const [rawContent, setRawContent] = useState("")
  const [streaming, setStreaming] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const abortRef = useRef<AbortController | null>(null)

  const startResearch = useCallback(
    async (topic: string) => {
      if (!tutorialId || streaming) return
      abortRef.current?.abort()
      abortRef.current = new AbortController()

      setResults([])
      setSteps([])
      setRawContent("")
      setError(null)
      setStreaming(true)

      let accumulated = ""

      try {
        const res = await fetch("/api/materials/research", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ tutorialId, topic }),
          signal: abortRef.current.signal,
        })

        if (!res.ok || !res.body) {
          const body = await res.json() as { error?: string }
          throw new Error(body.error ?? "Server error")
        }

        const reader = res.body.getReader()
        const decoder = new TextDecoder()
        let buffer = ""

        while (true) {
          const { done, value } = await reader.read()
          if (done) break
          buffer += decoder.decode(value, { stream: true })
          const lines = buffer.split("\n")
          buffer = lines.pop() ?? ""
          for (const line of lines) {
            if (!line.startsWith("data: ")) continue
            try {
              const event = JSON.parse(line.slice(6)) as SseEvent
              if (event.type === "step") {
                setSteps((prev) => [...prev, { tool: event.tool, input: event.input }])
              } else if (event.type === "chunk" && event.content) {
                accumulated += event.content
                setRawContent(accumulated)
              } else if (event.type === "error") {
                throw new Error(event.message ?? "שגיאה")
              } else if (event.type === "done") {
                break
              }
            } catch (parseErr) {
              // skip malformed lines
            }
          }
        }
      } catch (err) {
        if ((err as Error).name !== "AbortError") {
          setError(err instanceof Error ? err.message : "שגיאה בחיפוש המחקר")
        }
      } finally {
        setStreaming(false)
      }
    },
    [tutorialId, streaming],
  )

  const reset = useCallback(() => {
    abortRef.current?.abort()
    setResults([])
    setSteps([])
    setRawContent("")
    setError(null)
    setStreaming(false)
  }, [])

  return { results, steps, rawContent, streaming, error, startResearch, reset }
}
