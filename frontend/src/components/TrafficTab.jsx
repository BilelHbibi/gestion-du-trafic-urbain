import { useState } from 'react'
import { useQuery, useMutation, gql } from '@apollo/client'

const GET_ZONES    = gql`query { getZones { id name lat_min lat_max lng_min lng_max } }`
const GET_CONG     = gql`query { getCongestedZones { zone_id density level measured_at } }`

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

function levelBadge(level) {
  if (level === 'Eleve') return <span className="badge badge-danger">Élevé</span>
  if (level === 'Moyen') return <span className="badge badge-warning">Moyen</span>
  return <span className="badge badge-success">Faible</span>
}

function densityColor(density) {
  if (density >= 50) return 'var(--danger)'
  if (density >= 20) return 'var(--warning)'
  return 'var(--success)'
}

export default function TrafficTab() {
  const { data: zonesData, loading, refetch }     = useQuery(GET_ZONES)
  const { data: congData, refetch: refetchCong }  = useQuery(GET_CONG)
  const [form, setForm] = useState({ name: '', lat_min: 36.80, lat_max: 36.85, lng_min: 10.15, lng_max: 10.20 })
  const [msg, setMsg]   = useState({ text: '', ok: true })

  const notify = (text, ok = true) => {
    setMsg({ text, ok })
    setTimeout(() => setMsg({ text: '', ok: true }), 4000)
  }

  const [createZone, { loading: creating }] = useMutation(CREATE_ZONE, {
    onCompleted: () => { notify('Zone créée avec succès'); setForm({ ...form, name: '' }); refetch() },
    onError: (err) => notify(err.message, false),
  })

  const [measure] = useMutation(MEASURE, {
    onCompleted: () => { notify('Mesure de densité enregistrée'); refetchCong() },
    onError: (err) => notify(err.message, false),
  })

  const handleCreate = (e) => {
    e.preventDefault()
    createZone({ variables: {
      name:    form.name,
      lat_min: parseFloat(form.lat_min),
      lat_max: parseFloat(form.lat_max),
      lng_min: parseFloat(form.lng_min),
      lng_max: parseFloat(form.lng_max),
    }})
  }

  const simulateMeasure = (zoneId) => {
    measure({ variables: { zone_id: zoneId, density: Math.floor(Math.random() * 100) } })
  }

  const zones    = zonesData?.getZones || []
  const congests = congData?.getCongestedZones || []

  return (
    <div className="fade-in">
      <p className="section-subtitle">
        Créez des zones géographiques et mesurez la densité de circulation
      </p>

      {msg.text && (
        <div className={`alert ${msg.ok ? 'alert-success' : 'alert-error'}`}>
          {msg.ok ? '✓' : '⚠'} {msg.text}
        </div>
      )}

      <div className="card">
        <div className="card-header">
          <span className="card-title">Créer une zone de surveillance</span>
        </div>
        <form onSubmit={handleCreate}>
          <div className="form-group">
            <label>Nom de la zone</label>
            <input
              value={form.name}
              onChange={e => setForm({ ...form, name: e.target.value })}
              placeholder="ex: Centre-Ville Tunis"
              required
            />
          </div>
          <div className="form-row cols-4">
            {[
              { key: 'lat_min', label: 'Latitude min' },
              { key: 'lat_max', label: 'Latitude max' },
              { key: 'lng_min', label: 'Longitude min' },
              { key: 'lng_max', label: 'Longitude max' },
            ].map(({ key, label }) => (
              <div key={key} className="form-group" style={{ margin: 0 }}>
                <label>{label}</label>
                <input
                  type="number" step="0.0001"
                  value={form[key]}
                  onChange={e => setForm({ ...form, [key]: e.target.value })}
                  required
                />
              </div>
            ))}
          </div>
          <button type="submit" className="btn btn-primary mt-4" disabled={creating}>
            {creating
              ? <><span className="spinner" style={{ borderTopColor: '#fff', borderColor: 'rgba(255,255,255,0.3)' }} /> Création...</>
              : '+ Créer la zone'}
          </button>
        </form>
      </div>

      {congests.length > 0 && (
        <div className="congestion-bar">
          <div className="congestion-bar-title">
            ⚠ Zones actuellement congestionnées ({congests.length})
          </div>
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr><th>Zone ID</th><th>Densité</th><th>Niveau</th><th>Mesuré le</th></tr>
              </thead>
              <tbody>
                {congests.map((z, i) => (
                  <tr key={i}>
                    <td className="font-mono text-muted">#{z.zone_id}</td>
                    <td>
                      <div className="density-bar-wrap">
                        <div className="density-bar">
                          <div
                            className="density-bar-fill"
                            style={{ width: `${z.density}%`, background: densityColor(z.density) }}
                          />
                        </div>
                        <span style={{ fontWeight: 700, fontSize: 13, minWidth: 36 }}>{z.density}</span>
                      </div>
                    </td>
                    <td>{levelBadge(z.level)}</td>
                    <td className="text-muted text-sm">
                      {new Date(z.measured_at).toLocaleString('fr-FR')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="flex-between mb-4">
        <span style={{ fontWeight: 700, fontSize: 15 }}>
          Zones ({zones.length})
        </span>
        <button className="btn btn-ghost btn-sm" onClick={() => { refetch(); refetchCong() }}>
          Actualiser
        </button>
      </div>

      {loading ? (
        <div className="loading"><div className="spinner" /> Chargement...</div>
      ) : zones.length === 0 ? (
        <div className="empty-state">
          <span className="empty-state-icon">🚦</span>
          <p>Aucune zone configurée</p>
          <p className="hint">Créez une zone pour commencer la surveillance</p>
        </div>
      ) : (
        <div className="grid-auto">
          {zones.map(z => (
            <div key={z.id} className="zone-card">
              <div className="zone-card-name">📍 {z.name}</div>
              <div className="zone-coords">
                Lat: {z.lat_min} → {z.lat_max}{'\n'}
                Lng: {z.lng_min} → {z.lng_max}
              </div>
              <button
                className="btn btn-primary btn-sm"
                style={{ width: '100%', justifyContent: 'center' }}
                onClick={() => simulateMeasure(z.id)}
              >
                📊 Simuler une mesure
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
