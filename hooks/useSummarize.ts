"use client"

import { useCallback, useRef, useState } from "react"

interface SseEvent {
  type: "chunk" | "done" | "error"
  content?: string
  message?: string
}

export function useSummarize(tutorialId: string | null) {
  const [summary, setSummary] = useState("")
  const [streaming, setStreaming] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const abortRef = useRef<AbortController | null>(null)

  const startSummarize = useCallback(async () => {
    if (!tutorialId || streaming) return
    abortRef.current?.abort()
    abortRef.current = new AbortController()

    setSummary("")
    setError(null)
    setStreaming(true)

    try {
      const res = await fetch("/api/materials/summarize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tutorialId }),
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
            if (event.type === "chunk" && event.content) {
              setSummary((prev) => prev + event.content)
            } else if (event.type === "error") {
              throw new Error(event.message ?? "שגיאה")
            } else if (event.type === "done") {
              break
            }
          } catch {
            // skip malformed lines
          }
        }
      }
    } catch (err) {
      if ((err as Error).name !== "AbortError") {
        setError(err instanceof Error ? err.message : "שגיאה ביצירת הסיכום")
      }
    } finally {
      setStreaming(false)
    }
  }, [tutorialId, streaming])

  const reset = useCallback(() => {
    abortRef.current?.abort()
    setSummary("")
    setError(null)
    setStreaming(false)
  }, [])

  return { summary, streaming, error, startSummarize, reset }
}
