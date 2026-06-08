import { useEffect, useRef, useState } from 'react'
import { useQuery } from '@apollo/client'
import { FEED } from '../graphql/operations'
import Seo from '../components/Seo'
import PostComposer from '../components/PostComposer'
import PostCard from '../components/PostCard'
import ProfileSidebar from '../components/ProfileSidebar'
import ActivitySidebar from '../components/ActivitySidebar'

export default function FeedPage() {
  const { data, loading, error } = useQuery(FEED, {
    variables: { limit: 20 },
  })
  const [posts, setPosts] = useState([])
  const seededRef = useRef(false)

  // Seed the list from the query once. We don't re-overwrite on later cache
  // updates so posts added via the composer aren't wiped out.
  useEffect(() => {
    if (data?.feed && !seededRef.current) {
      seededRef.current = true
      setPosts(data.feed)
    }
  }, [data])

  return (
    <>
      <Seo title="Home" description="Your professional feed" />
      <div className="feed-layout">
        <aside className="hide-mobile">
          <ProfileSidebar />
        </aside>

        <div className="stack">
          <PostComposer onPosted={(p) => setPosts((prev) => [p, ...prev])} />

          {loading && <div className="spinner">Loading…</div>}
          {error && <div className="error-text">{error.message}</div>}

          {!loading && !error && posts.length === 0 && (
            <div className="empty">
              Your feed is empty. Connect with people or share your first post.
            </div>
          )}

          {posts.map((p) => (
            <PostCard key={p.id} post={p} />
          ))}
        </div>

        <aside className="hide-mobile">
          <ActivitySidebar />
        </aside>
      </div>
    </>
  )
}
