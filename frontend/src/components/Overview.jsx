import { useQuery, gql } from '@apollo/client'

const STATS = gql`
  query GetStats {
    getVehicles { id }
    getZones { id }
    getIncidents { id status }
    getNotifications { id is_read }
  }
`

export default function Overview() {
  const { data, loading, error } = useQuery(STATS)

  if (loading) return <p>⏳ Chargement...</p>
  if (error)   return <div className="alert alert-error">Erreur: {error.message}</div>

  const totalVehicles  = data.getVehicles.length
  const totalZones     = data.getZones.length
  const totalIncidents = data.getIncidents.length
  const openIncidents  = data.getIncidents.filter(i => i.status !== 'Resolu').length
  const unreadNotifs   = data.getNotifications.filter(n => !n.is_read).length

  return (
    <div>
      <h1 className="section-title">📊 Vue d'ensemble</h1>
      <p className="section-subtitle">État global de la plateforme en temps réel</p>

      <div className="grid">
        <div className="stat-card">
          <div className="stat-icon">🚗</div>
          <div>
            <div className="stat-value">{totalVehicles}</div>
            <div className="stat-label">Véhicules enregistrés</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon" style={{ background: '#fef3c7' }}>🚦</div>
          <div>
            <div className="stat-value">{totalZones}</div>
            <div className="stat-label">Zones surveillées</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon" style={{ background: '#fee2e2' }}>🚨</div>
          <div>
            <div className="stat-value">{openIncidents}/{totalIncidents}</div>
            <div className="stat-label">Incidents actifs / total</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon" style={{ background: '#ede9fe' }}>🔔</div>
          <div>
            <div className="stat-value">{unreadNotifs}</div>
            <div className="stat-label">Notifications non lues</div>
          </div>
        </div>
      </div>

      <div className="card" style={{ marginTop: 24 }}>
        <div className="card-header">
          <h2 className="card-title">💡 Bienvenue sur Traffic Platform</h2>
        </div>
        <p style={{ lineHeight: 1.6 }}>
          Cette plateforme vous permet de superviser le trafic urbain de Tunis :
        </p>
        <ul style={{ marginTop: 12, marginLeft: 20, lineHeight: 1.8 }}>
          <li>🚗 <strong>Véhicules</strong> — Gérer la flotte et suivre les positions GPS</li>
          <li>🚦 <strong>Trafic</strong> — Mesurer la densité et détecter la congestion</li>
          <li>🚨 <strong>Incidents</strong> — Déclarer et suivre les accidents/travaux</li>
          <li>🔔 <strong>Notifications</strong> — Être alerté en temps réel</li>
        </ul>
      </div>
    </div>
  )
}
