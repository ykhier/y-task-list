import { CalendarDays, ChevronLeft, LogOut, Shield, X } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'
import type { TabView } from '@/types'
import { NAVBAR_TABS } from './navbar-tabs'

interface NavbarMobileDrawerProps {
  activeTab: TabView
  menuOpen: boolean
  onClose: () => void
  onTabChange: (tab: TabView) => void
  onSignOut: () => Promise<void>
  isAdmin?: boolean
}

export default function NavbarMobileDrawer({
  activeTab,
  menuOpen,
  onClose,
  onTabChange,
  onSignOut,
  isAdmin,
}: NavbarMobileDrawerProps) {
  const router = useRouter()
  return (
    <>
      <div
        aria-hidden="true"
        className={cn(
          'fixed inset-0 z-40 sm:hidden transition-all duration-300',
          menuOpen
            ? 'bg-black/50 backdrop-blur-sm pointer-events-auto'
            : 'bg-transparent pointer-events-none opacity-0',
        )}
        onClick={onClose}
      />

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
        <div className="relative flex items-center gap-3.5 px-5 pt-6 pb-5">
          <div className="absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-blue-50/60 to-transparent pointer-events-none" />
          <div className="relative flex-shrink-0 w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow-lg shadow-blue-200">
            <CalendarDays className="h-6 w-6 text-white" />
          </div>
          <div className="relative flex-1 min-w-0">
            <p className="text-lg font-bold text-slate-800 leading-tight tracking-tight">WeekFlow</p>
            <p className="text-xs text-slate-400 font-medium mt-0.5">מתכנן שבועי חכם</p>
          </div>
          <button
            onClick={onClose}
            className="relative flex-shrink-0 flex items-center justify-center w-9 h-9 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors duration-150 cursor-pointer"
            aria-label="סגור תפריט"
          >
            <X className="h-4.5 w-4.5" style={{ width: 18, height: 18 }} />
          </button>
        </div>

        <div className="mx-5 h-px bg-slate-100" />

        <div className="flex-1 px-3 py-4 flex flex-col gap-1 overflow-y-auto">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.12em] px-3 mb-3">
            תפריט ראשי
          </p>

          {NAVBAR_TABS.map(({ label, sublabel, value, Icon, activeGradient, activeShadow, iconBg, iconColor }) => {
            const isActive = activeTab === value

            return (
              <button
                key={value}
                onClick={() => onTabChange(value)}
                className={cn(
                  'group relative flex items-center gap-3.5 w-full px-3.5 py-3.5 rounded-2xl cursor-pointer transition-all duration-200 text-right overflow-hidden',
                  isActive
                    ? `bg-gradient-to-l ${activeGradient} shadow-md ${activeShadow}`
                    : 'hover:bg-slate-50 active:bg-slate-100',
                )}
              >
                <div
                  className={cn(
                    'relative flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-200',
                    isActive ? 'bg-white/20' : iconBg,
                  )}
                >
                  <Icon
                    className={cn('transition-colors duration-200', isActive ? 'text-white' : iconColor)}
                    style={{ width: 18, height: 18 }}
                  />
                </div>

                <div className="flex-1 flex flex-col items-start min-w-0">
                  <span className={cn('text-sm font-bold leading-tight', isActive ? 'text-white' : 'text-slate-800')}>
                    {label}
                  </span>
                  <span
                    className={cn(
                      'text-[11px] font-medium mt-0.5 leading-tight',
                      isActive ? 'text-white/70' : 'text-slate-400',
                    )}
                  >
                    {sublabel}
                  </span>
                </div>

                <ChevronLeft
                  className={cn(
                    'flex-shrink-0 transition-all duration-200',
                    isActive ? 'text-white/60' : 'text-slate-300 group-hover:text-slate-400',
                  )}
                  style={{ width: 16, height: 16 }}
                />
              </button>
            )
          })}
        </div>

        <div className="px-5 py-4 border-t border-slate-100 flex flex-col gap-3">
          {isAdmin && (
            <button
              onClick={() => { onClose(); router.push('/admin') }}
              className="flex items-center gap-2.5 w-full px-3.5 py-2.5 rounded-xl text-slate-500 hover:text-blue-600 hover:bg-blue-50 transition-colors duration-150 cursor-pointer text-sm font-medium"
            >
              <Shield style={{ width: 16, height: 16 }} />
              ניהול משתמשים
            </button>
          )}
          <button
            onClick={onSignOut}
            className="flex items-center gap-2.5 w-full px-3.5 py-2.5 rounded-xl text-slate-500 hover:text-red-600 hover:bg-red-50 transition-colors duration-150 cursor-pointer text-sm font-medium"
          >
            <LogOut style={{ width: 16, height: 16 }} />
            התנתק
          </button>
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
