import { useState } from 'react'
import { useQuery, useMutation, gql } from '@apollo/client'

const GET_USERS = gql`
  query { getUsers { id name email role created_at } }
`
const DELETE_USER = gql`
  mutation DeleteUser($id: Int!) {
    deleteUser(id: $id) { message }
  }
`

const ROLE_BADGE = {
  ADMIN:    'badge-danger',
  OPERATOR: 'badge-info',
}

export default function UsersTab() {
  const { data, loading, refetch } = useQuery(GET_USERS)
  const [msg, setMsg]   = useState({ text: '', ok: true })
  const [confirm, setConfirm] = useState(null)

  const currentUser = JSON.parse(localStorage.getItem('user') || '{}')

  const notify = (text, ok = true) => {
    setMsg({ text, ok })
    setTimeout(() => setMsg({ text: '', ok: true }), 5000)
  }

  const [deleteUser, { loading: deleting }] = useMutation(DELETE_USER, {
    onCompleted: () => { notify('Utilisateur supprimé'); setConfirm(null); refetch() },
    onError: (err) => { notify(err.message, false); setConfirm(null) },
  })

  const users = data?.getUsers || []
  const admins    = users.filter(u => u.role === 'ADMIN').length
  const operators = users.filter(u => u.role === 'OPERATOR').length

  return (
    <div className="fade-in">
      <p className="section-subtitle">
        Gestion des comptes — accès réservé aux administrateurs
      </p>

      {msg.text && (
        <div className={`alert ${msg.ok ? 'alert-success' : 'alert-error'}`}>
          {msg.ok ? '✓' : '⚠'} {msg.text}
        </div>
      )}

      {/* Confirm dialog */}
      {confirm && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
        }}>
          <div style={{
            background: 'var(--surface)', border: '1px solid var(--border)',
            borderRadius: 'var(--radius)', padding: 28, maxWidth: 380, width: '90%',
          }}>
            <div style={{ fontSize: 24, marginBottom: 12 }}>⚠️</div>
            <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 8 }}>
              Supprimer cet utilisateur ?
            </div>
            <div style={{ color: 'var(--text-muted)', fontSize: 14, marginBottom: 20 }}>
              <strong style={{ color: 'var(--text)' }}>{confirm.name}</strong> ({confirm.email}) sera définitivement supprimé.
            </div>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button className="btn btn-ghost btn-sm" onClick={() => setConfirm(null)}>
                Annuler
              </button>
              <button
                className="btn btn-danger btn-sm"
                disabled={deleting}
                onClick={() => deleteUser({ variables: { id: confirm.id } })}
              >
                {deleting ? 'Suppression...' : 'Confirmer la suppression'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Stats */}
      <div className="stats-grid" style={{ marginBottom: 24 }}>
        <div className="stat-card blue">
          <div className="stat-icon blue">👥</div>
          <div className="stat-value">{users.length}</div>
          <div className="stat-label">Total utilisateurs</div>
        </div>
        <div className="stat-card red">
          <div className="stat-icon red">🔑</div>
          <div className="stat-value">{admins}</div>
          <div className="stat-label">Administrateurs</div>
        </div>
        <div className="stat-card green">
          <div className="stat-icon green">👤</div>
          <div className="stat-value">{operators}</div>
          <div className="stat-label">Opérateurs</div>
        </div>
      </div>

      <div className="flex-between mb-4">
        <span style={{ fontWeight: 700, fontSize: 15 }}>
          Comptes ({users.length})
        </span>
        <button className="btn btn-ghost btn-sm" onClick={() => refetch()}>
          Actualiser
        </button>
      </div>

      {loading ? (
        <div className="loading"><div className="spinner" /> Chargement...</div>
      ) : users.length === 0 ? (
        <div className="empty-state">
          <span className="empty-state-icon">👥</span>
          <p>Aucun utilisateur trouvé</p>
        </div>
      ) : (
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>#</th>
                <th>Nom</th>
                <th>Email</th>
                <th>Rôle</th>
                <th>Inscrit le</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map(u => (
                <tr key={u.id}>
                  <td className="text-muted font-mono">#{u.id}</td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{
                        width: 32, height: 32, borderRadius: '50%',
                        background: u.role === 'ADMIN'
                          ? 'rgba(239,68,68,0.15)' : 'rgba(59,130,246,0.15)',
                        border: `1px solid ${u.role === 'ADMIN' ? 'rgba(239,68,68,0.3)' : 'rgba(59,130,246,0.3)'}`,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontWeight: 700, fontSize: 13,
                        color: u.role === 'ADMIN' ? 'var(--danger)' : 'var(--primary)',
                        flexShrink: 0,
                      }}>
                        {u.name[0].toUpperCase()}
                      </div>
                      <span style={{ fontWeight: 600 }}>
                        {u.name}
                        {u.id === currentUser.id && (
                          <span style={{ fontSize: 11, color: 'var(--text-muted)', marginLeft: 6 }}>(vous)</span>
                        )}
                      </span>
                    </div>
                  </td>
                  <td className="text-muted text-sm">{u.email}</td>
                  <td>
                    <span className={`badge ${ROLE_BADGE[u.role] || 'badge-gray'}`}>
                      {u.role}
                    </span>
                  </td>
                  <td className="text-muted text-sm">
                    {new Date(u.created_at).toLocaleDateString('fr-FR')}
                  </td>
                  <td>
                    {u.id === currentUser.id ? (
                      <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>—</span>
                    ) : (
                      <button
                        className="btn btn-danger btn-sm"
                        onClick={() => setConfirm(u)}
                      >
                        🗑 Supprimer
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="card" style={{ marginTop: 24, borderColor: 'rgba(239,68,68,0.2)' }}>
        <div className="card-header">
          <span className="card-title">À propos des rôles</span>
          <span className="badge badge-gray">Info</span>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div style={{
            background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)',
            borderRadius: 'var(--radius-sm)', padding: '12px 16px',
          }}>
            <div style={{ fontWeight: 700, marginBottom: 4, color: 'var(--danger)', fontSize: 13 }}>
              🔑 ADMIN
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.5 }}>
              Accès complet. Peut voir et supprimer tous les utilisateurs.
            </div>
          </div>
          <div style={{
            background: 'rgba(59,130,246,0.08)', border: '1px solid rgba(59,130,246,0.2)',
            borderRadius: 'var(--radius-sm)', padding: '12px 16px',
          }}>
            <div style={{ fontWeight: 700, marginBottom: 4, color: 'var(--primary)', fontSize: 13 }}>
              👤 OPERATOR
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.5 }}>
              Accès standard. Peut gérer les véhicules, trafic et incidents.
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
