import { Shield } from 'lucide-react'
import Spinner from '@/components/ui/Spinner'
import { cn } from '@/lib/utils'
import type { TabView } from '@/types'
import { NAVBAR_TABS } from './navbar-tabs'

interface NavbarDesktopTabsProps {
  activeTab: TabView
  onTabChange: (tab: TabView) => void
  isAdmin?: boolean
  adminNavigationPending?: boolean
  onAdminClick?: () => void
}

export default function NavbarDesktopTabs({
  activeTab,
  onTabChange,
  isAdmin,
  adminNavigationPending,
  onAdminClick,
}: NavbarDesktopTabsProps) {
  return (
    <div className="hidden flex-1 items-center gap-0.5 sm:flex">
      {NAVBAR_TABS.map(({ label, value, Icon }) => (
        <button
          key={value}
          onClick={() => onTabChange(value)}
          aria-selected={activeTab === value}
          role="tab"
          className={cn(
            'flex min-h-[44px] items-center gap-1.5 rounded-lg px-2.5 py-2 text-sm font-medium transition-colors duration-150 cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500 sm:min-h-0 sm:gap-2 sm:px-3',
            activeTab === value
              ? 'bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400'
              : 'text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-700 dark:hover:text-slate-200'
          )}
        >
          <Icon className="h-4 w-4 flex-shrink-0" />
          <span>{label}</span>
        </button>
      ))}

      {isAdmin && (
        <>
          <div className="mx-1.5 h-4 w-px bg-slate-200 dark:bg-slate-700" />
          <button
            onClick={onAdminClick}
            disabled={adminNavigationPending}
            className="flex items-center gap-1.5 rounded-lg px-2.5 py-2 text-sm font-medium text-slate-500 dark:text-slate-400 transition-colors duration-150 hover:bg-blue-50 dark:hover:bg-blue-950/50 hover:text-blue-600 dark:hover:text-blue-400 disabled:cursor-wait disabled:opacity-80 sm:gap-2 sm:px-3"
          >
            {adminNavigationPending ? (
              <Spinner className="h-4 w-4 flex-shrink-0 text-blue-500" />
            ) : (
              <Shield className="h-4 w-4 flex-shrink-0" />
            )}
            <span>ניהול</span>
          </button>
        </>
      )}
    </div>
  )
}
