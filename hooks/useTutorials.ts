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
    setLoading(true)
    const { data, error } = await supabase
      .from('tutorials')
      .select('*')
      .eq('user_id', user.id)
      .order('start_time', { ascending: true })
    if (error) {
      setError(error.message)
    } else {
      setTutorials(data ?? [])
    }
    setLoading(false)
  }, [user])

  useEffect(() => {
    if (!user) return
    fetchTutorials()

    const channel = supabase
      .channel(`tutorials-${user.id}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'tutorials',
        filter: `user_id=eq.${user.id}`,
      }, () => fetchTutorials())
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [user, fetchTutorials])

  const addTutorial = useCallback(async (data: NewTutorial): Promise<Tutorial | null> => {
    if (!user) return null
    const { data: tutorial, error } = await supabase
      .from('tutorials')
      .insert({ ...data, user_id: user.id })
      .select()
      .single()
    if (error) { setError(error.message); return null }
    setTutorials((prev) => [...prev, tutorial])
    return tutorial
  }, [user])

  const updateTutorial = useCallback(async (id: string, data: Partial<Tutorial>) => {
    setTutorials((prev) => prev.map((t) => (t.id === id ? { ...t, ...data } : t)))
    const { error } = await supabase.from('tutorials').update(data).eq('id', id)
    if (error) { setError(error.message); fetchTutorials() }
  }, [fetchTutorials])

  const deleteTutorial = useCallback(async (id: string) => {
    setTutorials((prev) => prev.filter((t) => t.id !== id))
    const { error } = await supabase.from('tutorials').delete().eq('id', id)
    if (error) { setError(error.message); fetchTutorials() }
  }, [fetchTutorials])

  const deleteTutorialBySessionId = useCallback(async (sessionId: string) => {
    setTutorials((prev) => prev.filter((t) => t.session_id !== sessionId))
    await supabase.from('tutorials').delete().eq('session_id', sessionId)
  }, [])

  return { tutorials, loading, error, addTutorial, updateTutorial, deleteTutorial, deleteTutorialBySessionId }
}
