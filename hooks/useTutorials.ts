'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useSupabaseUser } from '@/components/providers/SupabaseProvider'
import type { Tutorial } from '@/types'

type NewTutorial = Omit<Tutorial, 'id' | 'user_id' | 'created_at'>

const FETCH_TIMEOUT_MS = 12000

export function useTutorials() {
  const [tutorials, setTutorials] = useState<Tutorial[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [supabase] = useState(() => createClient())
  const user = useSupabaseUser()
  const requestIdRef = useRef(0)

  const fetchTutorials = useCallback(async () => {
    if (!user) {
      setTutorials([])
      setLoading(false)
      return
    }

    const requestId = ++requestIdRef.current
    setLoading(true)
    setError(null)

    const timeout = new Promise<never>((_, reject) => {
      window.setTimeout(() => reject(new Error('טעינת הקבועות ארכה יותר מדי זמן.')), FETCH_TIMEOUT_MS)
    })

    try {
      const query = supabase
        .from('tutorials')
        .select('*')
        .eq('user_id', user.id)
        .order('start_time', { ascending: true })

      const { data, error } = await Promise.race([query, timeout])
      if (requestId !== requestIdRef.current) return

      if (error) {
        setError(error.message)
        return
      }

      setTutorials(data ?? [])
    } catch (err) {
      if (requestId !== requestIdRef.current) return
      setError(err instanceof Error ? err.message : 'שגיאה בטעינת הקבועות')
    } finally {
      if (requestId === requestIdRef.current) {
        setLoading(false)
      }
    }
  }, [supabase, user])

  useEffect(() => {
    if (!user) {
      setTutorials([])
      setLoading(false)
      return
    }

    void fetchTutorials()

    const refreshIfVisible = () => {
      if (document.visibilityState === 'visible') {
        void fetchTutorials()
      }
    }

    window.addEventListener('focus', refreshIfVisible)
    window.addEventListener('pageshow', refreshIfVisible)
    document.addEventListener('visibilitychange', refreshIfVisible)

    const channel = supabase
      .channel(`tutorials-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'tutorials',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            const incoming = payload.new as Tutorial
            setTutorials((prev) => (prev.some((t) => t.id === incoming.id) ? prev : [...prev, incoming]))
          } else if (payload.eventType === 'UPDATE') {
            setTutorials((prev) =>
              prev.map((t) => (t.id === payload.new.id ? (payload.new as Tutorial) : t))
            )
          } else if (payload.eventType === 'DELETE') {
            setTutorials((prev) => prev.filter((t) => t.id !== payload.old.id))
          }
        }
      )
      .subscribe()

    return () => {
      requestIdRef.current += 1
      window.removeEventListener('focus', refreshIfVisible)
      window.removeEventListener('pageshow', refreshIfVisible)
      document.removeEventListener('visibilitychange', refreshIfVisible)
      supabase.removeChannel(channel)
    }
  }, [supabase, user, fetchTutorials])

  const addTutorial = useCallback(async (data: NewTutorial): Promise<Tutorial | null> => {
    if (!user) return null

    const optimisticId = crypto.randomUUID()
    const optimistic: Tutorial = {
      ...data,
      id: optimisticId,
      user_id: user.id,
      created_at: new Date().toISOString(),
    }
    setTutorials((prev) => [...prev, optimistic])

    const { data: saved, error } = await supabase
      .from('tutorials')
      .insert({ ...data, user_id: user.id })
      .select()
      .single()

    if (error) {
      setError(error.message)
      setTutorials((prev) => prev.filter((t) => t.id !== optimisticId))
      return null
    }

    setTutorials((prev) => prev.map((t) => (t.id === optimisticId ? saved : t)))
    return saved
  }, [supabase, user])

  const updateTutorial = useCallback(async (id: string, data: Partial<Tutorial>) => {
    setTutorials((prev) => prev.map((t) => (t.id === id ? { ...t, ...data } : t)))
    const { error } = await supabase.from('tutorials').update(data).eq('id', id)
    if (error) {
      setError(error.message)
      void fetchTutorials()
    }
  }, [fetchTutorials, supabase])

  const addTutorialsBatch = useCallback(async (items: NewTutorial[]): Promise<Tutorial[]> => {
    if (!user || items.length === 0) return []
    const { data, error } = await supabase
      .from('tutorials')
      .insert(items.map((item) => ({ ...item, user_id: user.id })))
      .select()
    if (error) {
      setError(error.message)
      return []
    }
    const saved = data ?? []
    setTutorials((prev) => [...prev, ...saved])
    return saved
  }, [supabase, user])

  const deleteTutorial = useCallback(async (id: string) => {
    setTutorials((prev) => prev.filter((t) => t.id !== id))
    const { error } = await supabase.from('tutorials').delete().eq('id', id)
    if (error) {
      setError(error.message)
      void fetchTutorials()
    }
  }, [fetchTutorials, supabase])

  const deleteTutorialBySessionId = useCallback(async (sessionId: string) => {
    setTutorials((prev) => prev.filter((t) => t.session_id !== sessionId))
    await supabase.from('tutorials').delete().eq('session_id', sessionId)
  }, [supabase])

  return { tutorials, loading, error, addTutorial, addTasksBatch: addTutorialsBatch, addTutorialsBatch, updateTutorial, deleteTutorial, deleteTutorialBySessionId, refetchTutorials: fetchTutorials }
}
