import { Link } from 'react-router-dom'
import Avatar from './Avatar'
import { useAuth } from '../auth/AuthContext'

export default function ProfileSidebar() {
  const { user } = useAuth()
  if (!user) return null

  const profilePath = `/profile/${user.id}`

  return (
    <aside className="card">
      <div className="profile-cover" />
      <div className="card-body center stack">
        <Avatar user={user} size="lg" to={profilePath} />
        <Link className="profile-name" to={profilePath}>{user.name}</Link>
        {user.headline && <p className="muted">{user.headline}</p>}
      </div>
      <div className="card-section center">
        <Link to={profilePath}>View profile</Link>
      </div>
    </aside>
  )
}
