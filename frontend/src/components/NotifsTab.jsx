import { useQuery, useMutation, gql } from '@apollo/client'

const GET_NOTIFS = gql`
  query { getNotifications { id message is_read created_at } }
`
const MARK_READ = gql`
  mutation MarkRead($id: Int!) {
    markNotificationRead(id: $id) { message }
  }
`

function timeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime()
  const s = Math.floor(diff / 1000)
  if (s < 60)   return 'À l\'instant'
  if (s < 3600) return `Il y a ${Math.floor(s / 60)} min`
  if (s < 86400) return `Il y a ${Math.floor(s / 3600)} h`
  return new Date(dateStr).toLocaleDateString('fr-FR')
}

export default function NotifsTab() {
  const { data, loading, refetch } = useQuery(GET_NOTIFS, { pollInterval: 3000 })
  const [markRead] = useMutation(MARK_READ, { onCompleted: refetch })

  const notifs  = data?.getNotifications || []
  const unread  = notifs.filter(n => !n.is_read).length

  return (
    <div className="fade-in">
      <div className="flex-between" style={{ marginBottom: 20 }}>
        <p className="section-subtitle" style={{ margin: 0 }}>
          Alertes temps réel — rafraîchissement auto toutes les 3s
        </p>
        <div className="flex" style={{ gap: 10 }}>
          {unread > 0 && <span className="badge badge-info">{unread} non lue{unread > 1 ? 's' : ''}</span>}
          <button className="btn btn-ghost btn-sm" onClick={() => refetch()}>Actualiser</button>
        </div>
      </div>

      {loading ? (
        <div className="loading"><div className="spinner" /> Chargement...</div>
      ) : notifs.length === 0 ? (
        <div className="empty-state">
          <span className="empty-state-icon">🔔</span>
          <p>Aucune notification</p>
          <p className="hint">Déclarez un incident pour voir apparaître une alerte ici</p>
        </div>
      ) : (
        <div>
          {unread > 0 && (
            <div style={{ marginBottom: 14 }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 0.6 }}>
                Non lues
              </span>
            </div>
          )}
          {notifs.map(n => (
            <div key={n.id} className={`notif-item ${n.is_read ? 'read' : 'unread'}`}>
              {!n.is_read && <span className="notif-dot" />}
              <div className="notif-content">
                <div className="notif-message">{n.message}</div>
                <div className="notif-time">{timeAgo(n.created_at)}</div>
              </div>
              {!n.is_read && (
                <button
                  className="btn btn-ghost btn-sm"
                  onClick={() => markRead({ variables: { id: n.id } })}
                  style={{ flexShrink: 0 }}
                >
                  ✓ Lue
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
