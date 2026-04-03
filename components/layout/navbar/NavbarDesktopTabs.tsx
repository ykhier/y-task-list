import { Shield } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { TabView } from '@/types'
import { NAVBAR_TABS } from './navbar-tabs'

interface NavbarDesktopTabsProps {
  activeTab: TabView
  onTabChange: (tab: TabView) => void
  isAdmin?: boolean
  onAdminClick?: () => void
}

export default function NavbarDesktopTabs({ activeTab, onTabChange, isAdmin, onAdminClick }: NavbarDesktopTabsProps) {
  return (
    <div className="hidden sm:flex items-center gap-0.5 flex-1">
      {NAVBAR_TABS.map(({ label, value, Icon }) => (
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

      {isAdmin && (
        <>
          <div className="mx-1.5 h-4 w-px bg-slate-200" />
          <button
            onClick={onAdminClick}
            className="flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 py-2 rounded-lg text-sm font-medium transition-colors duration-150 cursor-pointer text-slate-500 hover:text-blue-600 hover:bg-blue-50"
          >
            <Shield className="h-4 w-4 flex-shrink-0" />
            <span>ניהול</span>
          </button>
        </>
      )}
    </div>
  )
}
