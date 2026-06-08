import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useQuery } from '@apollo/client'
import { SEARCH_USERS } from '../graphql/operations'
import Seo from '../components/Seo'
import UserCard from '../components/UserCard'

export default function SearchPage() {
  const [params, setParams] = useSearchParams()
  const term = params.get('q') || ''

  const [value, setValue] = useState(term)

  useEffect(() => {
    setValue(term)
  }, [term])

  const { data, loading, error } = useQuery(SEARCH_USERS, {
    variables: { term },
  })

  function handleSubmit(e) {
    e.preventDefault()
    const next = value.trim()
    setParams(next ? { q: next } : {})
  }

  const results = data?.searchUsers || []

  return (
    <main className="app-main">
      <Seo title="Search" description="Find people on InLink" />

      <section className="card">
        <form className="card-body" onSubmit={handleSubmit}>
          <div className="field">
            <label htmlFor="search-people">Search people</label>
            <input
              id="search-people"
              className="input"
              type="search"
              placeholder="Search by name or headline…"
              value={value}
              onChange={(e) => setValue(e.target.value)}
            />
          </div>
          <button type="submit" className="btn btn-primary">
            Search
          </button>
        </form>
      </section>

      <section className="card stack">
        {loading ? (
          <div className="spinner">Loading…</div>
        ) : error ? (
          <div className="error-text">{error.message}</div>
        ) : results.length === 0 ? (
          <div className="empty">No people found.</div>
        ) : (
          <div className="stack">
            {results.map((u) => (
              <UserCard key={u.id} user={u} />
            ))}
          </div>
        )}
      </section>
    </main>
  )
}
