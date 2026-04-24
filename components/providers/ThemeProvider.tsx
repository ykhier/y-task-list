'use client'

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'

type Theme = 'light' | 'dark'

interface ThemeCtx {
  theme: Theme
  setTheme: (t: Theme) => void
}

const ThemeContext = createContext<ThemeCtx>({ theme: 'light', setTheme: () => {} })

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>('light')

  useEffect(() => {
    const stored = localStorage.getItem('weekflow-theme') as Theme | null
    const resolved = stored ?? 'light'
    setThemeState(resolved)
    document.documentElement.classList.toggle('dark', resolved === 'dark')
  }, [])

  function setTheme(next: Theme) {
    setThemeState(next)
    localStorage.setItem('weekflow-theme', next)
    document.documentElement.classList.toggle('dark', next === 'dark')
  }

  return <ThemeContext.Provider value={{ theme, setTheme }}>{children}</ThemeContext.Provider>
}

export function useTheme() {
  return useContext(ThemeContext)
}
