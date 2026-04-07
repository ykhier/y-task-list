'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useSupabaseUser } from '@/components/providers/SupabaseProvider'
import type { CalendarEvent } from '@/types'

type NewEvent = Omit<CalendarEvent, 'id' | 'user_id' | 'created_at'>

const FETCH_TIMEOUT_MS = 12000
const MUTATION_TIMEOUT_MS = 15000

function isBrowserOffline() {
  return typeof navigator !== 'undefined' && navigator.onLine === false
}

function getOfflineMessage() {
  return 'אין חיבור לרשת כרגע. הפעולה תחזור לעבוד כשהחיבור יתחדש.'
}

export function useEvents() {
  const [events, setEvents] = useState<CalendarEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [supabase] = useState(() => createClient())
  const user = useSupabaseUser()
  const requestIdRef = useRef(0)

  const runWithTimeout = useCallback(async <T,>(
    operation: PromiseLike<T>,
    timeoutMs: number,
    message: string
  ): Promise<T> => {
    const wrappedOperation = Promise.resolve(operation)
    const timeoutPromise = new Promise<never>((_, reject) => {
      const timeoutId = window.setTimeout(() => {
        reject(new Error(message))
      }, timeoutMs)

      wrappedOperation.finally(() => window.clearTimeout(timeoutId)).catch(() => {
        // Ignore cleanup rejection.
      })
    })

    return Promise.race([wrappedOperation, timeoutPromise])
  }, [])

  const fetchEvents = useCallback(async (options?: { background?: boolean }) => {
    if (!user) {
      setEvents([])
      setLoading(false)
      return
    }

    if (isBrowserOffline()) {
      setError(getOfflineMessage())
      setLoading(false)
      return
    }

    const requestId = ++requestIdRef.current
    if (!options?.background) {
      setLoading(true)
    }
    setError(null)

    try {
      const query = supabase
        .from('sessions')
        .select('*')
        .eq('user_id', user.id)
        .order('start_time', { ascending: true })

      const { data, error } = await runWithTimeout(
        query,
        FETCH_TIMEOUT_MS,
        'טעינת האירועים ארכה יותר מדי זמן.'
      )

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
  }, [runWithTimeout, supabase, user])

  useEffect(() => {
    if (!user) {
      setEvents([])
      setLoading(false)
      return
    }

    void fetchEvents()

    const refreshIfVisible = () => {
      if (document.visibilityState === 'visible') {
        void fetchEvents({ background: true })
      }
    }

    const refreshWhenOnline = () => {
      setError(null)
      void fetchEvents({ background: true })
    }

    window.addEventListener('focus', refreshIfVisible)
    window.addEventListener('pageshow', refreshIfVisible)
    window.addEventListener('online', refreshWhenOnline)
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
      window.removeEventListener('online', refreshWhenOnline)
      document.removeEventListener('visibilitychange', refreshIfVisible)
      supabase.removeChannel(channel)
    }
  }, [supabase, user, fetchEvents])

  const addEvent = useCallback(async (data: NewEvent): Promise<{ data: CalendarEvent | null; error: string | null }> => {
    if (!user) return { data: null, error: 'המשתמש לא מחובר.' }
    if (isBrowserOffline()) {
      const message = getOfflineMessage()
      setError(message)
      return { data: null, error: message }
    }

    try {
      const operation = supabase
        .from('sessions')
        .insert({ ...data, user_id: user.id })
        .select()
        .single()

      const { data: event, error } = await runWithTimeout(
        operation,
        MUTATION_TIMEOUT_MS,
        'שמירת האירוע נמשכת יותר מדי זמן. נסה שוב.'
      )

      if (error) {
        setError(error.message)
        return { data: null, error: error.message }
      }

      setEvents((prev) => [...prev, event])
      return { data: event, error: null }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'שגיאה בשמירת האירוע'
      setError(message)
      void fetchEvents({ background: true })
      return { data: null, error: message }
    }
  }, [fetchEvents, runWithTimeout, supabase, user])

  const updateEvent = useCallback(async (id: string, data: Partial<CalendarEvent>) => {
    setEvents((prev) => prev.map((e) => (e.id === id ? { ...e, ...data } : e)))

    try {
      const operation = supabase.from('sessions').update(data).eq('id', id)
      const { error } = await runWithTimeout(
        operation,
        MUTATION_TIMEOUT_MS,
        'עדכון האירוע נמשך יותר מדי זמן. נסה שוב.'
      )

      if (error) {
        throw new Error(error.message)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'שגיאה בעדכון האירוע')
      void fetchEvents()
    }
  }, [fetchEvents, runWithTimeout, supabase])

  const deleteEvent = useCallback(async (id: string) => {
    setEvents((prev) => prev.filter((e) => e.id !== id))

    try {
      const operation = supabase.from('sessions').delete().eq('id', id)
      const { error } = await runWithTimeout(
        operation,
        MUTATION_TIMEOUT_MS,
        'מחיקת האירוע נמשכת יותר מדי זמן. נסה שוב.'
      )

      if (error) {
        throw new Error(error.message)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'שגיאה במחיקת האירוע')
      void fetchEvents()
    }
  }, [fetchEvents, runWithTimeout, supabase])

  const addEventsBatch = useCallback(async (items: NewEvent[]): Promise<CalendarEvent[]> => {
    if (!user || items.length === 0) return []
    if (isBrowserOffline()) {
      setError(getOfflineMessage())
      return []
    }

    try {
      const operation = supabase
        .from('sessions')
        .insert(items.map((item) => ({ ...item, user_id: user.id })))
        .select()

      const { data, error } = await runWithTimeout(
        operation,
        MUTATION_TIMEOUT_MS,
        'שמירת האירועים נמשכת יותר מדי זמן. נסה שוב.'
      )

      if (error) {
        setError(error.message)
        return []
      }

      const saved = data ?? []
      setEvents((prev) => [...prev, ...saved])
      return saved
    } catch (err) {
      setError(err instanceof Error ? err.message : 'שגיאה בשמירת האירועים')
      void fetchEvents({ background: true })
      return []
    }
  }, [fetchEvents, runWithTimeout, supabase, user])

  const deleteEventByTaskId = useCallback(async (taskId: string) => {
    setEvents((prev) => prev.filter((e) => e.task_id !== taskId))

    try {
      const operation = supabase.from('sessions').delete().eq('task_id', taskId)
      const { error } = await runWithTimeout(
        operation,
        MUTATION_TIMEOUT_MS,
        'מחיקת האירוע נמשכת יותר מדי זמן. נסה שוב.'
      )

      if (error) {
        throw new Error(error.message)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'שגיאה במחיקת האירוע')
      void fetchEvents({ background: true })
    }
  }, [fetchEvents, runWithTimeout, supabase])

  const deleteEventsByTaskIds = useCallback(async (taskIds: string[]) => {
    if (taskIds.length === 0) return

    const uniqueTaskIds = Array.from(new Set(taskIds))
    setEvents((prev) => prev.filter((event) => !event.task_id || !uniqueTaskIds.includes(event.task_id)))

    try {
      const operation = supabase.from('sessions').delete().in('task_id', uniqueTaskIds)
      const { error } = await runWithTimeout(
        operation,
        MUTATION_TIMEOUT_MS,
        'מחיקת האירועים נמשכת יותר מדי זמן. נסה שוב.'
      )

      if (error) {
        throw new Error(error.message)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'שגיאה במחיקת האירועים')
      void fetchEvents({ background: true })
    }
  }, [fetchEvents, runWithTimeout, supabase])

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
