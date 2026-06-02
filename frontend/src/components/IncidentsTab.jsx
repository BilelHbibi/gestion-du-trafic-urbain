import { useState } from 'react'
import { useQuery, useMutation, gql } from '@apollo/client'

const GET_INCIDENTS = gql`
  query { getIncidents { id type description latitude longitude status created_at } }
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

const TYPE_ICONS = {
  Accident:      '💥',
  Travaux:       '🚧',
  'Route fermee':'🚫',
  Embouteillage: '🚙',
}

function statusBadge(status) {
  if (status === 'Signale')  return <span className="badge badge-danger">Signalé</span>
  if (status === 'En cours') return <span className="badge badge-warning">En cours</span>
  return <span className="badge badge-success">Résolu</span>
}

export default function IncidentsTab() {
  const { data, loading, refetch } = useQuery(GET_INCIDENTS, { pollInterval: 5000 })
  const [form, setForm] = useState({ type: 'Accident', description: '', latitude: 36.819, longitude: 10.166 })
  const [msg, setMsg]   = useState({ text: '', ok: true })

  const notify = (text, ok = true) => {
    setMsg({ text, ok })
    setTimeout(() => setMsg({ text: '', ok: true }), 5000)
  }

  const [report, { loading: reporting }] = useMutation(REPORT, {
    onCompleted: () => {
      notify('Incident déclaré — notification WebSocket envoyée !')
      setForm({ ...form, description: '' })
      refetch()
    },
    onError: (err) => notify(err.message, false),
  })

  const [updateStatus] = useMutation(UPDATE_STATUS, {
    onCompleted: () => refetch(),
    onError: (err) => notify(err.message, false),
  })

  const handleReport = (e) => {
    e.preventDefault()
    report({ variables: { ...form, latitude: parseFloat(form.latitude), longitude: parseFloat(form.longitude) } })
  }

  const incidents = data?.getIncidents || []
  const open      = incidents.filter(i => i.status !== 'Resolu').length

  return (
    <div className="fade-in">
      <p className="section-subtitle">
        Déclarez et suivez les incidents en temps réel (rafraîchissement auto toutes les 5s)
      </p>

      {msg.text && (
        <div className={`alert ${msg.ok ? 'alert-success' : 'alert-error'}`}>
          {msg.ok ? '✓' : '⚠'} {msg.text}
        </div>
      )}

      <div className="card">
        <div className="card-header">
          <span className="card-title">Déclarer un incident</span>
        </div>
        <form onSubmit={handleReport}>
          <div className="form-row cols-3">
            <div className="form-group" style={{ margin: 0 }}>
              <label>Type d'incident</label>
              <select value={form.type} onChange={e => setForm({ ...form, type: e.target.value })}>
                <option value="Accident">💥 Accident</option>
                <option value="Travaux">🚧 Travaux</option>
                <option value="Route fermee">🚫 Route fermée</option>
                <option value="Embouteillage">🚙 Embouteillage</option>
              </select>
            </div>
            <div className="form-group" style={{ margin: 0 }}>
              <label>Latitude</label>
              <input
                type="number" step="0.0001"
                value={form.latitude}
                onChange={e => setForm({ ...form, latitude: e.target.value })}
              />
            </div>
            <div className="form-group" style={{ margin: 0 }}>
              <label>Longitude</label>
              <input
                type="number" step="0.0001"
                value={form.longitude}
                onChange={e => setForm({ ...form, longitude: e.target.value })}
              />
            </div>
          </div>
          <div className="form-group mt-4">
            <label>Description</label>
            <input
              value={form.description}
              onChange={e => setForm({ ...form, description: e.target.value })}
              placeholder="ex: Collision sur Avenue Bourguiba..."
            />
          </div>
          <button type="submit" className="btn btn-danger" disabled={reporting}>
            {reporting
              ? <><span className="spinner" style={{ borderTopColor: '#fff', borderColor: 'rgba(255,255,255,0.3)' }} /> Envoi...</>
              : '🚨 Déclarer l\'incident'}
          </button>
        </form>
      </div>

      <div className="flex-between mb-4">
        <div className="flex" style={{ gap: 10 }}>
          <span style={{ fontWeight: 700, fontSize: 15 }}>
            Incidents ({incidents.length})
          </span>
          {open > 0 && <span className="badge badge-danger">{open} actif{open > 1 ? 's' : ''}</span>}
        </div>
        <button className="btn btn-ghost btn-sm" onClick={() => refetch()}>Actualiser</button>
      </div>

      {loading ? (
        <div className="loading"><div className="spinner" /> Chargement...</div>
      ) : incidents.length === 0 ? (
        <div className="empty-state">
          <span className="empty-state-icon">🚨</span>
          <p>Aucun incident déclaré</p>
          <p className="hint">Utilisez le formulaire ci-dessus pour en déclarer un</p>
        </div>
      ) : (
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>#</th>
                <th>Type</th>
                <th>Description</th>
                <th>Position</th>
                <th>Date</th>
                <th>Statut</th>
                <th>Changer</th>
              </tr>
            </thead>
            <tbody>
              {incidents.map(inc => (
                <tr key={inc.id}>
                  <td className="text-muted font-mono">#{inc.id}</td>
                  <td>
                    <span style={{ marginRight: 6 }}>{TYPE_ICONS[inc.type] || '⚠️'}</span>
                    {inc.type}
                  </td>
                  <td className="text-muted text-sm" style={{ maxWidth: 200 }}>
                    {inc.description || '—'}
                  </td>
                  <td className="font-mono text-sm text-muted">
                    {parseFloat(inc.latitude).toFixed(4)}, {parseFloat(inc.longitude).toFixed(4)}
                  </td>
                  <td className="text-muted text-sm">
                    {new Date(inc.created_at).toLocaleString('fr-FR')}
                  </td>
                  <td>{statusBadge(inc.status)}</td>
                  <td>
                    <select
                      value={inc.status}
                      onChange={e => updateStatus({ variables: { id: inc.id, status: e.target.value } })}
                      style={{
                        padding: '5px 10px',
                        borderRadius: 'var(--radius-xs)',
                        border: '1px solid var(--border)',
                        background: 'var(--surface2)',
                        color: 'var(--text)',
                        fontSize: 12,
                        fontFamily: 'inherit',
                        cursor: 'pointer',
                      }}
                    >
                      <option value="Signale">Signalé</option>
                      <option value="En cours">En cours</option>
                      <option value="Resolu">Résolu</option>
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
