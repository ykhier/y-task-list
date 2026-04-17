"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import type { TutorialMaterial } from "@/types"

async function readErrorMessage(res: Response, fallback: string) {
  const text = await res.text()
  try {
    return (JSON.parse(text) as { error?: string }).error ?? fallback
  } catch {
    return fallback
  }
}

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
        const existing = await fetch(`/api/materials?tutorialId=${tutorialId}`)
        const current = existing.ok ? await existing.json() as TutorialMaterial[] : []

        const fd = new FormData()
        fd.append("tutorialId", tutorialId)
        fd.append("file", file)
        const res = await fetch("/api/materials/upload", { method: "POST", body: fd })
        if (!res.ok) {
          throw new Error(await readErrorMessage(res, "Upload failed"))
        }

        const uploaded = await res.json() as { materialId?: string }
        const staleMaterials = current.filter((m) => m.id !== uploaded.materialId)

        await Promise.all(
          staleMaterials.map(async (m) => {
            const deleteRes = await fetch(`/api/materials/${m.id}`, { method: "DELETE" })
            if (!deleteRes.ok) {
              throw new Error(await readErrorMessage(deleteRes, "Delete failed"))
            }
          }),
        )

        await fetchMaterials(true)
      } catch (err) {
        setError(err instanceof Error ? err.message : "שגיאה בהעלאת הקובץ")
        await fetchMaterials(true)
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
          throw new Error(await readErrorMessage(res, "Delete failed"))
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
          throw new Error(await readErrorMessage(res, "Retry failed"))
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
