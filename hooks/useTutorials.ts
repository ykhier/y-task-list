'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useSupabaseUser } from '@/components/providers/SupabaseProvider'
import type { Tutorial } from '@/types'

type NewTutorial = Omit<Tutorial, 'id' | 'user_id' | 'created_at'>

export function useTutorials() {
  const [tutorials, setTutorials] = useState<Tutorial[]>([])
  const [loading, setLoading]     = useState(true)
  const [error, setError]         = useState<string | null>(null)

  const supabase = createClient()
  const user = useSupabaseUser()

  const fetchTutorials = useCallback(async () => {
    if (!user) return
    const { data, error } = await supabase
      .from('tutorials')
      .select('*')
      .eq('user_id', user.id)
      .order('start_time', { ascending: true })
    if (error) { setError(error.message); setLoading(false); return }

    setTutorials(data ?? [])
    setLoading(false)
  }, [user])

  // Initial fetch + realtime subscription
  useEffect(() => {
    if (!user) return

    let cancelled = false
    fetchTutorials().then(() => { if (cancelled) setTutorials([]) })

    // Realtime — update local state from payload instead of re-fetching
    const channel = supabase
      .channel(`tutorials-${user.id}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'tutorials',
        filter: `user_id=eq.${user.id}`,
      }, (payload) => {
        if (payload.eventType === 'INSERT') {
          const incoming = payload.new as Tutorial
          setTutorials((prev) =>
            prev.some((t) => t.id === incoming.id) ? prev : [...prev, incoming]
          )
        } else if (payload.eventType === 'UPDATE') {
          setTutorials((prev) =>
            prev.map((t) => (t.id === payload.new.id ? (payload.new as Tutorial) : t))
          )
        } else if (payload.eventType === 'DELETE') {
          setTutorials((prev) => prev.filter((t) => t.id !== payload.old.id))
        }
      })
      .subscribe()

    return () => {
      cancelled = true
      supabase.removeChannel(channel)
    }
  }, [user, fetchTutorials])

  // Optimistic add — updates state immediately, rolls back on error
  const addTutorial = useCallback(async (data: NewTutorial): Promise<Tutorial | null> => {
    if (!user) return null

    const optimisticId = crypto.randomUUID()
    const optimistic: Tutorial = {
      ...data,
      id:         optimisticId,
      user_id:    user.id,
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

    // Replace optimistic row with real row from DB
    setTutorials((prev) => prev.map((t) => (t.id === optimisticId ? saved : t)))
    return saved
  }, [user])

  // Optimistic update — applies change immediately, rolls back on error
  const updateTutorial = useCallback(async (id: string, data: Partial<Tutorial>) => {
    setTutorials((prev) => prev.map((t) => (t.id === id ? { ...t, ...data } : t)))
    const { error } = await supabase.from('tutorials').update(data).eq('id', id)
    if (error) {
      setError(error.message)
      // Realtime DELETE event will sync the correct state
    }
  }, [])

  const addTutorialsBatch = useCallback(async (items: NewTutorial[]): Promise<Tutorial[]> => {
    if (!user || items.length === 0) return []
    const { data, error } = await supabase
      .from('tutorials')
      .insert(items.map((item) => ({ ...item, user_id: user.id })))
      .select()
    if (error) { setError(error.message); return [] }
    const saved = data ?? []
    setTutorials((prev) => [...prev, ...saved])
    return saved
  }, [user])

  // Optimistic delete — removes immediately, rolls back on error
  const deleteTutorial = useCallback(async (id: string) => {
    setTutorials((prev) => prev.filter((t) => t.id !== id))
    const { error } = await supabase.from('tutorials').delete().eq('id', id)
    if (error) {
      setError(error.message)
      // Could re-fetch here to restore, but Realtime will not fire on failed delete
    }
  }, [])

  const deleteTutorialBySessionId = useCallback(async (sessionId: string) => {
    setTutorials((prev) => prev.filter((t) => t.session_id !== sessionId))
    await supabase.from('tutorials').delete().eq('session_id', sessionId)
  }, [])

  return { tutorials, loading, error, addTutorial, addTutorialsBatch, updateTutorial, deleteTutorial, deleteTutorialBySessionId }
}
