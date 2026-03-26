'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Eye, EyeOff, CalendarDays, Check } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

function GoogleIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className="h-4 w-4">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
    </svg>
  )
}

function PasswordStrength({ password }: { password: string }) {
  const checks = [
    { label: 'לפחות 8 תווים', ok: password.length >= 8 },
    { label: 'אות גדולה', ok: /[A-Z]/.test(password) },
    { label: 'מספר', ok: /\d/.test(password) },
  ]
  if (!password) return null
  return (
    <div className="flex flex-col gap-1 mt-1">
      {checks.map((c) => (
        <div key={c.label} className={`flex items-center gap-1.5 text-xs transition-colors ${c.ok ? 'text-green-600' : 'text-slate-400'}`}>
          <Check className={`h-3 w-3 ${c.ok ? 'opacity-100' : 'opacity-30'}`} />
          {c.label}
        </div>
      ))}
    </div>
  )
}

export default function SignupPage() {
  const [showPassword, setShowPassword]     = useState(false)
  const [showConfirm, setShowConfirm]       = useState(false)
  const [fullName, setFullName]             = useState('')
  const [email, setEmail]                   = useState('')
  const [password, setPassword]             = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading]               = useState(false)

  const passwordMatch = password && confirmPassword && password === confirmPassword

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setTimeout(() => setLoading(false), 1500)
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-slate-50 to-indigo-50 p-4">
      {/* Decorative blobs */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 h-80 w-80 rounded-full bg-blue-100 opacity-60 blur-3xl" />
        <div className="absolute -bottom-40 -left-40 h-80 w-80 rounded-full bg-indigo-100 opacity-60 blur-3xl" />
      </div>

      <div className="relative w-full max-w-md">
        <div className="rounded-2xl bg-white shadow-xl border border-slate-100 p-8">

          {/* Logo */}
          <div className="flex flex-col items-center gap-3 mb-8">
            <div className="h-12 w-12 rounded-2xl bg-blue-500 flex items-center justify-center shadow-md shadow-blue-200">
              <CalendarDays className="h-6 w-6 text-white" />
            </div>
            <div className="text-center">
              <h1 className="text-xl font-bold text-slate-800">צור חשבון חדש</h1>
              <p className="text-sm text-slate-500 mt-1">הצטרף ל-WeekFlow בחינם</p>
            </div>
          </div>

          {/* Google button */}
          <button
            type="button"
            className="w-full flex items-center justify-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50 hover:border-slate-300 transition-all duration-150 cursor-pointer"
          >
            <GoogleIcon />
            הרשמה עם Google
          </button>

          {/* Divider */}
          <div className="flex items-center gap-3 my-5">
            <div className="flex-1 h-px bg-slate-200" />
            <span className="text-xs text-slate-400 font-medium">או עם אימייל</span>
            <div className="flex-1 h-px bg-slate-200" />
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            {/* Full name */}
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="name" className="text-sm font-medium text-slate-700">שם מלא</Label>
              <Input
                id="name"
                type="text"
                placeholder="ישראל ישראלי"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
                className="h-10 text-sm"
              />
            </div>

            {/* Email */}
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

            {/* Password */}
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="password" className="text-sm font-medium text-slate-700">סיסמא</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="h-10 text-sm pe-10"
                  dir="ltr"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 end-0 px-3 flex items-center text-slate-400 hover:text-slate-600 cursor-pointer"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              <PasswordStrength password={password} />
            </div>

            {/* Confirm password */}
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="confirm" className="text-sm font-medium text-slate-700">אימות סיסמא</Label>
              <div className="relative">
                <Input
                  id="confirm"
                  type={showConfirm ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  className={`h-10 text-sm pe-10 ${
                    confirmPassword && !passwordMatch
                      ? 'border-red-300 focus-visible:ring-red-400'
                      : passwordMatch
                      ? 'border-green-300 focus-visible:ring-green-400'
                      : ''
                  }`}
                  dir="ltr"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirm(!showConfirm)}
                  className="absolute inset-y-0 end-0 px-3 flex items-center text-slate-400 hover:text-slate-600 cursor-pointer"
                  tabIndex={-1}
                >
                  {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {confirmPassword && !passwordMatch && (
                <p className="text-xs text-red-500">הסיסמאות לא תואמות</p>
              )}
            </div>

            <Button
              type="submit"
              className="w-full h-10 mt-1 text-sm font-semibold"
              disabled={loading || (!!confirmPassword && !passwordMatch)}
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  נרשם...
                </span>
              ) : 'צור חשבון'}
            </Button>
          </form>

          {/* Login link */}
          <p className="text-center text-sm text-slate-500 mt-6">
            כבר יש לך חשבון?{' '}
            <Link href="/login" className="text-blue-500 hover:text-blue-600 font-semibold">
              התחבר
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
