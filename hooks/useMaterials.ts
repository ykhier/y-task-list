"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import type { TutorialMaterial } from "@/types"

export function useMaterials(tutorialId: string | null) {
  const [materials, setMaterials] = useState<TutorialMaterial[]>([])
  const [loading, setLoading] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const requestIdRef = useRef(0)

  const fetchMaterials = useCallback(
    async (background = false) => {
      if (!tutorialId) return
      const requestId = ++requestIdRef.current
      if (!background) setLoading(true)
      try {
        const res = await fetch(`/api/materials?tutorialId=${tutorialId}`)
        if (requestId !== requestIdRef.current) return
        if (!res.ok) return
        const data = await res.json() as TutorialMaterial[]
        if (requestId !== requestIdRef.current) return
        setMaterials(data)
      } finally {
        if (requestId === requestIdRef.current) setLoading(false)
      }
    },
    [tutorialId],
  )

  useEffect(() => {
    void fetchMaterials()

    const onFocus = () => { void fetchMaterials(true) }
    window.addEventListener("focus", onFocus)
    return () => window.removeEventListener("focus", onFocus)
  }, [fetchMaterials])

  // Poll every 3 s while any material is still embedding
  useEffect(() => {
    const hasProcessing = materials.some((m) => m.embedding_status === "processing")
    if (!hasProcessing) return
    const id = setInterval(() => { void fetchMaterials(true) }, 3000)
    return () => clearInterval(id)
  }, [materials, fetchMaterials])

  const uploadFile = useCallback(
    async (file: File) => {
      if (!tutorialId) return
      setUploading(true)
      setError(null)
      try {
        const fd = new FormData()
        fd.append("tutorialId", tutorialId)
        fd.append("file", file)
        const res = await fetch("/api/materials/upload", { method: "POST", body: fd })
        if (!res.ok) {
          const text = await res.text()
          let msg = "Upload failed"
          try { msg = (JSON.parse(text) as { error?: string }).error ?? msg } catch { /* non-JSON error */ }
          throw new Error(msg)
        }
        await fetchMaterials(true)
      } catch (err) {
        setError(err instanceof Error ? err.message : "שגיאה בהעלאת הקובץ")
      } finally {
        setUploading(false)
      }
    },
    [tutorialId, fetchMaterials],
  )

  const deleteFile = useCallback(
    async (materialId: string) => {
      setError(null)
      // Optimistic removal
      setMaterials((prev) => prev.filter((m) => m.id !== materialId))
      try {
        const res = await fetch(`/api/materials/${materialId}`, { method: "DELETE" })
        if (!res.ok) {
          const text = await res.text()
          let msg = "Delete failed"
          try { msg = (JSON.parse(text) as { error?: string }).error ?? msg } catch { /* non-JSON error */ }
          throw new Error(msg)
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "שגיאה במחיקת הקובץ")
        await fetchMaterials(true)
      }
    },
    [fetchMaterials],
  )

  const retryEmbed = useCallback(
    async (materialId: string) => {
      setError(null)
      setMaterials((prev) =>
        prev.map((m) => m.id === materialId ? { ...m, embedding_status: "processing" } : m),
      )
      try {
        const res = await fetch("/api/materials/embed", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ materialId }),
        })
        if (!res.ok) {
          const text = await res.text()
          let msg = "Retry failed"
          try { msg = (JSON.parse(text) as { error?: string }).error ?? msg } catch { /* non-JSON error */ }
          throw new Error(msg)
        }
        await fetchMaterials(true)
      } catch (err) {
        setError(err instanceof Error ? err.message : "שגיאה")
        await fetchMaterials(true)
      }
    },
    [fetchMaterials],
  )

  return { materials, loading, uploading, error, uploadFile, deleteFile, retryEmbed }
}
