import { useState } from 'react'
import { useMutation, gql } from '@apollo/client'
import { useNavigate, Link } from 'react-router-dom'

const REGISTER = gql`
  mutation Register($name: String!, $email: String!, $password: String!, $role: String) {
    register(name: $name, email: $email, password: $password, role: $role) {
      message
    }
  }
`

export default function Register() {
  const navigate = useNavigate()
  const [form, setForm]       = useState({ name: '', email: '', password: '', role: 'OPERATOR' })
  const [error, setError]     = useState('')
  const [success, setSuccess] = useState('')

  const [register, { loading }] = useMutation(REGISTER, {
    onCompleted: () => {
      setSuccess('Compte créé ! Redirection...')
      setTimeout(() => navigate('/login'), 1400)
    },
    onError: (err) => setError(err.message),
  })

  const handleSubmit = (e) => {
    e.preventDefault()
    setError('')
    register({ variables: form })
  }

  return (
    <div className="auth-page">
      <div className="auth-left">
        <div className="auth-left-logo">🚦</div>
        <h1 className="auth-left-title">Traffic Platform</h1>
        <p className="auth-left-sub">
          Rejoignez l'équipe de supervision du trafic urbain de Tunis
        </p>
        <div className="auth-features">
          {[
            'Accès au tableau de bord temps réel',
            'Gestion de la flotte de véhicules',
            'Déclaration et suivi des incidents',
            'Notifications automatiques WebSocket',
          ].map((f, i) => (
            <div key={i} className="auth-feature">
              <span className="auth-feature-dot" />
              {f}
            </div>
          ))}
        </div>
      </div>

      <div className="auth-right">
        <div className="auth-card">
          <h1>Inscription</h1>
          <p className="subtitle">Créez votre compte opérateur</p>

          {error   && <div className="alert alert-error">⚠ {error}</div>}
          {success && <div className="alert alert-success">✓ {success}</div>}

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label>Nom complet</label>
              <input
                value={form.name}
                onChange={e => setForm({ ...form, name: e.target.value })}
                placeholder="Ali Ben Salah"
                required
              />
            </div>
            <div className="form-group">
              <label>Adresse email</label>
              <input
                type="email"
                value={form.email}
                onChange={e => setForm({ ...form, email: e.target.value })}
                placeholder="ali@tekup.tn"
                required
              />
            </div>
            <div className="form-group">
              <label>Mot de passe</label>
              <input
                type="password"
                value={form.password}
                onChange={e => setForm({ ...form, password: e.target.value })}
                placeholder="Minimum 6 caractères"
                required
                minLength={6}
              />
            </div>
            <div className="form-group">
              <label>Rôle</label>
              <select value={form.role} onChange={e => setForm({ ...form, role: e.target.value })}>
                <option value="OPERATOR">Opérateur</option>
                <option value="ADMIN">Administrateur</option>
              </select>
            </div>
            <div style={{ marginBottom: 20 }} />
            <button type="submit" className="btn btn-primary btn-full" disabled={loading}>
              {loading
                ? <><span className="spinner" style={{ borderTopColor: '#fff', borderColor: 'rgba(255,255,255,0.3)' }} /> Création...</>
                : 'Créer mon compte'}
            </button>
          </form>

          <p style={{ textAlign: 'center', marginTop: 24, fontSize: 14, color: 'var(--text-muted)' }}>
            Déjà un compte ?{' '}
            <Link to="/login" style={{ fontWeight: 600 }}>Se connecter</Link>
          </p>
        </div>
      </div>
    </div>
  )
}
