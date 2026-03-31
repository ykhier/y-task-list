import type { ElementType } from 'react'
import { CalendarDays, ListTodo, Repeat2 } from 'lucide-react'
import type { TabView } from '@/types'

export interface NavbarTabConfig {
  label: string
  sublabel: string
  value: TabView
  Icon: ElementType
  activeGradient: string
  activeShadow: string
  iconBg: string
  iconColor: string
}

export const NAVBAR_TABS: NavbarTabConfig[] = [
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
