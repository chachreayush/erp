import { useEffect } from 'react'
import { useThemeStore } from '../../store/themeStore'

export default function ThemeProvider({ children }: { children: React.ReactNode }) {
  const activeTheme = useThemeStore((state) => state.activeTheme)

  useEffect(() => {
    // 1. Remove any existing theme classes from the document body
    document.body.classList.remove('theme-default', 'theme-glass', 'theme-minimal', 'theme-enterprise')
    
    // 2. Add the currently active theme class
    document.body.classList.add(`theme-${activeTheme}`)
  }, [activeTheme]) // Re-run this effect whenever activeTheme changes

  return <>{children}</>
}
