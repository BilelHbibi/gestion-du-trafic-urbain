import { useState } from 'react'
import { useQuery, useMutation, gql } from '@apollo/client'

const GET_VEHICLES = gql`
  query GetVehicles {
    getVehicles { id plate type owner created_at }
  }
`

const ADD_VEHICLE = gql`
  mutation AddVehicle($plate: String!, $type: String!, $owner: String!) {
    addVehicle(plate: $plate, type: $type, owner: $owner) { message }
  }
`

const ADD_POSITION = gql`
  mutation AddPosition($vehicle_id: Int!, $latitude: Float!, $longitude: Float!, $speed: Float) {
    addGpsPosition(vehicle_id: $vehicle_id, latitude: $latitude, longitude: $longitude, speed: $speed) {
      message
    }
  }
`

const TYPE_BADGE = {
  Voiture: 'badge-info',
  Camion:  'badge-warning',
  Bus:     'badge-purple',
  Moto:    'badge-success',
}

export default function VehiclesTab() {
  const { data, loading, refetch } = useQuery(GET_VEHICLES)
  const [form, setForm] = useState({ plate: '', type: 'Voiture', owner: '' })
  const [msg, setMsg]   = useState({ text: '', ok: true })

  const notify = (text, ok = true) => {
    setMsg({ text, ok })
    setTimeout(() => setMsg({ text: '', ok: true }), 4000)
  }

  const [addVehicle, { loading: adding }] = useMutation(ADD_VEHICLE, {
    onCompleted: () => {
      notify('Véhicule ajouté avec succès')
      setForm({ plate: '', type: 'Voiture', owner: '' })
      refetch()
    },
    onError: (err) => notify(err.message, false),
  })

  const [addPos] = useMutation(ADD_POSITION, {
    onCompleted: () => notify('Position GPS simulée'),
    onError: (err) => notify(err.message, false),
  })

  const simulatePosition = (id) => {
    addPos({
      variables: {
        vehicle_id: id,
        latitude:   36.80 + Math.random() * 0.12,
        longitude:  10.15 + Math.random() * 0.12,
        speed:      Math.floor(Math.random() * 80) + 10,
      },
    })
  }

  const vehicles = data?.getVehicles || []

  return (
    <div className="fade-in">
      <p className="section-subtitle">
        Gérez la flotte et simulez les positions GPS en temps réel
      </p>

      {msg.text && (
        <div className={`alert ${msg.ok ? 'alert-success' : 'alert-error'}`}>
          {msg.ok ? '✓' : '⚠'} {msg.text}
        </div>
      )}

      <div className="card">
        <div className="card-header">
          <span className="card-title">Enregistrer un véhicule</span>
        </div>
        <form
          onSubmit={e => { e.preventDefault(); addVehicle({ variables: form }) }}
          className="form-row cols-auto"
          style={{ alignItems: 'flex-end' }}
        >
          <div className="form-group" style={{ margin: 0 }}>
            <label>Plaque</label>
            <input
              placeholder="TN-1234-A"
              value={form.plate}
              onChange={e => setForm({ ...form, plate: e.target.value })}
              required
            />
          </div>
          <div className="form-group" style={{ margin: 0 }}>
            <label>Type</label>
            <select value={form.type} onChange={e => setForm({ ...form, type: e.target.value })}>
              <option>Voiture</option>
              <option>Camion</option>
              <option>Bus</option>
              <option>Moto</option>
            </select>
          </div>
          <div className="form-group" style={{ margin: 0 }}>
            <label>Propriétaire</label>
            <input
              placeholder="Ali Ben Salah"
              value={form.owner}
              onChange={e => setForm({ ...form, owner: e.target.value })}
              required
            />
          </div>
          <button type="submit" className="btn btn-primary" disabled={adding} style={{ marginBottom: 1 }}>
            {adding ? <><span className="spinner" style={{ borderTopColor: '#fff', borderColor: 'rgba(255,255,255,0.3)' }} /> Ajout...</> : '+ Ajouter'}
          </button>
        </form>
      </div>

      <div className="flex-between mb-4">
        <span style={{ fontWeight: 700, fontSize: 15, color: 'var(--text)' }}>
          Flotte ({vehicles.length} véhicule{vehicles.length !== 1 ? 's' : ''})
        </span>
        <button className="btn btn-ghost btn-sm" onClick={() => refetch()}>Actualiser</button>
      </div>

      {loading ? (
        <div className="loading"><div className="spinner" /> Chargement...</div>
      ) : vehicles.length === 0 ? (
        <div className="empty-state">
          <span className="empty-state-icon">🚗</span>
          <p>Aucun véhicule enregistré</p>
          <p className="hint">Utilisez le formulaire ci-dessus pour en ajouter un</p>
        </div>
      ) : (
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>#</th>
                <th>Plaque</th>
                <th>Type</th>
                <th>Propriétaire</th>
                <th>Enregistré le</th>
                <th>GPS</th>
              </tr>
            </thead>
            <tbody>
              {vehicles.map(v => (
                <tr key={v.id}>
                  <td className="text-muted font-mono">#{v.id}</td>
                  <td style={{ fontWeight: 700, letterSpacing: 1 }}>{v.plate}</td>
                  <td>
                    <span className={`badge ${TYPE_BADGE[v.type] || 'badge-gray'}`}>
                      {v.type}
                    </span>
                  </td>
                  <td>{v.owner}</td>
                  <td className="text-muted text-sm">
                    {new Date(v.created_at).toLocaleDateString('fr-FR')}
                  </td>
                  <td>
                    <button className="btn btn-secondary btn-sm" onClick={() => simulatePosition(v.id)}>
                      📍 Simuler
                    </button>
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
