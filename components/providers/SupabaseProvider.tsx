'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import type { User } from '@supabase/supabase-js'

const AUTH_PATHS = ['/login', '/signup', '/verify-otp']

const UserContext    = createContext<User | null>(null)
const AdminContext   = createContext<boolean>(false)
const SignOutContext = createContext<() => Promise<void>>(async () => {})

export function SupabaseProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser]       = useState<User | null>(null)
  const [isAdmin, setIsAdmin] = useState(false)
  const [loading, setLoading] = useState(true)
  const supabase = createClient()
  const router   = useRouter()
  const pathname = usePathname()

  const fetchIsAdmin = async (userId: string): Promise<boolean> => {
    const { data } = await supabase
      .from('profiles')
      .select('is_admin')
      .eq('id', userId)
      .single()
    return data?.is_admin ?? false
  }

  useEffect(() => {
    let initialResolved = false

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (!initialResolved) return
      const u = session?.user ?? null
      setUser(u)
      if (u) {
        const admin = await fetchIsAdmin(u.id)
        setIsAdmin(admin)
      } else {
        setIsAdmin(false)
      }
    })

    supabase.auth.getSession().then(async ({ data: { session } }) => {
      initialResolved = true
      const u = session?.user ?? null
      setUser(u)
      if (u) {
        const admin = await fetchIsAdmin(u.id)
        setIsAdmin(admin)
      }
      setLoading(false)
    })

    return () => subscription.unsubscribe()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (loading) return

    // Not logged in → send to login
    if (!user && !AUTH_PATHS.includes(pathname)) {
      router.push('/login')
      return
    }

    // Admin without OTP verified → sign out and send to login
    // (skip this check on auth pages so the login→verify-otp flow can complete)
    if (user && isAdmin && !AUTH_PATHS.includes(pathname)) {
      const otpVerified = typeof window !== 'undefined'
        && localStorage.getItem('otp_verified') === user.id
      if (!otpVerified) {
        supabase.auth.signOut().then(() => router.push('/login'))
        return
      }
    }

    // Non-admin trying to access /admin → send home
    if (user && !isAdmin && pathname.startsWith('/admin')) {
      router.push('/')
    }
  }, [loading, user, isAdmin, pathname, router])

  const signOut = async () => {
    if (typeof window !== 'undefined') localStorage.removeItem('otp_verified')
    await supabase.auth.signOut()
    router.push('/login')
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 rounded-full border-4 border-primary border-t-transparent animate-spin" />
          <p className="text-sm text-muted-foreground">מתחבר...</p>
        </div>
      </div>
    )
  }

  return (
    <SignOutContext.Provider value={signOut}>
      <AdminContext.Provider value={isAdmin}>
        <UserContext.Provider value={user}>{children}</UserContext.Provider>
      </AdminContext.Provider>
    </SignOutContext.Provider>
  )
}

export const useSupabaseUser = () => useContext(UserContext)
export const useIsAdmin      = () => useContext(AdminContext)
export const useSupabaseAuth = () => ({
  user:    useContext(UserContext),
  signOut: useContext(SignOutContext),
})
