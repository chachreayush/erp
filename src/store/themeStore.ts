import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type ThemeOption = 'default' | 'glass' | 'minimal' | 'enterprise' | 'marg'

interface ThemeState {
  activeTheme: ThemeOption
  setTheme: (theme: ThemeOption) => void
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set) => ({
      activeTheme: 'default',
      setTheme: (theme) => set({ activeTheme: theme }),
    }),
    {
      name: 'merge-erp-theme', // Saves to localStorage
    }
  )
)
