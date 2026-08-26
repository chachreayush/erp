import { useState, useEffect } from 'react'
import { Building2, Plus, ArrowRight, Activity, Users } from 'lucide-react'
import { Card } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { useAuthStore } from '../../store/authStore'
import { apiClient, apiGetOrganizations, Organization } from '../../lib/api'
import { useNavigate } from 'react-router-dom'
import { RegisterClientModal } from './RegisterClientModal'
import { useReturnNavigation } from '../../hooks/useReturnNavigation'

export default function ClientManagementPage() {
  useReturnNavigation(false);
  const [organizations, setOrganizations] = useState<Organization[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isRegisterModalOpen, setIsRegisterModalOpen] = useState(false)
  const impersonate = useAuthStore(state => state.impersonate)
  const navigate = useNavigate()

  useEffect(() => {
    fetchOrganizations()
  }, [])

  const fetchOrganizations = async () => {
    try {
      const data = await apiGetOrganizations()
      setOrganizations(data)
    } catch (error) {
      console.error("Failed to fetch organizations", error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleSwitchToClient = async (orgId: string) => {
    try {
      const response = await apiClient.post('/auth/impersonate', { target_org_id: orgId })
      // Response contains the new token and user object acting as cm_admin
      
      const authUser = {
        id:          response.data.user.id,
        name:        response.data.user.name,
        username:    response.data.user.username,
        email:       response.data.user.email ?? '',
        role:        response.data.user.role,
        companyId:   response.data.user.organization_id, // keep mapped for frontend state
        companyName: response.data.user.org_name,
        isAmUser:    response.data.user.is_am_user,
        permissions: response.data.user.permissions,
        avatarUrl:   response.data.user.avatar_url ?? undefined
      }
      
      impersonate(authUser as any, response.data.access_token)
      // Redirect to the client's dashboard
      navigate('/')
    } catch (error: any) {
      console.error("Switch failed", error)
      const errorDetail = error?.response?.data?.detail || error.message || "Unknown error";
      alert("Failed to switch to client ERP. Detail: " + errorDetail)
    }
  }

  return (
    <div style={{ height: "100%", overflowY: "auto", maxWidth: '1200px', animation: 'fadeIn 0.3s ease-in-out' }}>
      
      {/* ── HEADER ────────────────────────────────────────────── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '32px' }}>
        <div>
          <h1 style={{ fontSize: 'var(--font-size-xl)', fontWeight: 800, marginBottom: '6px', color: 'var(--color-text)' }}>
            Client Management
          </h1>
          <p style={{ color: 'var(--color-text-muted)' }}>
            View all Client Master (CM) organizations and jump directly into their ERP environments.
          </p>
        </div>
        <Button variant="primary" leftIcon={<Plus size={16} />} onClick={() => setIsRegisterModalOpen(true)}>
          Register New Client
        </Button>
      </div>

      {/* ── CLIENT LIST ───────────────────────────────────────── */}
      {isLoading ? (
        <div>Loading organizations...</div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '24px' }}>
          {organizations.map(org => (
            <Card key={org.id} padding="lg" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                <div style={{
                  width: '48px', height: '48px', borderRadius: 'var(--radius-md)',
                  backgroundColor: 'rgba(59, 130, 246, 0.1)', color: 'var(--color-primary)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center'
                }}>
                  <Building2 size={24} />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 600 }}>{org.name}</h3>
                  <div style={{ fontSize: '13px', color: 'var(--color-text-muted)', marginTop: '4px' }}>
                    Code: <strong>{org.org_code}</strong>
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '16px', padding: '12px 0', borderTop: '1px solid var(--color-border)', borderBottom: '1px solid var(--color-border)' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '12px', color: 'var(--color-text-muted)', marginBottom: '4px' }}>Status</div>
                  <div style={{ fontSize: '14px', fontWeight: 500, color: 'var(--color-success)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <Activity size={14} /> Active
                  </div>
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '12px', color: 'var(--color-text-muted)', marginBottom: '4px' }}>Users</div>
                  <div style={{ fontSize: '14px', fontWeight: 500, display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <Users size={14} /> 5
                  </div>
                </div>
              </div>

              <Button 
                variant="secondary" 
                style={{ width: '100%', justifyContent: 'center' }}
                rightIcon={<ArrowRight size={16} />}
                onClick={() => handleSwitchToClient(org.id)}
              >
                Switch to ERP
              </Button>
            </Card>
          ))}
          {organizations.length === 0 && (
            <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '48px', color: 'var(--color-text-muted)' }}>
              No client organizations found. Create one to get started.
            </div>
          )}
        </div>
      )}

      <RegisterClientModal 
        isOpen={isRegisterModalOpen} 
        onClose={() => setIsRegisterModalOpen(false)} 
        onSuccess={() => {
          setIsRegisterModalOpen(false)
          fetchOrganizations()
        }}
      />
    </div>
  )
}
