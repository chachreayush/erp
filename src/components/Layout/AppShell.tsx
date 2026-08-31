import { Outlet, useLocation } from 'react-router-dom'
import Header from './Header'

const styles = {
  shell: {
    display: 'flex',
    flexDirection: 'column' as const,
    height: '100vh',
    width: '100vw',
    overflow: 'hidden',
    backgroundColor: 'var(--color-bg)'
  },
  body: {
    display: 'flex',
    flex: 1,
    overflow: 'hidden'
  },
  content: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column' as const,
    overflow: 'hidden',
    padding: '4px 8px',
    backgroundColor: 'var(--color-bg)'
  }
}

function AppShell() {
  const location = useLocation()
  const isHomeScreen = location.pathname === '/'

  return (
    <div style={styles.shell}>
      {/* TOP HEADER BAR — Only show on Home Screen */}
      {isHomeScreen && <Header />}

      {/* BODY AREA — Full width content */}
      <div style={styles.body}>
        <main style={styles.content}>
          <Outlet />
        </main>
      </div>
    </div>
  )
}

export default AppShell


