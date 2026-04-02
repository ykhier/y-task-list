'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { CalendarDays } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import PasswordInput from '@/components/ui/PasswordInput'
import { createClient } from '@/lib/supabase/client'

export default function LoginPage() {
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState<string | null>(null)
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const supabase = createClient()
    const { data: signInData, error: authError } = await supabase.auth.signInWithPassword({ email, password })

    if (authError) {
      const msg = authError.message.toLowerCase()
      const code = (authError as { code?: string }).code ?? ''
      const isUnconfirmed =
        msg.includes('email not confirmed') ||
        msg.includes('email_not_confirmed') ||
        code === 'email_not_confirmed'
      setError(
        isUnconfirmed
          ? 'יש לאמת את האימייל לפני ההתחברות — בדוק את תיבת הדואר שלך'
          : 'אימייל או סיסמא שגויים'
      )
      setLoading(false)
      return
    }

    const userId      = signInData.user?.id
    const accessToken = signInData.session?.access_token

    if (userId && accessToken) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('is_admin')
        .eq('id', userId)
        .maybeSingle()

      if (profile?.is_admin) {
        // Send OTP now while we have a guaranteed-fresh session token
        const res = await fetch('/api/send-otp', {
          method: 'POST',
          headers: { Authorization: `Bearer ${accessToken}` },
        })

        if (!res.ok) {
          const data = await res.json()
          setError(data.error ?? 'שגיאה בשליחת קוד אימות')
          // Sign out so they don't get stuck
          await supabase.auth.signOut()
          setLoading(false)
          return
        }

        // Store the token so verify-otp page can use it for Bearer auth
        sessionStorage.setItem('otp_token', accessToken)
        router.push('/verify-otp')
        return
      }
    }

    router.push('/')
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-slate-50 to-indigo-50 p-4">
      {/* Decorative blobs */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 h-80 w-80 rounded-full bg-blue-100 opacity-60 blur-3xl" />
        <div className="absolute -bottom-40 -left-40 h-80 w-80 rounded-full bg-indigo-100 opacity-60 blur-3xl" />
      </div>

      <div className="relative w-full max-w-md">
        {/* Card */}
        <div className="rounded-2xl bg-white shadow-xl border border-slate-100 p-8">

          {/* Logo */}
          <div className="flex flex-col items-center gap-3 mb-8">
            <div className="h-12 w-12 rounded-2xl bg-blue-500 flex items-center justify-center shadow-md shadow-blue-200">
              <CalendarDays className="h-6 w-6 text-white" />
            </div>
            <div className="text-center">
              <h1 className="text-xl font-bold text-slate-800">WeekFlow</h1>
              <p className="text-sm text-slate-500 mt-1">התחבר לחשבונך כדי להמשיך</p>
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="email" className="text-sm font-medium text-slate-700">אימייל</Label>
              <Input
                id="email"
                type="email"
                placeholder="your@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="h-10 text-sm"
                dir="ltr"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="password" className="text-sm font-medium text-slate-700">סיסמא</Label>
              <PasswordInput
                id="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="h-10"
              />
            </div>

            {error && (
              <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                {error}
              </p>
            )}

            <Button type="submit" className="w-full h-10 mt-1 text-sm font-semibold" disabled={loading}>
              {loading ? (
                <span className="flex items-center gap-2">
                  <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  מתחבר...
                </span>
              ) : 'התחבר'}
            </Button>
          </form>

          {/* Signup link */}
          <p className="text-center text-sm text-slate-500 mt-6">
            אין לך חשבון?{' '}
            <Link href="/signup" className="text-blue-500 hover:text-blue-600 font-semibold">
              הירשם בחינם
            </Link>
          </p>
        </div>

        <p className="text-center text-xs text-slate-400 mt-4">
          WeekFlow © 2026 · כל הזכויות שמורות
        </p>
      </div>
    </div>
  )
}
