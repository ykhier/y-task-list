'use client'

import { CalendarDays, ListTodo } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { TabView } from '@/types'

interface NavbarProps {
  activeTab: TabView
  onTabChange: (tab: TabView) => void
}

const TABS: { label: string; value: TabView; Icon: React.ElementType }[] = [
  { label: 'לוח שבועי', value: 'calendar', Icon: CalendarDays },
  { label: 'משימות',   value: 'tasks',    Icon: ListTodo },
]

export default function Navbar({ activeTab, onTabChange }: NavbarProps) {
  return (
    <nav className="flex items-center h-14 border-b border-slate-100 bg-white px-4 gap-1 flex-shrink-0">
      {/* Logo */}
      <div className="flex items-center gap-2 me-6">
        <div className="h-7 w-7 rounded-lg bg-blue-500 flex items-center justify-center">
          <CalendarDays className="h-4 w-4 text-white" />
        </div>
        <span className="text-sm font-semibold text-slate-800 tracking-tight">WeekFlow</span>
      </div>

      {/* Main tabs */}
      <div className="flex items-center gap-0.5 flex-1">
        {TABS.map(({ label, value, Icon }) => (
          <button
            key={value}
            onClick={() => onTabChange(value)}
            aria-selected={activeTab === value}
            role="tab"
            className={cn(
              'flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors duration-150 cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500',
              activeTab === value
                ? 'bg-blue-50 text-blue-600'
                : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'
            )}
          >
            <Icon className="h-4 w-4" />
            {label}
          </button>
        ))}
      </div>
    </nav>
  )
}
