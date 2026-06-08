import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery, useSubscription } from '@apollo/client'
import { RECENT_ACTIVITY, ACTIVITY_ADDED } from '../graphql/operations'
import Avatar from './Avatar'
import { timeAgo } from '../utils/time'

const VERB_PHRASE = {
  POSTED: 'shared a post',
  LIKED: 'liked a post',
  COMMENTED: 'commented on a post',
  CONNECTED: 'made a new connection',
}

export default function ActivitySidebar() {
  const { data, loading, error } = useQuery(RECENT_ACTIVITY, {
    variables: { limit: 15 },
  })
  const { data: subData } = useSubscription(ACTIVITY_ADDED)
  const [activities, setActivities] = useState([])
  const seededRef = useRef(false)

  // Seed from the query exactly once, MERGING under any live items that may have
  // already arrived (a length===0 guard would lose the history if a live event
  // landed before the query resolved). Dedupe by id and sort newest-first.
  useEffect(() => {
    if (!data?.recentActivity || seededRef.current) return
    seededRef.current = true
    setActivities((prev) => {
      const seen = new Set(prev.map((a) => a.id))
      const merged = [...prev, ...data.recentActivity.filter((a) => !seen.has(a.id))]
      return merged
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
        .slice(0, 15)
    })
  }, [data])

  // Prepend live activities arriving via subscription.
  useEffect(() => {
    const incoming = subData?.activityAdded
    if (!incoming) return
    setActivities((prev) => {
      if (prev.some((a) => a.id === incoming.id)) return prev
      const next = [{ ...incoming, isNew: true }, ...prev]
      return next.slice(0, 15)
    })
  }, [subData])

  return (
    <section className="card">
      <div className="card-body">
        <h2 className="card-title">
          <span className="live-dot" /> Activity
        </h2>

        {loading && activities.length === 0 && (
          <div className="spinner">Loading…</div>
        )}
        {error && <div className="error-text">{error.message}</div>}

        {!loading && !error && activities.length === 0 && (
          <div className="empty">No recent activity yet.</div>
        )}

        <div className="stack">
          {activities.map((activity) => {
            const actor = activity.actor
            return (
              <div
                key={activity.id}
                className={activity.isNew ? 'activity-item flash' : 'activity-item'}
              >
                <Avatar user={actor} size="sm" />
                <div className="activity-text">
                  <div>
                    <Link to={`/profile/${actor.id}`}>
                      <strong>{actor.name}</strong>
                    </Link>{' '}
                    {VERB_PHRASE[activity.verb] || 'did something'}
                  </div>
                  <div className="muted">{timeAgo(activity.createdAt)}</div>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
