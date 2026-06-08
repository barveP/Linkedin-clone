import { useState } from 'react'
import { useMutation } from '@apollo/client'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { SIGNUP } from '../graphql/operations'
import { useAuth } from '../auth/AuthContext'
import Seo from '../components/Seo'
import { trackEvent } from '../analytics/ga'

export default function SignupPage() {
  const { isAuthenticated, login } = useAuth()
  const navigate = useNavigate()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [headline, setHeadline] = useState('')
  const [signupMutation, { loading, error }] = useMutation(SIGNUP)

  if (isAuthenticated) return <Navigate to="/" replace />

  async function handleSubmit(e) {
    e.preventDefault()
    try {
      const { data } = await signupMutation({
        variables: { input: { name, email, password, headline } },
      })
      if (data?.signup?.token) {
        await login(data.signup.token, data.signup.user)
        trackEvent('signup')
        navigate('/')
      }
    } catch {
      // error surfaced via the `error` object below
    }
  }

  return (
    <div className="auth-wrap">
      <Seo title="Join" description="Create your InLink account" />
      <section className="card auth-card">
        <div className="card-body">
          <h1 className="auth-title">Join InLink</h1>
          <p className="auth-sub">Make the most of your professional life.</p>

          <form className="stack" onSubmit={handleSubmit}>
            <div className="field">
              <label htmlFor="signup-name">Name</label>
              <input
                id="signup-name"
                className="input"
                type="text"
                autoComplete="name"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>

            <div className="field">
              <label htmlFor="signup-email">Email</label>
              <input
                id="signup-email"
                className="input"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            <div className="field">
              <label htmlFor="signup-password">Password</label>
              <input
                id="signup-password"
                className="input"
                type="password"
                autoComplete="new-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>

            <div className="field">
              <label htmlFor="signup-headline">Headline (optional)</label>
              <input
                id="signup-headline"
                className="input"
                type="text"
                placeholder="e.g. Software Engineer at InLink"
                value={headline}
                onChange={(e) => setHeadline(e.target.value)}
              />
            </div>

            {error && <p className="error-text">{error.message}</p>}

            <button
              type="submit"
              className="btn btn-primary btn-block"
              disabled={loading}
            >
              {loading ? 'Creating account…' : 'Agree & Join'}
            </button>
          </form>

          <p className="auth-alt">
            Already on InLink? <Link to="/login">Sign in</Link>
          </p>
        </div>
      </section>
    </div>
  )
}
