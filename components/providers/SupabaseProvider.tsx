'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { User } from '@supabase/supabase-js'

interface AuthState {
  user: User | null
  loading: boolean
  authError: string | null
}

const UserContext = createContext<User | null>(null)

async function signInWithRetry(
  supabase: ReturnType<typeof createClient>,
  attempts = 3,
  delayMs = 1000,
): Promise<{ user: User | null; error: string | null }> {
  for (let i = 0; i < attempts; i++) {
    const { data, error } = await supabase.auth.signInAnonymously()
    if (data.user) return { user: data.user, error: null }
    if (i < attempts - 1) await new Promise((r) => setTimeout(r, delayMs))
    if (error) console.error(`signInAnonymously attempt ${i + 1} failed:`, error.message)
  }
  return { user: null, error: 'כישלון אימות' }
}

export function SupabaseProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AuthState>({ user: null, loading: true, authError: null })
  const supabase = createClient()

  useEffect(() => {
    let initialResolved = false

    // Only used for post-init auth changes (e.g. sign-out, token refresh)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!initialResolved) return // ignore INITIAL_SESSION — handled below
      setState((prev) => ({ ...prev, user: session?.user ?? null }))
    })

    // Determine initial auth state, then sign in anonymously if needed
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session?.user) {
        initialResolved = true
        setState({ user: session.user, loading: false, authError: null })
      } else {
        const { user, error } = await signInWithRetry(supabase)
        initialResolved = true
        if (user) {
          setState({ user, loading: false, authError: null })
        } else {
          setState({ user: null, loading: false, authError: error })
        }
      }
    })

    return () => subscription.unsubscribe()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  if (state.loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 rounded-full border-4 border-primary border-t-transparent animate-spin" />
          <p className="text-sm text-muted-foreground">מתחבר...</p>
        </div>
      </div>
    )
  }

  if (state.authError && !state.user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <div className="max-w-sm w-full rounded-xl border border-red-200 bg-red-50 p-6 flex flex-col gap-3 text-center">
          <p className="font-semibold text-red-700">לא ניתן להתחבר לשירות</p>
          <p className="text-sm text-red-600">
            יש להפעיל <strong>Anonymous Sign-In</strong> בהגדרות Supabase:
          </p>
          <p className="text-xs text-red-500 bg-red-100 rounded px-3 py-2 font-mono">
            Authentication → Providers → Anonymous → Enable
          </p>
          <button
            className="mt-2 text-sm text-red-700 underline underline-offset-2"
            onClick={() => window.location.reload()}
          >
            נסה שוב
          </button>
        </div>
      </div>
    )
  }

  return <UserContext.Provider value={state.user}>{children}</UserContext.Provider>
}

export const useSupabaseUser = () => useContext(UserContext)
