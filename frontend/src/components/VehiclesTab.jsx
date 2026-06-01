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

export default function VehiclesTab() {
  const { data, loading, refetch } = useQuery(GET_VEHICLES)
  const [form, setForm] = useState({ plate: '', type: 'Voiture', owner: '' })
  const [msg, setMsg] = useState('')

  const [addVehicle] = useMutation(ADD_VEHICLE, {
    onCompleted: () => { setMsg('✅ Véhicule ajouté'); setForm({ plate: '', type: 'Voiture', owner: '' }); refetch() },
    onError: (err) => setMsg(`❌ ${err.message}`),
  })

  const [addPos] = useMutation(ADD_POSITION, {
    onCompleted: () => setMsg('✅ Position GPS enregistrée'),
    onError: (err) => setMsg(`❌ ${err.message}`),
  })

  const handleAdd = (e) => {
    e.preventDefault()
    addVehicle({ variables: form })
  }

  const simulatePosition = (id) => {
    // Position GPS aléatoire autour de Tunis
    const lat = 36.80 + Math.random() * 0.1
    const lng = 10.15 + Math.random() * 0.1
    const speed = Math.floor(Math.random() * 80) + 20
    addPos({ variables: { vehicle_id: id, latitude: lat, longitude: lng, speed } })
  }

  return (
    <div>
      <h1 className="section-title">🚗 Gestion des véhicules</h1>
      <p className="section-subtitle">Ajoutez et suivez les véhicules de la flotte</p>

      {msg && <div className={`alert ${msg.startsWith('✅') ? 'alert-success' : 'alert-error'}`}>{msg}</div>}

      <div className="card">
        <div className="card-header">
          <h2 className="card-title">➕ Ajouter un véhicule</h2>
        </div>
        <form onSubmit={handleAdd} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr auto', gap: 12 }}>
          <div className="form-group" style={{ margin: 0 }}>
            <input placeholder="Plaque (TN-1234-A)" value={form.plate}
              onChange={(e) => setForm({...form, plate: e.target.value})} required />
          </div>
          <div className="form-group" style={{ margin: 0 }}>
            <select value={form.type} onChange={(e) => setForm({...form, type: e.target.value})}>
              <option>Voiture</option>
              <option>Camion</option>
              <option>Bus</option>
              <option>Moto</option>
            </select>
          </div>
          <div className="form-group" style={{ margin: 0 }}>
            <input placeholder="Propriétaire" value={form.owner}
              onChange={(e) => setForm({...form, owner: e.target.value})} required />
          </div>
          <button type="submit" className="btn btn-primary">Ajouter</button>
        </form>
      </div>

      <div style={{ marginTop: 24 }}>
        <h2 style={{ marginBottom: 16 }}>Liste des véhicules ({data?.getVehicles.length || 0})</h2>
        {loading ? <p>⏳ Chargement...</p> : data?.getVehicles.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">🚗</div>
            <p>Aucun véhicule. Ajoutez-en un ci-dessus !</p>
          </div>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>ID</th><th>Plaque</th><th>Type</th><th>Propriétaire</th><th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {data?.getVehicles.map(v => (
                <tr key={v.id}>
                  <td>#{v.id}</td>
                  <td><strong>{v.plate}</strong></td>
                  <td><span className="badge badge-info">{v.type}</span></td>
                  <td>{v.owner}</td>
                  <td>
                    <button className="btn btn-secondary" onClick={() => simulatePosition(v.id)}>
                      📍 Simuler position GPS
                    </button>
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
