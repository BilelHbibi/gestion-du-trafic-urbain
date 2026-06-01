import { useState } from 'react'
import { useQuery, useMutation, gql } from '@apollo/client'

const GET_ZONES = gql`query { getZones { id name lat_min lat_max lng_min lng_max } }`
const GET_CONGESTED = gql`query { getCongestedZones { zone_id density level measured_at } }`

const CREATE_ZONE = gql`
  mutation CreateZone($name: String!, $lat_min: Float!, $lat_max: Float!, $lng_min: Float!, $lng_max: Float!) {
    createZone(name: $name, lat_min: $lat_min, lat_max: $lat_max, lng_min: $lng_min, lng_max: $lng_max) { message }
  }
`

const MEASURE = gql`
  mutation Measure($zone_id: Int!, $density: Int!) {
    addTrafficMeasure(zone_id: $zone_id, density: $density) { message }
  }
`

export default function TrafficTab() {
  const { data: zones,     loading,   refetch }    = useQuery(GET_ZONES)
  const { data: congested, refetch: refetchCong } = useQuery(GET_CONGESTED)
  const [form, setForm] = useState({ name: '', lat_min: 36.80, lat_max: 36.85, lng_min: 10.15, lng_max: 10.20 })
  const [msg, setMsg] = useState('')

  const [createZone] = useMutation(CREATE_ZONE, {
    onCompleted: () => { setMsg('✅ Zone créée'); refetch() },
    onError: (err) => setMsg(`❌ ${err.message}`),
  })

  const [measure] = useMutation(MEASURE, {
    onCompleted: () => { setMsg('✅ Mesure enregistrée'); refetchCong() },
    onError: (err) => setMsg(`❌ ${err.message}`),
  })

  const handleCreate = (e) => {
    e.preventDefault()
    createZone({ variables: {
      name: form.name,
      lat_min: parseFloat(form.lat_min),
      lat_max: parseFloat(form.lat_max),
      lng_min: parseFloat(form.lng_min),
      lng_max: parseFloat(form.lng_max),
    }})
  }

  const simulateMeasure = (zoneId) => {
    const density = Math.floor(Math.random() * 100)
    measure({ variables: { zone_id: zoneId, density } })
  }

  const getLevelBadge = (level) => {
    if (level === 'Eleve')  return <span className="badge badge-danger">🔴 Élevé</span>
    if (level === 'Moyen')  return <span className="badge badge-warning">🟡 Moyen</span>
    return <span className="badge badge-success">🟢 Faible</span>
  }

  return (
    <div>
      <h1 className="section-title">🚦 Gestion du trafic</h1>
      <p className="section-subtitle">Créez des zones et mesurez la densité de circulation</p>

      {msg && <div className={`alert ${msg.startsWith('✅') ? 'alert-success' : 'alert-error'}`}>{msg}</div>}

      <div className="card">
        <div className="card-header">
          <h2 className="card-title">➕ Créer une zone de trafic</h2>
        </div>
        <form onSubmit={handleCreate}>
          <div className="form-group">
            <label>Nom de la zone</label>
            <input value={form.name} onChange={(e) => setForm({...form, name: e.target.value})}
              placeholder="Centre-Ville Tunis" required />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
            <div className="form-group">
              <label>Lat min</label>
              <input type="number" step="0.0001" value={form.lat_min}
                onChange={(e) => setForm({...form, lat_min: e.target.value})} required />
            </div>
            <div className="form-group">
              <label>Lat max</label>
              <input type="number" step="0.0001" value={form.lat_max}
                onChange={(e) => setForm({...form, lat_max: e.target.value})} required />
            </div>
            <div className="form-group">
              <label>Lng min</label>
              <input type="number" step="0.0001" value={form.lng_min}
                onChange={(e) => setForm({...form, lng_min: e.target.value})} required />
            </div>
            <div className="form-group">
              <label>Lng max</label>
              <input type="number" step="0.0001" value={form.lng_max}
                onChange={(e) => setForm({...form, lng_max: e.target.value})} required />
            </div>
          </div>
          <button type="submit" className="btn btn-primary">Créer la zone</button>
        </form>
      </div>

      {congested?.getCongestedZones?.length > 0 && (
        <div className="card" style={{ marginTop: 24, borderLeft: '4px solid var(--danger)' }}>
          <h2 className="card-title">⚠️ Zones actuellement congestionnées</h2>
          <table className="table" style={{ marginTop: 12 }}>
            <thead>
              <tr><th>Zone ID</th><th>Densité</th><th>Niveau</th><th>Mesuré le</th></tr>
            </thead>
            <tbody>
              {congested.getCongestedZones.map((z, i) => (
                <tr key={i}>
                  <td>#{z.zone_id}</td>
                  <td><strong>{z.density}</strong> véhicules</td>
                  <td>{getLevelBadge(z.level)}</td>
                  <td>{new Date(z.measured_at).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div style={{ marginTop: 24 }}>
        <h2 style={{ marginBottom: 16 }}>Toutes les zones ({zones?.getZones.length || 0})</h2>
        {loading ? <p>⏳ Chargement...</p> : zones?.getZones.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">🚦</div>
            <p>Aucune zone. Créez-en une ci-dessus !</p>
          </div>
        ) : (
          <div className="grid">
            {zones?.getZones.map(z => (
              <div key={z.id} className="card">
                <h3>{z.name}</h3>
                <p style={{ color: 'var(--text-muted)', fontSize: 13, marginTop: 8 }}>
                  📍 [{z.lat_min}, {z.lng_min}] → [{z.lat_max}, {z.lng_max}]
                </p>
                <button className="btn btn-primary" style={{ marginTop: 12 }}
                  onClick={() => simulateMeasure(z.id)}>
                  📊 Simuler une mesure
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
