import { useState } from 'react'
import { useQuery, useMutation, gql } from '@apollo/client'

const GET_INCIDENTS = gql`
  query { getIncidents { id type description latitude longitude status reported_by created_at } }
`

const REPORT = gql`
  mutation Report($type: String!, $description: String, $latitude: Float, $longitude: Float) {
    reportIncident(type: $type, description: $description, latitude: $latitude, longitude: $longitude) {
      message
    }
  }
`

const UPDATE_STATUS = gql`
  mutation UpdateStatus($id: Int!, $status: String!) {
    updateIncidentStatus(id: $id, status: $status) { message }
  }
`

export default function IncidentsTab() {
  const { data, loading, refetch } = useQuery(GET_INCIDENTS, { pollInterval: 5000 })
  const [form, setForm] = useState({ type: 'Accident', description: '', latitude: 36.819, longitude: 10.166 })
  const [msg, setMsg] = useState('')

  const [report] = useMutation(REPORT, {
    onCompleted: () => { setMsg('✅ Incident déclaré (notification envoyée !)'); setForm({...form, description: ''}); refetch() },
    onError: (err) => setMsg(`❌ ${err.message}`),
  })

  const [updateStatus] = useMutation(UPDATE_STATUS, {
    onCompleted: () => refetch(),
  })

  const handleReport = (e) => {
    e.preventDefault()
    report({ variables: { ...form, latitude: parseFloat(form.latitude), longitude: parseFloat(form.longitude) } })
  }

  const getTypeIcon = (type) => {
    const icons = { 'Accident': '💥', 'Travaux': '🚧', 'Route fermee': '🚫', 'Embouteillage': '🚙' }
    return icons[type] || '⚠️'
  }

  const getStatusBadge = (status) => {
    if (status === 'Signale')  return <span className="badge badge-danger">🔴 Signalé</span>
    if (status === 'En cours') return <span className="badge badge-warning">🟡 En cours</span>
    return <span className="badge badge-success">🟢 Résolu</span>
  }

  return (
    <div>
      <h1 className="section-title">🚨 Gestion des incidents</h1>
      <p className="section-subtitle">Déclarez et suivez les incidents en temps réel (rafraîchissement auto toutes les 5s)</p>

      {msg && <div className={`alert ${msg.startsWith('✅') ? 'alert-success' : 'alert-error'}`}>{msg}</div>}

      <div className="card">
        <div className="card-header">
          <h2 className="card-title">📢 Déclarer un incident</h2>
        </div>
        <form onSubmit={handleReport}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
            <div className="form-group">
              <label>Type</label>
              <select value={form.type} onChange={(e) => setForm({...form, type: e.target.value})}>
                <option value="Accident">💥 Accident</option>
                <option value="Travaux">🚧 Travaux</option>
                <option value="Route fermee">🚫 Route fermée</option>
                <option value="Embouteillage">🚙 Embouteillage</option>
              </select>
            </div>
            <div className="form-group">
              <label>Latitude</label>
              <input type="number" step="0.0001" value={form.latitude}
                onChange={(e) => setForm({...form, latitude: e.target.value})} />
            </div>
            <div className="form-group">
              <label>Longitude</label>
              <input type="number" step="0.0001" value={form.longitude}
                onChange={(e) => setForm({...form, longitude: e.target.value})} />
            </div>
          </div>
          <div className="form-group">
            <label>Description</label>
            <input value={form.description} onChange={(e) => setForm({...form, description: e.target.value})}
              placeholder="Collision sur Avenue Bourguiba..." />
          </div>
          <button type="submit" className="btn btn-danger">🚨 Déclarer l'incident</button>
        </form>
      </div>

      <div style={{ marginTop: 24 }}>
        <h2 style={{ marginBottom: 16 }}>Tous les incidents ({data?.getIncidents.length || 0})</h2>
        {loading ? <p>⏳ Chargement...</p> : data?.getIncidents.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">🚨</div>
            <p>Aucun incident. Déclarez-en un ci-dessus !</p>
          </div>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>ID</th><th>Type</th><th>Description</th><th>Position</th><th>Statut</th><th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {data?.getIncidents.map(inc => (
                <tr key={inc.id}>
                  <td>#{inc.id}</td>
                  <td>{getTypeIcon(inc.type)} {inc.type}</td>
                  <td>{inc.description || '-'}</td>
                  <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                    {inc.latitude}, {inc.longitude}
                  </td>
                  <td>{getStatusBadge(inc.status)}</td>
                  <td>
                    <select value={inc.status}
                      onChange={(e) => updateStatus({ variables: { id: inc.id, status: e.target.value } })}
                      style={{ padding: '4px 8px', borderRadius: 6 }}>
                      <option value="Signale">Signalé</option>
                      <option value="En cours">En cours</option>
                      <option value="Resolu">Résolu</option>
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
