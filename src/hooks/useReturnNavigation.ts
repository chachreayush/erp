import { useEffect } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'

interface ReturnNavigationOptions {
  isDirty?: boolean;
  fallbackAction?: () => void;
}

export function useReturnNavigation(
  isAnyModalOpen: boolean,
  options?: ReturnNavigationOptions
) {
  const location = useLocation()
  const navigate = useNavigate()
  
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isAnyModalOpen) {
        if (options?.isDirty) {
          const confirmExit = window.confirm('Are you sure you want to exit? You have unsaved changes.')
          if (!confirmExit) return
        }

        if (location.state?.returnTo) {
          navigate(location.state.returnTo, { state: location.state })
        } else if (options?.fallbackAction) {
          options.fallbackAction()
        } else {
          // Ultimate fallback: go to Dashboard
          navigate('/')
        }
      }
    }
    window.addEventListener('keydown', handleGlobalKeyDown)
    return () => window.removeEventListener('keydown', handleGlobalKeyDown)
  }, [isAnyModalOpen, location, navigate, options])
}
