import { useState } from 'react'
import { useMutation, gql } from '@apollo/client'
import { useNavigate, Link } from 'react-router-dom'

const LOGIN = gql`
  mutation Login($email: String!, $password: String!) {
    login(email: $email, password: $password) {
      token
      user { id name email role }
    }
  }
`

export default function Login() {
  const navigate = useNavigate()
  const [form, setForm]   = useState({ email: '', password: '' })
  const [error, setError] = useState('')

  const [login, { loading }] = useMutation(LOGIN, {
    onCompleted: ({ login: res }) => {
      localStorage.setItem('token', res.token)
      localStorage.setItem('user', JSON.stringify(res.user))
      navigate('/')
    },
    onError: (err) => setError(err.message),
  })

  const handleSubmit = (e) => {
    e.preventDefault()
    setError('')
    login({ variables: form })
  }

  return (
    <div className="auth-page">
      <div className="auth-left">
        <div className="auth-left-logo">🚦</div>
        <h1 className="auth-left-title">Traffic Platform</h1>
        <p className="auth-left-sub">
          Système de supervision du trafic urbain de Tunis
        </p>
        <div className="auth-features">
          {[
            'Architecture microservices',
            'API GraphQL temps réel',
            'Authentification JWT sécurisée',
            'Alertes WebSocket instantanées',
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
          <h1>Connexion</h1>
          <p className="subtitle">Accédez à votre tableau de bord</p>

          {error && <div className="alert alert-error">⚠ {error}</div>}

          <form onSubmit={handleSubmit}>
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
                placeholder="••••••••"
                required
              />
            </div>
            <div style={{ marginBottom: 20 }} />
            <button type="submit" className="btn btn-primary btn-full" disabled={loading}>
              {loading
                ? <><span className="spinner" style={{ borderTopColor: '#fff', borderColor: 'rgba(255,255,255,0.3)' }} /> Connexion...</>
                : 'Se connecter'}
            </button>
          </form>

          <p style={{ textAlign: 'center', marginTop: 24, fontSize: 14, color: 'var(--text-muted)' }}>
            Pas encore de compte ?{' '}
            <Link to="/register" style={{ fontWeight: 600 }}>Créer un compte</Link>
          </p>
        </div>
      </div>
    </div>
  )
}
