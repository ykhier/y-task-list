'use client'

import { useState, useRef, useEffect } from 'react'
import { User, LogOut, Shield, ChevronDown, CalendarDays } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import PasswordInput from '@/components/ui/PasswordInput'

/* ─── Helpers ─── */

function GoogleIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className="h-4 w-4 flex-shrink-0">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
    </svg>
  )
}

function initials(name: string) {
  return name.split(' ').map((w) => w[0]).slice(0, 2).join('')
}

/* ─── Mock user ─── */

const MOCK_USER = {
  name:  'ישראל ישראלי',
  email: 'israel@example.com',
  role:  'admin' as 'admin' | 'user',
  color: 'bg-blue-500',
}

/* ─── Shared small pieces ─── */

function BrandingHeader({ view }: { view: 'login' | 'signup' }) {
  return (
    <div className="flex flex-col items-center gap-2 px-6 pt-6 pb-4">
      <div className="h-9 w-9 rounded-xl bg-blue-500 flex items-center justify-center shadow-sm shadow-blue-200">
        <CalendarDays className="h-4 w-4 text-white" />
      </div>
      <div className="text-center">
        <p className="text-sm font-bold text-slate-800">
          {view === 'login' ? 'ברוך הבא' : 'צור חשבון חדש'}
        </p>
        <p className="text-[11px] text-slate-400 mt-0.5">
          {view === 'login' ? 'התחבר לחשבון WeekFlow שלך' : 'הצטרף ל-WeekFlow בחינם'}
        </p>
      </div>
    </div>
  )
}

function GoogleButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <div className="px-5">
      <button
        type="button"
        onClick={onClick}
        className="w-full flex items-center justify-center gap-2.5 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50 hover:border-slate-300 transition-all cursor-pointer"
      >
        <GoogleIcon />
        {label}
      </button>
    </div>
  )
}

function EmailDivider() {
  return (
    <div className="flex items-center gap-2 px-5 my-3">
      <div className="flex-1 h-px bg-slate-100" />
      <span className="text-[11px] text-slate-400">או עם אימייל</span>
      <div className="flex-1 h-px bg-slate-100" />
    </div>
  )
}

function Spinner() {
  return (
    <svg className="animate-spin h-3.5 w-3.5" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  )
}

/* ═══════════════════════════════════════
   GUEST PANEL — login / signup
═══════════════════════════════════════ */

function GuestPanel({ onClose }: { onClose: () => void }) {
  const [view, setView]       = useState<'login' | 'signup'>('login')
  const [email, setEmail]     = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [name, setName]       = useState('')
  const [loading, setLoading] = useState(false)

  const passwordMismatch = !!confirm && confirm !== password

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setLoading(true)
    setTimeout(() => { setLoading(false); onClose() }, 1200)
  }

  const switchToSignup = () => { setView('signup'); setPassword(''); setConfirm('') }
  const switchToLogin  = () => { setView('login');  setConfirm('') }

  return (
    <div className="w-[300px]">

      <BrandingHeader view={view} />

      <GoogleButton
        label={view === 'login' ? 'התחבר עם Google' : 'הרשמה עם Google'}
        onClick={onClose}
      />

      <EmailDivider />

      {/* ── Form ── */}
      <form onSubmit={handleSubmit} className="px-5 flex flex-col gap-2.5">

        {view === 'signup' && (
          <div className="flex flex-col gap-1">
            <Label htmlFor="ud-name" className="text-xs text-slate-600 font-medium">שם מלא</Label>
            <Input id="ud-name" type="text" placeholder="ישראל ישראלי"
              value={name} onChange={(e) => setName(e.target.value)}
              required className="h-9 text-sm" />
          </div>
        )}

        <div className="flex flex-col gap-1">
          <Label htmlFor="ud-email" className="text-xs text-slate-600 font-medium">אימייל</Label>
          <Input id="ud-email" type="email" placeholder="your@email.com"
            value={email} onChange={(e) => setEmail(e.target.value)}
            required className="h-9 text-sm" dir="ltr" />
        </div>

        <div className="flex flex-col gap-1">
          <div className="flex items-center justify-between">
            <Label htmlFor="ud-pass" className="text-xs text-slate-600 font-medium">סיסמא</Label>
            {view === 'login' && (
              <button type="button" className="text-[11px] text-blue-500 hover:text-blue-600 cursor-pointer">
                שכחת סיסמא?
              </button>
            )}
          </div>
          <PasswordInput
            id="ud-pass"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>

        {view === 'signup' && (
          <div className="flex flex-col gap-1">
            <Label htmlFor="ud-confirm" className="text-xs text-slate-600 font-medium">אימות סיסמא</Label>
            <PasswordInput
              id="ud-confirm"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              required
              className={
                confirm && confirm !== password ? 'border-red-300' :
                confirm && confirm === password ? 'border-green-300' : ''
              }
            />
            {passwordMismatch && (
              <p className="text-[11px] text-red-500">הסיסמאות לא תואמות</p>
            )}
          </div>
        )}

        <Button type="submit" className="w-full h-9 text-sm mt-1"
          disabled={loading || (view === 'signup' && passwordMismatch)}>
          {loading
            ? <span className="flex items-center gap-2">
                <Spinner />
                {view === 'login' ? 'מתחבר...' : 'נרשם...'}
              </span>
            : view === 'login' ? 'התחבר' : 'צור חשבון'
          }
        </Button>
      </form>

      {/* ── Switch view footer ── */}
      <div className="px-5 py-4 mt-2 border-t border-slate-100 bg-slate-50/80 rounded-b-2xl text-center">
        {view === 'login' ? (
          <p className="text-xs text-slate-500">
            אין לך חשבון?{' '}
            <button type="button" onClick={switchToSignup}
              className="text-blue-500 hover:text-blue-600 font-semibold cursor-pointer">
              הירשם בחינם
            </button>
          </p>
        ) : (
          <p className="text-xs text-slate-500">
            כבר יש לך חשבון?{' '}
            <button type="button" onClick={switchToLogin}
              className="text-blue-500 hover:text-blue-600 font-semibold cursor-pointer">
              התחבר
            </button>
          </p>
        )}
      </div>
    </div>
  )
}

/* ═══════════════════════════════════════
   LOGGED-IN PANEL
═══════════════════════════════════════ */

function LoggedInPanel({ onClose }: { onClose: () => void }) {
  const isAdmin = MOCK_USER.role === 'admin'
  return (
    <div className="w-56">
      <div className="px-4 py-3.5 border-b border-slate-100">
        <div className="flex items-center gap-3">
          <div className={cn('h-9 w-9 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0', MOCK_USER.color)}>
            {initials(MOCK_USER.name)}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-slate-800 truncate">{MOCK_USER.name}</p>
            <p className="text-xs text-slate-400 truncate" dir="ltr">{MOCK_USER.email}</p>
          </div>
        </div>
        {isAdmin && (
          <div className="mt-2 inline-flex items-center gap-1 rounded-full bg-violet-50 border border-violet-200 text-violet-600 text-[11px] font-semibold px-2 py-0.5">
            <Shield className="h-3 w-3" />
            אדמין
          </div>
        )}
      </div>
      <div className="p-2">
        <button onClick={onClose}
          className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-red-600 hover:bg-red-50 transition-colors cursor-pointer font-medium">
          <LogOut className="h-4 w-4" />
          התנתק
        </button>
      </div>
    </div>
  )
}

/* ═══════════════════════════════════════
   TRIGGER BUTTON — guest vs logged-in
═══════════════════════════════════════ */

function GuestTrigger({ open, onClick }: { open: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick}
      className={cn(
        'h-9 w-9 rounded-xl flex items-center justify-center transition-colors cursor-pointer border',
        open
          ? 'bg-blue-50 border-blue-200 text-blue-600'
          : 'bg-white border-slate-200 text-slate-500 hover:border-slate-300 hover:text-slate-700 hover:bg-slate-50'
      )}
      title="התחבר / הירשם">
      <User className="h-4 w-4" />
    </button>
  )
}

function LoggedInTrigger({ open, onClick }: { open: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick}
      className={cn(
        'flex items-center gap-1.5 rounded-xl px-2 py-1 transition-colors cursor-pointer',
        open ? 'bg-slate-100' : 'hover:bg-slate-100'
      )}>
      <div className="hidden sm:flex flex-col items-end">
        <span className="text-xs font-semibold text-slate-700 leading-tight">{MOCK_USER.name}</span>
        {MOCK_USER.role === 'admin' && (
          <span className="text-[10px] text-violet-500 font-medium leading-tight flex items-center gap-0.5">
            <Shield className="h-2.5 w-2.5" />
            אדמין
          </span>
        )}
      </div>
      <div className={cn('h-8 w-8 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0', MOCK_USER.color)}>
        {initials(MOCK_USER.name)}
      </div>
      <ChevronDown className={cn('h-3.5 w-3.5 text-slate-400 transition-transform duration-150', open && 'rotate-180')} />
    </button>
  )
}

/* ═══════════════════════════════════════
   MAIN EXPORT
═══════════════════════════════════════ */

interface UserDropdownProps {
  isLoggedIn?: boolean
}

export default function UserDropdown({ isLoggedIn = false }: UserDropdownProps) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  const toggle = () => setOpen(!open)
  const close  = () => setOpen(false)

  return (
    <div ref={ref} className="relative">

      {isLoggedIn
        ? <LoggedInTrigger open={open} onClick={toggle} />
        : <GuestTrigger    open={open} onClick={toggle} />
      }

      {open && (
        <div className="absolute end-0 top-full mt-2 rounded-2xl bg-white border border-slate-200 shadow-xl overflow-hidden z-50">
          {isLoggedIn
            ? <LoggedInPanel onClose={close} />
            : <GuestPanel    onClose={close} />
          }
        </div>
      )}
    </div>
  )
}
