import { useEffect, useImperativeHandle, useRef, useState, type Ref } from 'react'
import { SESSION_STATUSES } from '../../../api/contract'
import { EMPTY_FILTERS, hasActiveFilters } from '../model/filters'
import { STATUS_META } from '../model/status'
import type { SessionFilters as Filters, SessionStatus } from '../model/types'

const SEARCH_DEBOUNCE_MS = 300

export interface SessionFiltersHandle {
  /** Clears every filter, cancels any pending search commit, and focuses search. */
  clear: () => void
}

interface SessionFiltersProps {
  filters: Filters
  onChange: (next: Filters) => void
  /** Every "Clear filters" action on the page goes through this handle, because this
   * component owns the search debounce timer that a clear must cancel. */
  handleRef: Ref<SessionFiltersHandle>
}

export function SessionFilters({ filters, onChange, handleRef }: SessionFiltersProps) {
  const [draft, setDraft] = useState(filters.query)
  const [seenQuery, setSeenQuery] = useState(filters.query)
  const [committedQuery, setCommittedQuery] = useState(filters.query)
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const searchInput = useRef<HTMLInputElement>(null)

  // The URL query changed to something this input did not commit (e.g. "Clear
  // filters" elsewhere on the page): adopt it as the new draft.
  if (filters.query !== seenQuery) {
    setSeenQuery(filters.query)
    if (filters.query !== committedQuery) {
      setCommittedQuery(filters.query)
      setDraft(filters.query)
    }
  }

  useEffect(() => () => clearTimeout(timer.current), [])

  const commit = (next: Filters) => {
    clearTimeout(timer.current)
    setCommittedQuery(next.query.trim())
    onChange(next)
  }

  const handleSearchChange = (value: string) => {
    setDraft(value)
    clearTimeout(timer.current)
    timer.current = setTimeout(() => commit({ query: value, status: filters.status }), SEARCH_DEBOUNCE_MS)
  }

  const handleClear = () => {
    clearTimeout(timer.current)
    setDraft('')
    setCommittedQuery('')
    onChange(EMPTY_FILTERS)
    searchInput.current?.focus()
  }

  useImperativeHandle(handleRef, () => ({ clear: handleClear }))

  const showClear = hasActiveFilters(filters) || draft.trim() !== ''

  return (
    <form
      className="filters"
      role="search"
      aria-label="Filter sessions"
      onSubmit={(event) => {
        event.preventDefault()
        commit({ query: draft, status: filters.status })
      }}
    >
      <div className="filters__field filters__field--search">
        <label htmlFor="session-search">Search sessions</label>
        <input
          ref={searchInput}
          id="session-search"
          name="query"
          type="search"
          autoComplete="off"
          placeholder="Title, coach, or location…"
          value={draft}
          onChange={(event) => handleSearchChange(event.target.value)}
        />
      </div>
      <div className="filters__field">
        <label htmlFor="session-status">Status</label>
        <select
          id="session-status"
          name="status"
          value={filters.status}
          onChange={(event) => commit({ query: draft, status: event.target.value as SessionStatus | '' })}
        >
          <option value="">All statuses</option>
          {SESSION_STATUSES.map((status) => (
            <option key={status} value={status}>
              {STATUS_META[status].label}
            </option>
          ))}
        </select>
      </div>
      {showClear ? (
        <button type="button" className="button button--text filters__clear" onClick={handleClear}>
          Clear filters
        </button>
      ) : null}
    </form>
  )
}
