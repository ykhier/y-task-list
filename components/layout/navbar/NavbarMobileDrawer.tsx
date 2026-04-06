import { CalendarDays, ChevronLeft, LogOut, Settings, Shield, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { TabView } from '@/types'
import Spinner from '@/components/ui/Spinner'
import { NAVBAR_TABS } from './navbar-tabs'

interface NavbarMobileDrawerProps {
  activeTab: TabView
  menuOpen: boolean
  onClose: () => void
  onTabChange: (tab: TabView) => void
  onSignOut: () => Promise<void>
  onSettingsOpen: () => void
  isAdmin?: boolean
  fullName?: string
  adminNavigationPending?: boolean
  onAdminClick?: () => void
}

export default function NavbarMobileDrawer({
  activeTab,
  menuOpen,
  onClose,
  onTabChange,
  onSignOut,
  onSettingsOpen,
  isAdmin,
  fullName,
  adminNavigationPending,
  onAdminClick,
}: NavbarMobileDrawerProps) {
  return (
    <>
      <div
        aria-hidden="true"
        className={cn(
          'fixed inset-0 z-40 transition-all duration-300 sm:hidden',
          menuOpen
            ? 'pointer-events-auto bg-black/50 backdrop-blur-sm'
            : 'pointer-events-none bg-transparent opacity-0'
        )}
        onClick={onClose}
      />

      <aside
        role="dialog"
        aria-modal="true"
        aria-label="תפריט ניווט"
        className={cn(
          'fixed right-0 top-0 bottom-0 z-50 flex w-[300px] flex-col bg-white shadow-2xl transition-transform duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] sm:hidden',
          menuOpen ? 'translate-x-0' : 'translate-x-full'
        )}
      >
        <div className="relative flex items-center gap-3.5 px-5 pt-6 pb-5">
          <div className="pointer-events-none absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-blue-50/60 to-transparent" />
          <div className="relative flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500 to-blue-600 shadow-lg shadow-blue-200">
            <CalendarDays className="h-6 w-6 text-white" />
          </div>
          <div className="relative min-w-0 flex-1">
            <p className="text-lg font-bold leading-tight tracking-tight text-slate-800">
              WeekFlow
            </p>
            {fullName ? (
              <p className="mt-0.5 truncate text-xs font-medium text-blue-500">
                {fullName}
              </p>
            ) : (
              <p className="mt-0.5 text-xs font-medium text-slate-400">
                מתכנן שבועי חכם
              </p>
            )}
          </div>
          <button
            onClick={onClose}
            className="relative flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl text-slate-400 transition-colors duration-150 hover:bg-slate-100 hover:text-slate-600"
            aria-label="סגור תפריט"
          >
            <X className="h-[18px] w-[18px]" />
          </button>
        </div>

        <div className="mx-5 h-px bg-slate-100" />

        <div className="flex flex-1 flex-col gap-1 overflow-y-auto px-3 py-4">
          <p className="mb-3 px-3 text-[10px] font-bold uppercase tracking-[0.12em] text-slate-400">
            תפריט ראשי
          </p>

          {NAVBAR_TABS.map(
            ({ label, sublabel, value, Icon, activeGradient, activeShadow, iconBg, iconColor }) => {
              const isActive = activeTab === value

              return (
                <button
                  key={value}
                  onClick={() => onTabChange(value)}
                  className={cn(
                    'group relative flex w-full items-center gap-3.5 overflow-hidden rounded-2xl px-3.5 py-3.5 text-right transition-all duration-200',
                    isActive
                      ? `bg-gradient-to-l ${activeGradient} shadow-md ${activeShadow}`
                      : 'hover:bg-slate-50 active:bg-slate-100'
                  )}
                >
                  <div
                    className={cn(
                      'relative flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl transition-all duration-200',
                      isActive ? 'bg-white/20' : iconBg
                    )}
                  >
                    <Icon
                      className={cn(
                        'transition-colors duration-200',
                        isActive ? 'text-white' : iconColor
                      )}
                      style={{ width: 18, height: 18 }}
                    />
                  </div>

                  <div className="flex min-w-0 flex-1 flex-col items-start">
                    <span
                      className={cn(
                        'text-sm font-bold leading-tight',
                        isActive ? 'text-white' : 'text-slate-800'
                      )}
                    >
                      {label}
                    </span>
                    <span
                      className={cn(
                        'mt-0.5 text-[11px] font-medium leading-tight',
                        isActive ? 'text-white/70' : 'text-slate-400'
                      )}
                    >
                      {sublabel}
                    </span>
                  </div>

                  <ChevronLeft
                    className={cn(
                      'flex-shrink-0 transition-all duration-200',
                      isActive ? 'text-white/60' : 'text-slate-300 group-hover:text-slate-400'
                    )}
                    style={{ width: 16, height: 16 }}
                  />
                </button>
              )
            }
          )}
        </div>

        <div className="flex flex-col gap-3 border-t border-slate-100 px-5 py-4">
          {isAdmin && (
            <button
              onClick={() => {
                onClose()
                onAdminClick?.()
              }}
              disabled={adminNavigationPending}
              className="flex w-full items-center gap-2.5 rounded-xl px-3.5 py-2.5 text-sm font-medium text-slate-500 transition-colors duration-150 hover:bg-blue-50 hover:text-blue-600 disabled:cursor-wait disabled:opacity-80"
            >
              {adminNavigationPending ? (
                <Spinner className="h-4 w-4 text-blue-500" />
              ) : (
                <Shield style={{ width: 16, height: 16 }} />
              )}
              ניהול משתמשים
            </button>
          )}

          <button
            onClick={onSettingsOpen}
            className="flex w-full items-center gap-2.5 rounded-xl px-3.5 py-2.5 text-sm font-medium text-slate-500 transition-colors duration-150 hover:bg-blue-50 hover:text-blue-600"
          >
            <Settings style={{ width: 16, height: 16 }} />
            הגדרות
          </button>

          <button
            onClick={onSignOut}
            className="flex w-full items-center gap-2.5 rounded-xl px-3.5 py-2.5 text-sm font-medium text-slate-500 transition-colors duration-150 hover:bg-red-50 hover:text-red-600"
          >
            <LogOut style={{ width: 16, height: 16 }} />
            התנתק
          </button>

          <div className="flex items-center justify-center gap-2">
            <div className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-md bg-gradient-to-br from-blue-500 to-blue-600">
              <CalendarDays className="text-white" style={{ width: 11, height: 11 }} />
            </div>
            <p className="text-[11px] font-medium text-slate-400">
              WeekFlow · כל הזכויות שמורות
            </p>
          </div>
        </div>
      </aside>
    </>
  )
}
