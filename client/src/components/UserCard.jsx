import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useMutation } from '@apollo/client'
import { SEND_CONNECTION_REQUEST } from '../graphql/operations'
import Avatar from './Avatar'
import { trackEvent } from '../analytics/ga'

export default function UserCard({ user, showConnect = true }) {
  const [status, setStatus] = useState(user.connectionStatus)
  const [sendRequest, { loading }] = useMutation(SEND_CONNECTION_REQUEST, {
    variables: { userId: user.id },
    onCompleted: () => setStatus('REQUEST_SENT'),
  })

  function handleConnect() {
    trackEvent('send_connection_request', { userId: user.id })
    sendRequest().catch(() => {})
  }

  function renderConnect() {
    if (!showConnect || status === 'SELF') return null

    switch (status) {
      case 'NONE':
        return (
          <button
            type="button"
            className="btn btn-outline btn-sm"
            onClick={handleConnect}
            disabled={loading}
          >
            {loading ? 'Connecting…' : 'Connect'}
          </button>
        )
      case 'REQUEST_SENT':
        return (
          <button type="button" className="btn btn-outline btn-sm" disabled>
            Pending
          </button>
        )
      case 'CONNECTED':
        return <span className="muted">✓ Connected</span>
      case 'REQUEST_RECEIVED':
        return (
          <Link to="/network" className="muted">
            Respond in My Network
          </Link>
        )
      default:
        return null
    }
  }

  return (
    <div className="card-body row between">
      <div className="row">
        <Avatar user={user} size="md" to={`/profile/${user.id}`} />
        <div className="stack">
          <Link to={`/profile/${user.id}`} className="post-author">
            {user.name}
          </Link>
          {user.headline && <span className="muted">{user.headline}</span>}
          {user.location && (
            <span className="muted" style={{ fontSize: '0.85em' }}>
              {user.location}
            </span>
          )}
        </div>
      </div>
      <div>{renderConnect()}</div>
    </div>
  )
}
