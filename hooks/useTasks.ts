'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useSupabaseUser } from '@/components/providers/SupabaseProvider'
import type { Task } from '@/types'

type NewTask = Omit<Task, 'id' | 'user_id' | 'created_at' | 'is_completed'>

const FETCH_TIMEOUT_MS = 12000
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

export function useTasks() {
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [supabase] = useState(() => createClient())
  const user = useSupabaseUser()
  const requestIdRef = useRef(0)
  const hasResolvedInitialFetchRef = useRef(false)

  const fetchTasks = useCallback(async (options?: { background?: boolean }) => {
    if (!user) {
      setTasks([])
      setLoading(false)
      hasResolvedInitialFetchRef.current = false
      return
    }

    const requestId = ++requestIdRef.current
    const background = options?.background ?? false

    if (!background || !hasResolvedInitialFetchRef.current) {
      setLoading(true)
    }

    setError(null)

    const timeout = new Promise<never>((_, reject) => {
      window.setTimeout(() => reject(new Error('טעינת המשימות ארכה יותר מדי זמן.')), FETCH_TIMEOUT_MS)
    })

    try {
      const query = supabase
        .from('tasks')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

      const { data, error } = await Promise.race([query, timeout])
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
  }, [supabase, user])

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

    window.addEventListener('focus', refreshIfVisible)
    window.addEventListener('pageshow', refreshIfVisible)
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
      document.removeEventListener('visibilitychange', refreshIfVisible)
      supabase.removeChannel(channel)
    }
  }, [supabase, user, fetchTasks])

  useEffect(() => {
    if (!user) return
    writeCachedTasks(user.id, tasks)
  }, [user, tasks])

  const addTask = useCallback(async (data: NewTask): Promise<Task | null> => {
    if (!user) return null
    const { data: task, error } = await supabase
      .from('tasks')
      .insert({ ...data, user_id: user.id, is_completed: false })
      .select()
      .single()
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
  }, [supabase, user])

  const toggleTask = useCallback(async (id: string, completed: boolean) => {
    setTasks((prev) => {
      const nextTasks = prev.map((t) => (t.id === id ? { ...t, is_completed: completed } : t))
      if (user) writeCachedTasks(user.id, nextTasks)
      return nextTasks
    })
    const { error } = await supabase.from('tasks').update({ is_completed: completed }).eq('id', id)
    if (error) {
      setError(error.message)
      setTasks((prev) => {
        const nextTasks = prev.map((t) => (t.id === id ? { ...t, is_completed: !completed } : t))
        if (user) writeCachedTasks(user.id, nextTasks)
        return nextTasks
      })
    }
  }, [supabase, user])

  const deleteTask = useCallback(async (id: string) => {
    setTasks((prev) => {
      const nextTasks = prev.filter((t) => t.id !== id)
      if (user) writeCachedTasks(user.id, nextTasks)
      return nextTasks
    })
    const { error } = await supabase.from('tasks').delete().eq('id', id)
    if (error) {
      setError(error.message)
      void fetchTasks()
    }
  }, [fetchTasks, supabase, user])

  const addTasksBatch = useCallback(async (items: NewTask[]): Promise<Task[]> => {
    if (!user || items.length === 0) return []
    const { data, error } = await supabase
      .from('tasks')
      .insert(items.map((item) => ({ ...item, user_id: user.id, is_completed: false })))
      .select()
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
  }, [supabase, user])

  const updateTask = useCallback(async (id: string, data: Partial<Task>) => {
    setTasks((prev) => {
      const nextTasks = prev.map((t) => (t.id === id ? { ...t, ...data } : t))
      if (user) writeCachedTasks(user.id, nextTasks)
      return nextTasks
    })
    const { error } = await supabase.from('tasks').update(data).eq('id', id)
    if (error) {
      setError(error.message)
      void fetchTasks()
    }
  }, [fetchTasks, supabase, user])

  return { tasks, loading, error, addTask, addTasksBatch, toggleTask, deleteTask, updateTask, refetchTasks: fetchTasks }
}
