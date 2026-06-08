import { useState } from 'react'
import { Link, NavLink, useNavigate } from 'react-router-dom'
import { useQuery } from '@apollo/client'
import { CONNECTION_REQUESTS } from '../graphql/operations'
import { useAuth } from '../auth/AuthContext'

export default function NavBar() {
  const { user, logout, isAuthenticated } = useAuth()
  const navigate = useNavigate()
  const [term, setTerm] = useState('')

  const { data } = useQuery(CONNECTION_REQUESTS, { skip: !isAuthenticated })
  const pendingCount = data?.connectionRequests?.length || 0

  const onSearch = (e) => {
    e.preventDefault()
    const q = term.trim()
    if (!q) return
    navigate(`/search?q=${encodeURIComponent(q)}`)
  }

  const onSignOut = async () => {
    await logout()
    navigate('/login')
  }

  return (
    <nav className="navbar">
      <div className="navbar-inner">
        <Link className="brand" to="/">in</Link>

        {isAuthenticated && (
          <form className="nav-search" onSubmit={onSearch} role="search">
            <input
              className="input"
              type="search"
              name="q"
              placeholder="Search people…"
              aria-label="Search people"
              value={term}
              onChange={(e) => setTerm(e.target.value)}
            />
          </form>
        )}

        <div className="nav-spacer" />

        {isAuthenticated ? (
          <div className="nav-links">
            <NavLink
              className={({ isActive }) => 'nav-link' + (isActive ? ' active' : '')}
              to="/"
              end
            >
              Home
            </NavLink>
            <NavLink
              className={({ isActive }) => 'nav-link' + (isActive ? ' active' : '')}
              to="/network"
            >
              My Network
              {pendingCount > 0 && <span className="nav-badge">{pendingCount}</span>}
            </NavLink>
            <NavLink
              className={({ isActive }) => 'nav-link' + (isActive ? ' active' : '')}
              to={`/profile/${user.id}`}
            >
              Me
            </NavLink>
            <button type="button" className="btn btn-ghost btn-sm" onClick={onSignOut}>
              Sign out
            </button>
          </div>
        ) : (
          <div className="nav-links">
            <Link className="nav-link" to="/login">Sign in</Link>
            <Link className="btn btn-primary btn-sm" to="/signup">Join now</Link>
          </div>
        )}
      </div>
    </nav>
  )
}
