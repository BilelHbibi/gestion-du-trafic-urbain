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

  if (loading) return (
    <div className="loading">
      <div className="spinner" />
      Chargement des statistiques...
    </div>
  )
  if (error) return <div className="alert alert-error">⚠ {error.message}</div>

  const totalVehicles  = data.getVehicles.length
  const totalZones     = data.getZones.length
  const totalIncidents = data.getIncidents.length
  const openIncidents  = data.getIncidents.filter(i => i.status !== 'Resolu').length
  const unreadNotifs   = data.getNotifications.filter(n => !n.is_read).length

  const cards = [
    { color: 'blue',   icon: '🚗', value: totalVehicles,                    label: 'Véhicules enregistrés' },
    { color: 'green',  icon: '🚦', value: totalZones,                        label: 'Zones surveillées' },
    { color: 'red',    icon: '🚨', value: `${openIncidents}/${totalIncidents}`, label: 'Incidents actifs / total' },
    { color: 'purple', icon: '🔔', value: unreadNotifs,                      label: 'Notifications non lues' },
  ]

  const features = [
    { icon: '🚗', title: 'Véhicules',     desc: 'Gérer la flotte et suivre les positions GPS en temps réel' },
    { icon: '🚦', title: 'Trafic',        desc: 'Mesurer la densité et détecter la congestion automatiquement' },
    { icon: '🚨', title: 'Incidents',     desc: 'Déclarer et suivre les accidents, travaux et perturbations' },
    { icon: '🔔', title: 'Notifications', desc: 'Alertes automatiques via WebSocket à chaque nouvel incident' },
  ]

  return (
    <div className="fade-in">
      <p className="section-subtitle">
        Supervision du trafic urbain de Tunis — état global en temps réel
      </p>

      <div className="stats-grid">
        {cards.map((c, i) => (
          <div key={i} className={`stat-card ${c.color}`}>
            <div className={`stat-icon ${c.color}`}>{c.icon}</div>
            <div className="stat-value">{c.value}</div>
            <div className="stat-label">{c.label}</div>
          </div>
        ))}
      </div>

      <div className="card">
        <div className="card-header">
          <span className="card-title">Bienvenue sur Traffic Platform</span>
          <span className="badge badge-success">Système opérationnel</span>
        </div>
        <p style={{ lineHeight: 1.7, color: 'var(--text-muted)', fontSize: 14, marginBottom: 18 }}>
          Plateforme de supervision du trafic urbain de Tunis — architecture microservices avec GraphQL, WebSocket temps réel et authentification JWT.
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12 }}>
          {features.map((f, i) => (
            <div key={i} style={{
              background: 'var(--surface2)',
              borderRadius: 'var(--radius-sm)',
              border: '1px solid var(--border)',
              padding: '14px 16px',
              display: 'flex',
              gap: 12,
              alignItems: 'flex-start',
              transition: 'border-color 0.2s',
            }}>
              <span style={{ fontSize: 22, flexShrink: 0, marginTop: 1 }}>{f.icon}</span>
              <div>
                <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 4, color: 'var(--text)' }}>
                  {f.title}
                </div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.5 }}>
                  {f.desc}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="card" style={{ borderColor: 'rgba(59,130,246,0.2)' }}>
        <div className="card-header">
          <span className="card-title">Architecture technique</span>
          <span className="badge badge-info">Microservices</span>
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {['Auth :3001','Vehicles :3002','Traffic :3003','Incidents :3004','Notifications :3005','Gateway :4000'].map((s, i) => (
            <span key={i} className="badge badge-gray" style={{ fontFamily: 'Courier New', fontSize: 12 }}>
              {s}
            </span>
          ))}
        </div>
      </div>
    </div>
  )
}
