import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Overview      from '../components/Overview'
import VehiclesTab   from '../components/VehiclesTab'
import TrafficTab    from '../components/TrafficTab'
import IncidentsTab  from '../components/IncidentsTab'
import NotifsTab     from '../components/NotifsTab'

export default function Dashboard() {
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState('overview')
  const user = JSON.parse(localStorage.getItem('user') || '{}')

  const handleLogout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    navigate('/login')
  }

  const tabs = [
    { id: 'overview',  label: 'Vue d\'ensemble', icon: '📊' },
    { id: 'vehicles',  label: 'Véhicules',       icon: '🚗' },
    { id: 'traffic',   label: 'Trafic',          icon: '🚦' },
    { id: 'incidents', label: 'Incidents',       icon: '🚨' },
    { id: 'notifs',    label: 'Notifications',   icon: '🔔' },
  ]

  return (
    <>
      <nav className="navbar">
        <div className="navbar-brand">
          <span className="logo">🚦</span>
          <span>Traffic Platform — Tunis</span>
        </div>
        <div className="user-info">
          <span className="user-name">{user.name}</span>
          <span className={`role-badge ${user.role === 'ADMIN' ? 'admin' : ''}`}>
            {user.role}
          </span>
          <button onClick={handleLogout} className="btn btn-secondary">
            🚪 Déconnexion
          </button>
        </div>
      </nav>

      <div className="container">
        <div className="tabs">
          {tabs.map(tab => (
            <button
              key={tab.id}
              className={`tab ${activeTab === tab.id ? 'active' : ''}`}
              onClick={() => setActiveTab(tab.id)}
            >
              <span>{tab.icon}</span>
              <span>{tab.label}</span>
            </button>
          ))}
        </div>

        {activeTab === 'overview'  && <Overview />}
        {activeTab === 'vehicles'  && <VehiclesTab />}
        {activeTab === 'traffic'   && <TrafficTab />}
        {activeTab === 'incidents' && <IncidentsTab />}
        {activeTab === 'notifs'    && <NotifsTab />}
      </div>
    </>
  )
}
