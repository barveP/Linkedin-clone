import { useQuery, useMutation } from '@apollo/client'
import {
  CONNECTION_REQUESTS,
  CONNECTIONS,
  RESPOND_CONNECTION_REQUEST,
} from '../graphql/operations'
import Seo from '../components/Seo'
import Avatar from '../components/Avatar'
import UserCard from '../components/UserCard'

function InvitationRow({ request, onRespond, busy }) {
  const { requester } = request
  return (
    <div className="card-body row between">
      <div className="row">
        <Avatar user={requester} size="md" to={`/profile/${requester.id}`} />
        <div className="stack">
          <span className="post-author">{requester.name}</span>
          {requester.headline && (
            <span className="muted">{requester.headline}</span>
          )}
        </div>
      </div>
      <div className="row">
        <button
          type="button"
          className="btn btn-primary btn-sm"
          onClick={() => onRespond(request.id, true)}
          disabled={busy}
        >
          Accept
        </button>
        <button
          type="button"
          className="btn btn-ghost btn-sm"
          onClick={() => onRespond(request.id, false)}
          disabled={busy}
        >
          Ignore
        </button>
      </div>
    </div>
  )
}

export default function NetworkPage() {
  const requestsQuery = useQuery(CONNECTION_REQUESTS)
  const connectionsQuery = useQuery(CONNECTIONS)

  const [respond, { loading: responding }] = useMutation(
    RESPOND_CONNECTION_REQUEST,
    {
      onCompleted: () => {
        requestsQuery.refetch()
        connectionsQuery.refetch()
      },
    }
  )

  function handleRespond(connectionId, accept) {
    respond({ variables: { connectionId, accept } }).catch(() => {})
  }

  const requests = requestsQuery.data?.connectionRequests || []
  const connections = connectionsQuery.data?.connections || []

  return (
    <main className="app-main">
      <Seo title="My Network" description="Manage your connections" />

      <section className="card stack">
        <div className="card-body">
          <h2 className="card-title">Invitations</h2>
        </div>
        {requestsQuery.loading ? (
          <div className="spinner">Loading…</div>
        ) : requestsQuery.error ? (
          <div className="error-text">{requestsQuery.error.message}</div>
        ) : requests.length === 0 ? (
          <div className="empty">No pending invitations.</div>
        ) : (
          <div className="stack">
            {requests.map((r) => (
              <InvitationRow
                key={r.id}
                request={r}
                onRespond={handleRespond}
                busy={responding}
              />
            ))}
          </div>
        )}
      </section>

      <section className="card stack">
        <div className="card-body">
          <h2 className="card-title">Connections ({connections.length})</h2>
        </div>
        {connectionsQuery.loading ? (
          <div className="spinner">Loading…</div>
        ) : connectionsQuery.error ? (
          <div className="error-text">{connectionsQuery.error.message}</div>
        ) : connections.length === 0 ? (
          <div className="empty">You have no connections yet.</div>
        ) : (
          <div className="stack">
            {connections.map((c) => (
              <UserCard key={c.id} user={c} showConnect={false} />
            ))}
          </div>
        )}
      </section>
    </main>
  )
}
