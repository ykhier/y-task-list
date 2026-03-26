'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { User } from '@supabase/supabase-js'

const UserContext = createContext<User | null>(null)

export function SupabaseProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const supabase = createClient()

  useEffect(() => {
    // Subscribe to auth changes first (prevents race)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, session) => {
      setUser(session?.user ?? null)
    })

    // Try existing session, otherwise sign in anonymously
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setUser(session.user)
      } else {
        // Anonymous sign-in creates a real auth.uid() so RLS policies work
        supabase.auth.signInAnonymously().then(({ data, error }) => {
          if (error) console.error('signInAnonymously failed:', error.message)
          if (data.user) setUser(data.user)
        })
      }
    })

    return () => subscription.unsubscribe()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return <UserContext.Provider value={user}>{children}</UserContext.Provider>
}

export const useSupabaseUser = () => useContext(UserContext)
