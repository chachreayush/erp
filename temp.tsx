import { Outlet } from 'react-router-dom'
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
    overflow: 'auto',
    padding: '4px 8px',
    backgroundColor: 'var(--color-bg)'
  }
}

function AppShell() {
  return (
    <div style={styles.shell}>
      {/* TOP HEADER BAR — Now contains all navigation options */}
      <Header />

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
