'use client'

import { useEffect, useState } from 'react'
import { CalendarDays, Menu } from 'lucide-react'
import NavbarDesktopTabs from './navbar/NavbarDesktopTabs'
import NavbarMobileDrawer from './navbar/NavbarMobileDrawer'
import NavbarMobileTabBadge from './navbar/NavbarMobileTabBadge'
import type { TabView } from '@/types'

interface NavbarProps {
  activeTab: TabView
  onTabChange: (tab: TabView) => void
}

export default function Navbar({ activeTab, onTabChange }: NavbarProps) {
  const [menuOpen, setMenuOpen] = useState(false)

  useEffect(() => {
    if (!menuOpen) return

    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setMenuOpen(false)
    }

    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [menuOpen])

  useEffect(() => {
    document.body.style.overflow = menuOpen ? 'hidden' : ''
    return () => {
      document.body.style.overflow = ''
    }
  }, [menuOpen])

  const handleTabChange = (tab: TabView) => {
    onTabChange(tab)
    setMenuOpen(false)
  }

  return (
    <>
      <nav className="flex items-center h-14 border-b border-slate-100 bg-white px-3 sm:px-4 gap-1 flex-shrink-0">
        <div className="flex items-center gap-2 me-3 sm:me-6 flex-shrink-0">
          <div className="h-7 w-7 rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow-sm shadow-blue-200">
            <CalendarDays className="h-4 w-4 text-white" />
          </div>
          <span className="hidden sm:block text-sm font-semibold text-slate-800 tracking-tight">WeekFlow</span>
        </div>

        <NavbarDesktopTabs activeTab={activeTab} onTabChange={onTabChange} />
        <NavbarMobileTabBadge activeTab={activeTab} />

        <button
          onClick={() => setMenuOpen(true)}
          className="sm:hidden flex items-center justify-center w-10 h-10 min-h-[44px] min-w-[44px] rounded-xl text-slate-500 hover:bg-slate-100 transition-colors duration-150 cursor-pointer flex-shrink-0"
          aria-label="פתח תפריט"
        >
          <Menu className="h-5 w-5" />
        </button>
      </nav>

      <NavbarMobileDrawer
        activeTab={activeTab}
        menuOpen={menuOpen}
        onClose={() => setMenuOpen(false)}
        onTabChange={handleTabChange}
      />
    </>
  )
}
