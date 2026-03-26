'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useSupabaseUser } from '@/components/providers/SupabaseProvider'
import type { CalendarEvent } from '@/types'

type NewEvent = Omit<CalendarEvent, 'id' | 'user_id' | 'created_at'>

export function useEvents() {
  const [events, setEvents]   = useState<CalendarEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState<string | null>(null)

  const supabase = createClient()
  const user = useSupabaseUser()

  const fetchEvents = useCallback(async () => {
    if (!user) return
    setLoading(true)
    const { data, error } = await supabase
      .from('sessions')
      .select('*')
      .eq('user_id', user.id)
      .order('start_time', { ascending: true })
    if (error) {
      setError(error.message)
    } else {
      setEvents(data ?? [])
    }
    setLoading(false)
  }, [user])

  useEffect(() => {
    if (!user) return
    fetchEvents()

    const channel = supabase
      .channel(`sessions-${user.id}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'sessions',
        filter: `user_id=eq.${user.id}`,
      }, () => fetchEvents())
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [user, fetchEvents])

  const addEvent = useCallback(async (data: NewEvent): Promise<{ data: CalendarEvent | null; error: string | null }> => {
    if (!user) return { data: null, error: 'משתמש לא מחובר. יש להפעיל Anonymous Sign-In ב-Supabase.' }
    const { data: event, error } = await supabase
      .from('sessions')
      .insert({ ...data, user_id: user.id })
      .select()
      .single()
    if (error) { setError(error.message); return { data: null, error: error.message } }
    setEvents((prev) => [...prev, event])
    return { data: event, error: null }
  }, [user])

  const updateEvent = useCallback(async (id: string, data: Partial<CalendarEvent>) => {
    setEvents((prev) => prev.map((e) => (e.id === id ? { ...e, ...data } : e)))
    const { error } = await supabase.from('sessions').update(data).eq('id', id)
    if (error) { setError(error.message); fetchEvents() }
  }, [fetchEvents])

  const deleteEvent = useCallback(async (id: string) => {
    setEvents((prev) => prev.filter((e) => e.id !== id))
    const { error } = await supabase.from('sessions').delete().eq('id', id)
    if (error) { setError(error.message); fetchEvents() }
  }, [fetchEvents])

  const deleteEventByTaskId = useCallback(async (taskId: string) => {
    setEvents((prev) => prev.filter((e) => e.task_id !== taskId))
    await supabase.from('sessions').delete().eq('task_id', taskId)
  }, [])

  return {
    events,
    loading,
    error,
    addEvent,
    updateEvent,
    deleteEvent,
    deleteEventByTaskId,
  }
}
