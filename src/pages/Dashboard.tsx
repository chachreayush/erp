import { useAuthStore } from '../store/authStore'
import AdminDashboard from './dashboards/AdminDashboard'
import ClientDashboard from './dashboards/ClientDashboard'

export default function DashboardPage() {
  const user = useAuthStore(state => state.user)

  // If the user is the Account Master admin (Kalyani), show the Admin Dashboard.
  // Otherwise, they are a client admin (Alpha Traders, etc.), so show the Client Dashboard.
  if (user?.isAmUser) {
    return <AdminDashboard />
  }

  return <ClientDashboard />
}
