import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useQuery, useMutation, useSubscription } from '@apollo/client'
import { USER_PROFILE, UPDATE_PROFILE, SEND_CONNECTION_REQUEST, POST_ADDED } from '../graphql/operations'
import { useAuth } from '../auth/AuthContext'
import Avatar from '../components/Avatar'
import Seo from '../components/Seo'
import PostCard from '../components/PostCard'
import { trackEvent } from '../analytics/ga'

function formatRange(startDate, endDate) {
  const start = startDate || ''
  const end = endDate || 'Present'
  if (!start && !endDate) return 'Present'
  return `${start} – ${end}`
}

function ConnectAction({ profile }) {
  const status = profile.connectionStatus
  const [sent, setSent] = useState(false)
  const [sendRequest, { loading }] = useMutation(SEND_CONNECTION_REQUEST)

  if (status === 'CONNECTED') {
    return <span className="btn btn-outline" aria-disabled="true">✓ Connected</span>
  }
  if (status === 'REQUEST_SENT' || sent) {
    return (
      <button type="button" className="btn btn-outline" disabled>
        Pending
      </button>
    )
  }
  if (status === 'REQUEST_RECEIVED') {
    return (
      <Link className="btn btn-primary" to="/network">
        Respond
      </Link>
    )
  }
  // NONE
  return (
    <button
      type="button"
      className="btn btn-primary"
      disabled={loading}
      onClick={async () => {
        try {
          await sendRequest({ variables: { userId: profile.id } })
          trackEvent('send_connection_request', { userId: profile.id })
          setSent(true)
        } catch (err) {
          /* surfaced by Apollo; keep button enabled */
        }
      }}
    >
      {loading ? 'Connecting…' : 'Connect'}
    </button>
  )
}

function EditProfileForm({ profile, onDone }) {
  const [form, setForm] = useState({
    name: profile.name || '',
    headline: profile.headline || '',
    location: profile.location || '',
    about: profile.about || '',
    avatarUrl: profile.avatarUrl || '',
  })
  const [updateProfile, { loading, error }] = useMutation(UPDATE_PROFILE)

  const change = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }))

  const submit = async (e) => {
    e.preventDefault()
    try {
      await updateProfile({ variables: { input: form } })
      onDone()
    } catch (err) {
      /* error rendered below */
    }
  }

  return (
    <form className="stack" onSubmit={submit}>
      <div className="field">
        <label htmlFor="edit-name">Name</label>
        <input
          id="edit-name"
          className="input"
          value={form.name}
          onChange={change('name')}
          required
        />
      </div>
      <div className="field">
        <label htmlFor="edit-headline">Headline</label>
        <input
          id="edit-headline"
          className="input"
          value={form.headline}
          onChange={change('headline')}
        />
      </div>
      <div className="field">
        <label htmlFor="edit-location">Location</label>
        <input
          id="edit-location"
          className="input"
          value={form.location}
          onChange={change('location')}
        />
      </div>
      <div className="field">
        <label htmlFor="edit-about">About</label>
        <textarea
          id="edit-about"
          className="textarea"
          rows={4}
          value={form.about}
          onChange={change('about')}
        />
      </div>
      <div className="field">
        <label htmlFor="edit-avatar">Avatar URL</label>
        <input
          id="edit-avatar"
          className="input"
          value={form.avatarUrl}
          onChange={change('avatarUrl')}
        />
      </div>
      {error && <div className="error-text">{error.message}</div>}
      <div className="row">
        <button type="submit" className="btn btn-primary" disabled={loading}>
          {loading ? 'Saving…' : 'Save'}
        </button>
        <button type="button" className="btn btn-ghost" onClick={onDone} disabled={loading}>
          Cancel
        </button>
      </div>
    </form>
  )
}

export default function ProfilePage() {
  const { id } = useParams()
  const { user: me } = useAuth()
  const isOwn = me && String(me.id) === String(id)
  const [editing, setEditing] = useState(false)

  const { data, loading, error } = useQuery(USER_PROFILE, { variables: { id } })

  // Live: prepend this person's new posts as they happen (uses the server-side
  // authorId filter on the postAdded subscription).
  const { data: livePost } = useSubscription(POST_ADDED, { variables: { authorId: id } })
  const [livePosts, setLivePosts] = useState([])
  useEffect(() => setLivePosts([]), [id]) // reset when switching profiles
  useEffect(() => {
    const p = livePost?.postAdded
    if (!p) return
    setLivePosts((prev) => (prev.some((x) => x.id === p.id) ? prev : [p, ...prev]))
  }, [livePost])

  if (loading) return <div className="spinner">Loading…</div>
  if (error) return <div className="error-text">{error.message}</div>

  const profile = data && data.user
  if (!profile) {
    return <div className="empty">This profile could not be found.</div>
  }

  const experiences = profile.experiences || []
  // Merge live posts ahead of the fetched ones, de-duped by id.
  const fetchedPosts = profile.posts || []
  const seen = new Set(fetchedPosts.map((p) => p.id))
  const posts = [...livePosts.filter((p) => !seen.has(p.id)), ...fetchedPosts]
  const showAboutCard = Boolean(profile.about) || isOwn

  return (
    <section className="stack">
      <Seo
        title={profile.name}
        description={profile.headline || `Profile of ${profile.name}`}
      />

      {/* Header card */}
      <article className="card">
        <div className="profile-cover" />
        <div className="card-body">
          <div className="profile-head">
            <Avatar user={profile} size="lg" to={null} />
            <h1 className="profile-name">{profile.name}</h1>
            {profile.headline && <p className="muted">{profile.headline}</p>}
            {profile.location && <p className="muted">{profile.location}</p>}
            <p className="muted">{profile.connectionCount} connections</p>

            <div className="row">
              {isOwn ? (
                <button
                  type="button"
                  className="btn btn-outline"
                  onClick={() => setEditing((v) => !v)}
                >
                  {editing ? 'Close' : 'Edit profile'}
                </button>
              ) : (
                <ConnectAction profile={profile} />
              )}
            </div>
          </div>

          {isOwn && editing && (
            <div className="card-section">
              <EditProfileForm profile={profile} onDone={() => setEditing(false)} />
            </div>
          )}
        </div>
      </article>

      {/* About card */}
      {showAboutCard && (
        <article className="card">
          <div className="card-body stack">
            <h2 className="card-title">About</h2>
            {profile.about ? (
              <p className="post-content">{profile.about}</p>
            ) : (
              <p className="muted">No summary yet.</p>
            )}
          </div>
        </article>
      )}

      {/* Experience card */}
      <article className="card">
        <div className="card-body stack">
          <h2 className="card-title">Experience</h2>
          {experiences.length === 0 ? (
            <div className="empty">No experience added yet.</div>
          ) : (
            <ul className="stack">
              {experiences.map((exp) => (
                <li key={exp.id} className="exp-item">
                  <strong>
                    {exp.title}
                    {exp.company ? ` @ ${exp.company}` : ''}
                  </strong>
                  {exp.location && <div className="muted">{exp.location}</div>}
                  <div className="muted">{formatRange(exp.startDate, exp.endDate)}</div>
                  {exp.description && <p>{exp.description}</p>}
                </li>
              ))}
            </ul>
          )}
        </div>
      </article>

      {/* Activity / Posts card */}
      <article className="card">
        <div className="card-body stack">
          <h2 className="card-title">Activity</h2>
          {posts.length === 0 ? (
            <div className="empty">No posts yet.</div>
          ) : (
            <div className="stack">
              {posts.map((p) => (
                <PostCard key={p.id} post={p} />
              ))}
            </div>
          )}
        </div>
      </article>
    </section>
  )
}
