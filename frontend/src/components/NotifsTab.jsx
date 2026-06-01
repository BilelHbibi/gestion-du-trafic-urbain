import { useQuery, useMutation, gql } from '@apollo/client'

const GET_NOTIFS = gql`
  query { getNotifications { id message is_read created_at } }
`

const MARK_READ = gql`
  mutation MarkRead($id: Int!) {
    markNotificationRead(id: $id) { message }
  }
`

export default function NotifsTab() {
  const { data, loading, refetch } = useQuery(GET_NOTIFS, { pollInterval: 3000 })
  const [markRead] = useMutation(MARK_READ, { onCompleted: refetch })

  return (
    <div>
      <h1 className="section-title">🔔 Notifications</h1>
      <p className="section-subtitle">Vos alertes en temps réel (rafraîchissement auto toutes les 3s)</p>

      {loading ? <p>⏳ Chargement...</p> : data?.getNotifications.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">🔔</div>
          <p>Aucune notification.</p>
          <p style={{ fontSize: 13, marginTop: 8 }}>
            Déclarez un incident pour voir une notification apparaître !
          </p>
        </div>
      ) : (
        <div>
          {data?.getNotifications.map(n => (
            <div key={n.id} className={`notif-item ${n.is_read ? 'read' : ''}`}>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, marginBottom: 4 }}>
                  {n.is_read ? '✅' : '🔔'} {n.message}
                </div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                  {new Date(n.created_at).toLocaleString()}
                </div>
              </div>
              {!n.is_read && (
                <button className="btn btn-secondary" onClick={() => markRead({ variables: { id: n.id } })}>
                  ✓ Marquer comme lue
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
