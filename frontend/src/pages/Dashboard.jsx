import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, gql } from '@apollo/client'
import Overview     from '../components/Overview'
import VehiclesTab  from '../components/VehiclesTab'
import TrafficTab   from '../components/TrafficTab'
import IncidentsTab from '../components/IncidentsTab'
import NotifsTab    from '../components/NotifsTab'
import UsersTab     from '../components/UsersTab'

const NOTIF_COUNT = gql`query { getNotifications { id is_read } }`

export default function Dashboard() {
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState('overview')
  const user = JSON.parse(localStorage.getItem('user') || '{}')
  const { data } = useQuery(NOTIF_COUNT, { pollInterval: 5000 })
  const unread = data?.getNotifications?.filter(n => !n.is_read).length || 0

  const handleLogout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    navigate('/login')
  }

  const isAdmin = user.role === 'ADMIN'

  const tabs = [
    { id: 'overview',  label: "Vue d'ensemble", icon: '📊' },
    { id: 'vehicles',  label: 'Véhicules',      icon: '🚗' },
    { id: 'traffic',   label: 'Trafic',         icon: '🚦' },
    { id: 'incidents', label: 'Incidents',      icon: '🚨' },
    { id: 'notifs',    label: 'Notifications',  icon: '🔔' },
    ...(isAdmin ? [{ id: 'users', label: 'Utilisateurs', icon: '👥', adminOnly: true }] : []),
  ]

  const currentTab = tabs.find(t => t.id === activeTab)

  return (
    <div className="layout">
      <aside className="sidebar">
        <div className="sidebar-brand">
          <div className="brand-icon">🚦</div>
          <div>
            <span className="brand-name">Traffic Platform</span>
            <span className="brand-sub">Tunis Control Center</span>
          </div>
        </div>

        <nav className="sidebar-nav">
          {tabs.filter(t => !t.adminOnly).map(tab => (
            <button
              key={tab.id}
              className={`nav-item ${activeTab === tab.id ? 'active' : ''}`}
              onClick={() => setActiveTab(tab.id)}
            >
              <span className="nav-icon">{tab.icon}</span>
              <span className="nav-label">{tab.label}</span>
              {tab.id === 'notifs' && unread > 0 && (
                <span className="nav-badge">{unread}</span>
              )}
            </button>
          ))}
          {isAdmin && (
            <>
              <div className="nav-section-label">Administration</div>
              <button
                className={`nav-item ${activeTab === 'users' ? 'active' : ''}`}
                onClick={() => setActiveTab('users')}
              >
                <span className="nav-icon">👥</span>
                <span className="nav-label">Utilisateurs</span>
              </button>
            </>
          )}
        </nav>

        <div className="sidebar-footer">
          <div className="user-info-card">
            <div className="user-avatar">
              {(user.name || 'U')[0].toUpperCase()}
            </div>
            <div>
              <span className="user-name-side">{user.name}</span>
              <span className="user-role-side">{user.role}</span>
            </div>
          </div>
          <button onClick={handleLogout} className="logout-btn">
            Déconnexion
          </button>
        </div>
      </aside>

      <main className="main-content">
        <div className="top-bar">
          <span className="page-title">
            {currentTab?.icon} {currentTab?.label}
          </span>
          <div className="live-badge">
            <span className="live-dot" />
            Temps réel
          </div>
        </div>

        <div className="content-area">
          {activeTab === 'overview'  && <Overview />}
          {activeTab === 'vehicles'  && <VehiclesTab />}
          {activeTab === 'traffic'   && <TrafficTab />}
          {activeTab === 'incidents' && <IncidentsTab />}
          {activeTab === 'notifs'    && <NotifsTab />}
          {activeTab === 'users'     && isAdmin && <UsersTab />}
        </div>
      </main>
    </div>
  )
}
