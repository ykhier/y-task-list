'use client'

import { useState, useEffect } from 'react'
import { CalendarDays, ListTodo, Repeat2, Menu, X, ChevronLeft } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { TabView } from '@/types'

interface NavbarProps {
  activeTab: TabView
  onTabChange: (tab: TabView) => void
}

const TABS: {
  label: string
  sublabel: string
  value: TabView
  Icon: React.ElementType
  activeGradient: string
  activeShadow: string
  iconBg: string
  iconColor: string
}[] = [
  {
    label: 'לוח שבועי',
    sublabel: 'הצג את לוח הזמנים השבועי',
    value: 'calendar',
    Icon: CalendarDays,
    activeGradient: 'from-blue-500 to-blue-600',
    activeShadow: 'shadow-blue-200',
    iconBg: 'bg-blue-50',
    iconColor: 'text-blue-500',
  },
  {
    label: 'משימות',
    sublabel: 'נהל את רשימת המשימות',
    value: 'tasks',
    Icon: ListTodo,
    activeGradient: 'from-violet-500 to-violet-600',
    activeShadow: 'shadow-violet-200',
    iconBg: 'bg-violet-50',
    iconColor: 'text-violet-500',
  },
  {
    label: 'קבועות',
    sublabel: 'פריטים חוזרים שבועית',
    value: 'recurring',
    Icon: Repeat2,
    activeGradient: 'from-violet-500 to-violet-600',
    activeShadow: 'shadow-violet-200',
    iconBg: 'bg-violet-50',
    iconColor: 'text-violet-500',
  },
]

export default function Navbar({ activeTab, onTabChange }: NavbarProps) {
  const [menuOpen, setMenuOpen] = useState(false)

  // Close on Escape
  useEffect(() => {
    if (!menuOpen) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setMenuOpen(false) }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [menuOpen])

  // Lock body scroll while menu is open
  useEffect(() => {
    document.body.style.overflow = menuOpen ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [menuOpen])

  const handleTabChange = (tab: TabView) => {
    onTabChange(tab)
    setMenuOpen(false)
  }

  const activeTab_ = TABS.find((t) => t.value === activeTab)

  return (
    <>
      {/* ── Top bar ── */}
      <nav className="flex items-center h-14 border-b border-slate-100 bg-white px-3 sm:px-4 gap-1 flex-shrink-0">
        {/* Logo */}
        <div className="flex items-center gap-2 me-3 sm:me-6 flex-shrink-0">
          <div className="h-7 w-7 rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow-sm shadow-blue-200">
            <CalendarDays className="h-4 w-4 text-white" />
          </div>
          <span className="hidden sm:block text-sm font-semibold text-slate-800 tracking-tight">WeekFlow</span>
        </div>

        {/* Desktop tabs — inline */}
        <div className="hidden sm:flex items-center gap-0.5 flex-1">
          {TABS.map(({ label, value, Icon }) => (
            <button
              key={value}
              onClick={() => onTabChange(value)}
              aria-selected={activeTab === value}
              role="tab"
              className={cn(
                'flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 py-2 min-h-[44px] sm:min-h-0 rounded-lg text-sm font-medium transition-colors duration-150 cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500',
                activeTab === value
                  ? 'bg-blue-50 text-blue-600'
                  : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50',
              )}
            >
              <Icon className="h-4 w-4 flex-shrink-0" />
              <span>{label}</span>
            </button>
          ))}
        </div>

        {/* Mobile: active tab label + hamburger */}
        <div className="flex sm:hidden items-center flex-1 min-w-0 gap-2">
          {activeTab_ && (
            <div className={cn(
              'flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg',
              activeTab_.iconBg,
            )}>
              <activeTab_.Icon className={cn('h-3.5 w-3.5 flex-shrink-0', activeTab_.iconColor)} />
              <span className={cn('text-xs font-semibold', activeTab_.iconColor)}>
                {activeTab_.label}
              </span>
            </div>
          )}
        </div>

        <button
          onClick={() => setMenuOpen(true)}
          className="sm:hidden flex items-center justify-center w-10 h-10 min-h-[44px] min-w-[44px] rounded-xl text-slate-500 hover:bg-slate-100 transition-colors duration-150 cursor-pointer flex-shrink-0"
          aria-label="פתח תפריט"
        >
          <Menu className="h-5 w-5" />
        </button>
      </nav>

      {/* ════════════════════════════════════════
          MOBILE DRAWER
          ════════════════════════════════════════ */}

      {/* Backdrop */}
      <div
        aria-hidden="true"
        className={cn(
          'fixed inset-0 z-40 sm:hidden transition-all duration-300',
          menuOpen
            ? 'bg-black/50 backdrop-blur-sm pointer-events-auto'
            : 'bg-transparent pointer-events-none opacity-0',
        )}
        onClick={() => setMenuOpen(false)}
      />

      {/* Drawer panel */}
      <aside
        role="dialog"
        aria-modal="true"
        aria-label="תפריט ניווט"
        className={cn(
          'fixed top-0 right-0 bottom-0 z-50 w-[300px] flex flex-col sm:hidden',
          'bg-white shadow-2xl',
          'transition-transform duration-300 ease-[cubic-bezier(0.32,0.72,0,1)]',
          menuOpen ? 'translate-x-0' : 'translate-x-full',
        )}
      >
        {/* ── Drawer header ── */}
        <div className="relative flex items-center gap-3.5 px-5 pt-6 pb-5">
          {/* Background accent */}
          <div className="absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-blue-50/60 to-transparent pointer-events-none" />

          {/* Logo */}
          <div className="relative flex-shrink-0 w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow-lg shadow-blue-200">
            <CalendarDays className="h-6 w-6 text-white" />
          </div>

          {/* App name */}
          <div className="relative flex-1 min-w-0">
            <p className="text-lg font-bold text-slate-800 leading-tight tracking-tight">WeekFlow</p>
            <p className="text-xs text-slate-400 font-medium mt-0.5">מתכנן שבועי חכם</p>
          </div>

          {/* Close button */}
          <button
            onClick={() => setMenuOpen(false)}
            className="relative flex-shrink-0 flex items-center justify-center w-9 h-9 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors duration-150 cursor-pointer"
            aria-label="סגור תפריט"
          >
            <X className="h-4.5 w-4.5" style={{ width: 18, height: 18 }} />
          </button>
        </div>

        {/* Divider */}
        <div className="mx-5 h-px bg-slate-100" />

        {/* ── Navigation items ── */}
        <div className="flex-1 px-3 py-4 flex flex-col gap-1 overflow-y-auto">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.12em] px-3 mb-3">
            תפריט ראשי
          </p>

          {TABS.map(({ label, sublabel, value, Icon, activeGradient, activeShadow, iconBg, iconColor }) => {
            const isActive = activeTab === value
            return (
              <button
                key={value}
                onClick={() => handleTabChange(value)}
                className={cn(
                  'group relative flex items-center gap-3.5 w-full px-3.5 py-3.5 rounded-2xl cursor-pointer transition-all duration-200 text-right overflow-hidden',
                  isActive
                    ? `bg-gradient-to-l ${activeGradient} shadow-md ${activeShadow}`
                    : 'hover:bg-slate-50 active:bg-slate-100',
                )}
              >
                {/* Icon */}
                <div className={cn(
                  'relative flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-200',
                  isActive ? 'bg-white/20' : iconBg,
                )}>
                  <Icon
                    className={cn('transition-colors duration-200', isActive ? 'text-white' : iconColor)}
                    style={{ width: 18, height: 18 }}
                  />
                </div>

                {/* Label + sublabel */}
                <div className="flex-1 flex flex-col items-start min-w-0">
                  <span className={cn(
                    'text-sm font-bold leading-tight',
                    isActive ? 'text-white' : 'text-slate-800',
                  )}>
                    {label}
                  </span>
                  <span className={cn(
                    'text-[11px] font-medium mt-0.5 leading-tight',
                    isActive ? 'text-white/70' : 'text-slate-400',
                  )}>
                    {sublabel}
                  </span>
                </div>

                {/* Trailing arrow */}
                <ChevronLeft
                  className={cn(
                    'flex-shrink-0 transition-all duration-200',
                    isActive
                      ? 'text-white/60'
                      : 'text-slate-300 group-hover:text-slate-400',
                  )}
                  style={{ width: 16, height: 16 }}
                />
              </button>
            )
          })}
        </div>

        {/* ── Drawer footer ── */}
        <div className="px-5 py-4 border-t border-slate-100">
          <div className="flex items-center justify-center gap-2">
            <div className="w-5 h-5 rounded-md bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center flex-shrink-0">
              <CalendarDays className="text-white" style={{ width: 11, height: 11 }} />
            </div>
            <p className="text-[11px] text-slate-400 font-medium">WeekFlow · כל הזכויות שמורות</p>
          </div>
        </div>
      </aside>
    </>
  )
}
