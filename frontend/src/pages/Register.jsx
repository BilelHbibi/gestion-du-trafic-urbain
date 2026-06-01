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
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'OPERATOR' })
  const [error, setError]     = useState('')
  const [success, setSuccess] = useState('')

  const [register, { loading }] = useMutation(REGISTER, {
    onCompleted: () => {
      setSuccess('Compte créé ! Redirection...')
      setTimeout(() => navigate('/login'), 1500)
    },
    onError: (err) => setError(err.message),
  })

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value })

  const handleSubmit = (e) => {
    e.preventDefault()
    setError('')
    register({ variables: form })
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-logo">🚦</div>
        <h1>Inscription</h1>
        <p className="subtitle">Créez votre compte opérateur</p>

        {error   && <div className="alert alert-error">{error}</div>}
        {success && <div className="alert alert-success">{success}</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Nom complet</label>
            <input name="name" value={form.name} onChange={handleChange}
              placeholder="Ali Ben Salah" required />
          </div>

          <div className="form-group">
            <label>Email</label>
            <input type="email" name="email" value={form.email} onChange={handleChange}
              placeholder="ali@tekup.tn" required />
          </div>

          <div className="form-group">
            <label>Mot de passe</label>
            <input type="password" name="password" value={form.password} onChange={handleChange}
              placeholder="Au moins 6 caractères" required minLength={6} />
          </div>

          <div className="form-group">
            <label>Rôle</label>
            <select name="role" value={form.role} onChange={handleChange}>
              <option value="OPERATOR">Opérateur</option>
              <option value="ADMIN">Administrateur</option>
            </select>
          </div>

          <button type="submit" className="btn btn-primary btn-full" disabled={loading}>
            {loading ? '⏳ Création...' : '✨ Créer le compte'}
          </button>
        </form>

        <p style={{ textAlign: 'center', marginTop: 20, color: 'var(--text-muted)' }}>
          Déjà un compte ? <Link to="/login" style={{ color: 'var(--primary)' }}>Se connecter</Link>
        </p>
      </div>
    </div>
  )
}
