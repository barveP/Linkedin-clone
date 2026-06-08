import { useState } from 'react'
import { useMutation } from '@apollo/client'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { LOGIN } from '../graphql/operations'
import { useAuth } from '../auth/AuthContext'
import Seo from '../components/Seo'
import { trackEvent } from '../analytics/ga'

export default function LoginPage() {
  const { isAuthenticated, login } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loginMutation, { loading, error }] = useMutation(LOGIN)

  if (isAuthenticated) return <Navigate to="/" replace />

  async function handleSubmit(e) {
    e.preventDefault()
    try {
      const { data } = await loginMutation({ variables: { email, password } })
      if (data?.login?.token) {
        await login(data.login.token, data.login.user)
        trackEvent('login')
        navigate('/')
      }
    } catch {
      // error surfaced via the `error` object below
    }
  }

  return (
    <div className="auth-wrap">
      <Seo title="Sign in" description="Sign in to InLink" />
      <section className="card auth-card">
        <div className="card-body">
          <h1 className="auth-title">Sign in</h1>
          <p className="auth-sub">Stay updated on your professional world.</p>

          <form className="stack" onSubmit={handleSubmit}>
            <div className="field">
              <label htmlFor="login-email">Email</label>
              <input
                id="login-email"
                className="input"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            <div className="field">
              <label htmlFor="login-password">Password</label>
              <input
                id="login-password"
                className="input"
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>

            {error && <p className="error-text">{error.message}</p>}

            <button
              type="submit"
              className="btn btn-primary btn-block"
              disabled={loading}
            >
              {loading ? 'Signing in…' : 'Sign in'}
            </button>
          </form>

          <p className="auth-alt">
            New to InLink? <Link to="/signup">Join now</Link>
          </p>

          <div className="demo-hint">
            Try the demo account: <strong>ada@example.com</strong> /{' '}
            <strong>password123</strong>
            <br />
            (also alan@, grace@, linus@ — all <strong>password123</strong>)
          </div>
        </div>
      </section>
    </div>
  )
}
