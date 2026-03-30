'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useSupabaseUser } from '@/components/providers/SupabaseProvider'
import type { Task } from '@/types'

type NewTask = Omit<Task, 'id' | 'user_id' | 'created_at' | 'is_completed'>

export function useTasks() {
  const [tasks, setTasks]     = useState<Task[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState<string | null>(null)

  const supabase = createClient()
  const user = useSupabaseUser()

  const fetchTasks = useCallback(async () => {
    if (!user) return
    setLoading(true)
    const { data, error } = await supabase
      .from('tasks')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }

    setTasks(data ?? [])
    setLoading(false)
  }, [user])

  // Fetch + real-time subscription — scoped to this user
  useEffect(() => {
    if (!user) return
    fetchTasks()

    const channel = supabase
      .channel(`tasks-${user.id}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'tasks',
        filter: `user_id=eq.${user.id}`,
      }, (payload) => {
        if (payload.eventType === 'INSERT') {
          const incoming = payload.new as Task
          setTasks((prev) =>
            prev.some((t) => t.id === incoming.id) ? prev : [incoming, ...prev]
          )
        } else if (payload.eventType === 'UPDATE') {
          setTasks((prev) =>
            prev.map((t) => (t.id === payload.new.id ? (payload.new as Task) : t))
          )
        } else if (payload.eventType === 'DELETE') {
          setTasks((prev) => prev.filter((t) => t.id !== payload.old.id))
        }
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [user, fetchTasks])

  // --- Mutations ---

  const addTask = useCallback(async (data: NewTask): Promise<Task | null> => {
    if (!user) return null
    const { data: task, error } = await supabase
      .from('tasks')
      .insert({ ...data, user_id: user.id, is_completed: false })
      .select()
      .single()
    if (error) { setError(error.message); return null }
    setTasks((prev) => [task, ...prev])
    return task
  }, [user])

  const toggleTask = useCallback(async (id: string, completed: boolean) => {
    // Optimistic update
    setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, is_completed: completed } : t)))
    const { error } = await supabase
      .from('tasks')
      .update({ is_completed: completed })
      .eq('id', id)
    if (error) {
      setError(error.message)
      // Revert on failure
      setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, is_completed: !completed } : t)))
    }
  }, [])

  const deleteTask = useCallback(async (id: string) => {
    setTasks((prev) => prev.filter((t) => t.id !== id))
    const { error } = await supabase.from('tasks').delete().eq('id', id)
    if (error) { setError(error.message); fetchTasks() }
  }, [fetchTasks])

  const addTasksBatch = useCallback(async (items: NewTask[]): Promise<Task[]> => {
    if (!user || items.length === 0) return []
    const { data, error } = await supabase
      .from('tasks')
      .insert(items.map((item) => ({ ...item, user_id: user.id, is_completed: false })))
      .select()
    if (error) { setError(error.message); return [] }
    const saved = data ?? []
    setTasks((prev) => [...saved, ...prev])
    return saved
  }, [user])

  const updateTask = useCallback(async (id: string, data: Partial<Task>) => {
    setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, ...data } : t)))
    const { error } = await supabase.from('tasks').update(data).eq('id', id)
    if (error) { setError(error.message); fetchTasks() }
  }, [fetchTasks])

  return { tasks, loading, error, addTask, addTasksBatch, toggleTask, deleteTask, updateTask }
}
