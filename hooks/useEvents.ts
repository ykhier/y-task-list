'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useSupabaseUser } from '@/components/providers/SupabaseProvider'
import type { CalendarEvent } from '@/types'

type NewEvent = Omit<CalendarEvent, 'id' | 'user_id' | 'created_at'>

const FETCH_TIMEOUT_MS = 12000

export function useEvents() {
  const [events, setEvents] = useState<CalendarEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [supabase] = useState(() => createClient())
  const user = useSupabaseUser()
  const requestIdRef = useRef(0)

  const fetchEvents = useCallback(async () => {
    if (!user) {
      setEvents([])
      setLoading(false)
      return
    }

    const requestId = ++requestIdRef.current
    setLoading(true)
    setError(null)

    const timeout = new Promise<never>((_, reject) => {
      window.setTimeout(() => reject(new Error('טעינת האירועים ארכה יותר מדי זמן.')), FETCH_TIMEOUT_MS)
    })

    try {
      const query = supabase
        .from('sessions')
        .select('*')
        .eq('user_id', user.id)
        .order('start_time', { ascending: true })

      const { data, error } = await Promise.race([query, timeout])
      if (requestId !== requestIdRef.current) return

      if (error) {
        setError(error.message)
        return
      }

      setEvents(data ?? [])
    } catch (err) {
      if (requestId !== requestIdRef.current) return
      setError(err instanceof Error ? err.message : 'שגיאה בטעינת האירועים')
    } finally {
      if (requestId === requestIdRef.current) {
        setLoading(false)
      }
    }
  }, [supabase, user])

  useEffect(() => {
    if (!user) {
      setEvents([])
      setLoading(false)
      return
    }

    void fetchEvents()

    const refreshIfVisible = () => {
      if (document.visibilityState === 'visible') {
        void fetchEvents()
      }
    }

    window.addEventListener('focus', refreshIfVisible)
    window.addEventListener('pageshow', refreshIfVisible)
    document.addEventListener('visibilitychange', refreshIfVisible)

    const channel = supabase
      .channel(`sessions-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'sessions',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            const incoming = payload.new as CalendarEvent
            setEvents((prev) => (prev.some((e) => e.id === incoming.id) ? prev : [...prev, incoming]))
          } else if (payload.eventType === 'UPDATE') {
            setEvents((prev) =>
              prev.map((e) => (e.id === payload.new.id ? (payload.new as CalendarEvent) : e))
            )
          } else if (payload.eventType === 'DELETE') {
            setEvents((prev) => prev.filter((e) => e.id !== payload.old.id))
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
  }, [supabase, user, fetchEvents])

  const addEvent = useCallback(async (data: NewEvent): Promise<{ data: CalendarEvent | null; error: string | null }> => {
    if (!user) return { data: null, error: 'המשתמש לא מחובר.' }
    const { data: event, error } = await supabase
      .from('sessions')
      .insert({ ...data, user_id: user.id })
      .select()
      .single()
    if (error) {
      setError(error.message)
      return { data: null, error: error.message }
    }
    setEvents((prev) => [...prev, event])
    return { data: event, error: null }
  }, [supabase, user])

  const updateEvent = useCallback(async (id: string, data: Partial<CalendarEvent>) => {
    setEvents((prev) => prev.map((e) => (e.id === id ? { ...e, ...data } : e)))
    const { error } = await supabase.from('sessions').update(data).eq('id', id)
    if (error) {
      setError(error.message)
      void fetchEvents()
    }
  }, [fetchEvents, supabase])

  const deleteEvent = useCallback(async (id: string) => {
    setEvents((prev) => prev.filter((e) => e.id !== id))
    const { error } = await supabase.from('sessions').delete().eq('id', id)
    if (error) {
      setError(error.message)
      void fetchEvents()
    }
  }, [fetchEvents, supabase])

  const addEventsBatch = useCallback(async (items: NewEvent[]): Promise<CalendarEvent[]> => {
    if (!user || items.length === 0) return []
    const { data, error } = await supabase
      .from('sessions')
      .insert(items.map((item) => ({ ...item, user_id: user.id })))
      .select()
    if (error) {
      setError(error.message)
      return []
    }
    const saved = data ?? []
    setEvents((prev) => [...prev, ...saved])
    return saved
  }, [supabase, user])

  const deleteEventByTaskId = useCallback(async (taskId: string) => {
    setEvents((prev) => prev.filter((e) => e.task_id !== taskId))
    await supabase.from('sessions').delete().eq('task_id', taskId)
  }, [supabase])

  const deleteEventsByTaskIds = useCallback(async (taskIds: string[]) => {
    if (taskIds.length === 0) return

    const uniqueTaskIds = Array.from(new Set(taskIds))
    setEvents((prev) => prev.filter((event) => !event.task_id || !uniqueTaskIds.includes(event.task_id)))
    await supabase.from('sessions').delete().in('task_id', uniqueTaskIds)
  }, [supabase])

  return {
    events,
    loading,
    error,
    addEvent,
    addEventsBatch,
    updateEvent,
    deleteEvent,
    deleteEventByTaskId,
    deleteEventsByTaskIds,
    refetchEvents: fetchEvents,
  }
}
