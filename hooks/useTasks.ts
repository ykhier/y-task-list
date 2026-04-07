'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useSupabaseUser } from '@/components/providers/SupabaseProvider'
import type { Task } from '@/types'

type NewTask = Omit<Task, 'id' | 'user_id' | 'created_at' | 'is_completed'>

const FETCH_TIMEOUT_MS = 12000
const MUTATION_TIMEOUT_MS = 15000
const inMemoryTasksCache = new Map<string, Task[]>()

function dedupeTasks(tasks: Task[]) {
  const seen = new Set<string>()
  const unique: Task[] = []

  for (const task of tasks) {
    if (seen.has(task.id)) continue
    seen.add(task.id)
    unique.push(task)
  }

  return unique
}

function getTasksCacheKey(userId: string) {
  return `weekflow.tasks.${userId}`
}

function isBrowserOffline() {
  return typeof navigator !== 'undefined' && navigator.onLine === false
}

function readCachedTasks(userId: string): Task[] | null {
  const memoryTasks = inMemoryTasksCache.get(userId)
  if (memoryTasks) return memoryTasks
  if (typeof window === 'undefined') return null

  try {
    const raw = window.sessionStorage.getItem(getTasksCacheKey(userId))
    if (!raw) return null

    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? (parsed as Task[]) : null
  } catch {
    return null
  }
}

function writeCachedTasks(userId: string, tasks: Task[]) {
  const uniqueTasks = dedupeTasks(tasks)
  inMemoryTasksCache.set(userId, uniqueTasks)
  if (typeof window === 'undefined') return

  try {
    window.sessionStorage.setItem(getTasksCacheKey(userId), JSON.stringify(uniqueTasks))
  } catch {
    // Ignore storage failures and keep the live state working.
  }
}

function getFetchTimeoutMessage() {
  return 'טעינת המשימות ארכה יותר מדי זמן.'
}

function getMutationTimeoutMessage() {
  return 'שמירת המשימה נמשכת יותר מדי זמן. בדוק את החיבור ונסה שוב.'
}

function getOfflineMessage() {
  return 'אין חיבור לרשת כרגע. ברגע שהחיבור יחזור אפשר לשמור שוב.'
}

export function useTasks() {
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [supabase] = useState(() => createClient())
  const user = useSupabaseUser()
  const requestIdRef = useRef(0)
  const hasResolvedInitialFetchRef = useRef(false)

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
        // Swallow cleanup rejection here; the original promise is awaited below.
      })
    })

    return Promise.race([wrappedOperation, timeoutPromise])
  }, [])

  const fetchTasks = useCallback(async (options?: { background?: boolean }) => {
    if (!user) {
      setTasks([])
      setLoading(false)
      hasResolvedInitialFetchRef.current = false
      return
    }

    if (isBrowserOffline()) {
      setError(getOfflineMessage())
      setLoading(false)
      return
    }

    const requestId = ++requestIdRef.current
    const background = options?.background ?? false

    if (!background || !hasResolvedInitialFetchRef.current) {
      setLoading(true)
    }

    setError(null)

    try {
      const query = supabase
        .from('tasks')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

      const { data, error } = await runWithTimeout(
        query,
        FETCH_TIMEOUT_MS,
        getFetchTimeoutMessage()
      )

      if (requestId !== requestIdRef.current) return

      if (error) {
        setError(error.message)
        return
      }

      const nextTasks = dedupeTasks(data ?? [])
      setTasks(nextTasks)
      writeCachedTasks(user.id, nextTasks)
    } catch (err) {
      if (requestId !== requestIdRef.current) return
      setError(err instanceof Error ? err.message : 'שגיאה בטעינת המשימות')
    } finally {
      if (requestId === requestIdRef.current) {
        hasResolvedInitialFetchRef.current = true
        setLoading(false)
      }
    }
  }, [runWithTimeout, supabase, user])

  useEffect(() => {
    if (!user) {
      setTasks([])
      setLoading(false)
      hasResolvedInitialFetchRef.current = false
      return
    }

    const cachedTasks = readCachedTasks(user.id)
    if (cachedTasks) {
      setTasks(dedupeTasks(cachedTasks))
      setLoading(false)
      hasResolvedInitialFetchRef.current = true
    }

    void fetchTasks()

    const refreshIfVisible = () => {
      if (document.visibilityState === 'visible') {
        void fetchTasks({ background: true })
      }
    }

    const refreshWhenOnline = () => {
      setError(null)
      void fetchTasks({ background: true })
    }

    window.addEventListener('focus', refreshIfVisible)
    window.addEventListener('pageshow', refreshIfVisible)
    window.addEventListener('online', refreshWhenOnline)
    document.addEventListener('visibilitychange', refreshIfVisible)

    const channel = supabase
      .channel(`tasks-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'tasks',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            const incoming = payload.new as Task
            setTasks((prev) => {
              const nextTasks = dedupeTasks([incoming, ...prev])
              writeCachedTasks(user.id, nextTasks)
              return nextTasks
            })
          } else if (payload.eventType === 'UPDATE') {
            setTasks((prev) => {
              const nextTasks = dedupeTasks(
                prev.map((t) => (t.id === payload.new.id ? (payload.new as Task) : t))
              )
              writeCachedTasks(user.id, nextTasks)
              return nextTasks
            })
          } else if (payload.eventType === 'DELETE') {
            setTasks((prev) => {
              const nextTasks = prev.filter((t) => t.id !== payload.old.id)
              writeCachedTasks(user.id, nextTasks)
              return nextTasks
            })
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
  }, [supabase, user, fetchTasks])

  useEffect(() => {
    if (!user) return
    writeCachedTasks(user.id, tasks)
  }, [user, tasks])

  const addTask = useCallback(async (data: NewTask): Promise<Task | null> => {
    if (!user) {
      setError('המשתמש לא מחובר.')
      return null
    }

    if (isBrowserOffline()) {
      setError(getOfflineMessage())
      return null
    }

    setError(null)

    try {
      const operation = supabase
        .from('tasks')
        .insert({ ...data, user_id: user.id, is_completed: false })
        .select()
        .single()

      const { data: task, error } = await runWithTimeout(
        operation,
        MUTATION_TIMEOUT_MS,
        getMutationTimeoutMessage()
      )

      if (error) {
        setError(error.message)
        return null
      }

      setTasks((prev) => {
        const nextTasks = dedupeTasks([task, ...prev])
        writeCachedTasks(user.id, nextTasks)
        return nextTasks
      })

      return task
    } catch (err) {
      setError(err instanceof Error ? err.message : 'שגיאה בשמירת המשימה')
      void fetchTasks({ background: true })
      return null
    }
  }, [fetchTasks, runWithTimeout, supabase, user])

  const toggleTask = useCallback(async (id: string, completed: boolean) => {
    setTasks((prev) => {
      const nextTasks = prev.map((t) => (t.id === id ? { ...t, is_completed: completed } : t))
      if (user) writeCachedTasks(user.id, nextTasks)
      return nextTasks
    })

    try {
      const operation = supabase.from('tasks').update({ is_completed: completed }).eq('id', id)
      const { error } = await runWithTimeout(
        operation,
        MUTATION_TIMEOUT_MS,
        'עדכון המשימה נמשך יותר מדי זמן. נסה שוב.'
      )

      if (error) {
        throw new Error(error.message)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'שגיאה בעדכון המשימה')
      setTasks((prev) => {
        const nextTasks = prev.map((t) => (t.id === id ? { ...t, is_completed: !completed } : t))
        if (user) writeCachedTasks(user.id, nextTasks)
        return nextTasks
      })
    }
  }, [runWithTimeout, supabase, user])

  const deleteTask = useCallback(async (id: string) => {
    setTasks((prev) => {
      const nextTasks = prev.filter((t) => t.id !== id)
      if (user) writeCachedTasks(user.id, nextTasks)
      return nextTasks
    })

    try {
      const operation = supabase.from('tasks').delete().eq('id', id)
      const { error } = await runWithTimeout(
        operation,
        MUTATION_TIMEOUT_MS,
        'מחיקת המשימה נמשכת יותר מדי זמן. נסה שוב.'
      )

      if (error) {
        throw new Error(error.message)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'שגיאה במחיקת המשימה')
      void fetchTasks()
    }
  }, [fetchTasks, runWithTimeout, supabase, user])

  const deleteTasksByIds = useCallback(async (ids: string[]) => {
    if (!user || ids.length === 0) return

    const uniqueIds = Array.from(new Set(ids))
    setTasks((prev) => {
      const nextTasks = prev.filter((task) => !uniqueIds.includes(task.id))
      writeCachedTasks(user.id, nextTasks)
      return nextTasks
    })

    try {
      const operation = supabase.from('tasks').delete().in('id', uniqueIds)
      const { error } = await runWithTimeout(
        operation,
        MUTATION_TIMEOUT_MS,
        'מחיקת המשימות נמשכת יותר מדי זמן. נסה שוב.'
      )

      if (error) {
        throw new Error(error.message)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'שגיאה במחיקת המשימות')
      void fetchTasks()
    }
  }, [fetchTasks, runWithTimeout, supabase, user])

  const addTasksBatch = useCallback(async (items: NewTask[]): Promise<Task[]> => {
    if (!user || items.length === 0) return []

    if (isBrowserOffline()) {
      setError(getOfflineMessage())
      return []
    }

    try {
      const operation = supabase
        .from('tasks')
        .insert(items.map((item) => ({ ...item, user_id: user.id, is_completed: false })))
        .select()

      const { data, error } = await runWithTimeout(
        operation,
        MUTATION_TIMEOUT_MS,
        'שמירת המשימות נמשכת יותר מדי זמן. נסה שוב.'
      )

      if (error) {
        setError(error.message)
        return []
      }

      const saved = data ?? []
      setTasks((prev) => {
        const nextTasks = dedupeTasks([...saved, ...prev])
        writeCachedTasks(user.id, nextTasks)
        return nextTasks
      })

      return saved
    } catch (err) {
      setError(err instanceof Error ? err.message : 'שגיאה בשמירת המשימות')
      void fetchTasks({ background: true })
      return []
    }
  }, [fetchTasks, runWithTimeout, supabase, user])

  const updateTask = useCallback(async (id: string, data: Partial<Task>) => {
    setTasks((prev) => {
      const nextTasks = prev.map((t) => (t.id === id ? { ...t, ...data } : t))
      if (user) writeCachedTasks(user.id, nextTasks)
      return nextTasks
    })

    try {
      const operation = supabase.from('tasks').update(data).eq('id', id)
      const { error } = await runWithTimeout(
        operation,
        MUTATION_TIMEOUT_MS,
        'שמירת השינויים נמשכת יותר מדי זמן. נסה שוב.'
      )

      if (error) {
        throw new Error(error.message)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'שגיאה בשמירת השינויים')
      void fetchTasks()
    }
  }, [fetchTasks, runWithTimeout, supabase, user])

  return {
    tasks,
    loading,
    error,
    addTask,
    addTasksBatch,
    toggleTask,
    deleteTask,
    deleteTasksByIds,
    updateTask,
    refetchTasks: fetchTasks,
  }
}
