import { Link } from 'react-router'
import type { ApiError } from '../../../api/errors'
import { STATUS_META } from '../model/status'
import type { SessionFilters } from '../model/types'
import { StateMessage } from '../ui/StateMessage'

const SKELETON_ROWS = 5

export function ListLoading() {
  return (
    // Announced through the workspace status region; this is the visual layer only.
    <div className="list-loading" aria-hidden="true">
      <p className="list-loading__text">Loading sessions…</p>
      {Array.from({ length: SKELETON_ROWS }, (_, index) => (
        <div key={index} className="skeleton-row" />
      ))}
    </div>
  )
}

export function NoSessions({ createSearch }: { createSearch: string }) {
  return (
    <StateMessage
      role="status"
      title="No sessions yet"
      actions={
        <Link className="button button--primary" to={{ pathname: '/sessions/new', search: createSearch }}>
          Create session
        </Link>
      }
    >
      <p>Create the first session to start planning.</p>
    </StateMessage>
  )
}

function describeFilters(filters: SessionFilters): string {
  const parts: string[] = []
  if (filters.query) parts.push(`Search “${filters.query}”`)
  if (filters.status) parts.push(`Status: ${STATUS_META[filters.status].label}`)
  return parts.join(' · ')
}

export function NoMatches({ filters, onClear }: { filters: SessionFilters; onClear: () => void }) {
  return (
    <StateMessage
      role="status"
      title="No sessions match your filters"
      actions={
        <button type="button" className="button button--secondary" onClick={onClear}>
          Clear filters
        </button>
      }
    >
      <p>{describeFilters(filters)}. Try a different search or status.</p>
    </StateMessage>
  )
}

interface ListErrorProps {
  error: ApiError
  onRetry: () => void
  onClear?: () => void
}

export function ListError({ error, onRetry, onClear }: ListErrorProps) {
  const isFilterError = error.code === 'INVALID_FILTER'
  return (
    <StateMessage
      role="alert"
      title={isFilterError ? "These filters can't be applied" : "Sessions couldn't be loaded"}
      actions={
        <>
          <button type="button" className="button button--primary" onClick={onRetry}>
            Try again
          </button>
          {onClear ? (
            <button type="button" className="button button--secondary" onClick={onClear}>
              Clear filters
            </button>
          ) : null}
        </>
      }
    >
      <p>{error.code === 'NETWORK_ERROR' ? "We couldn't reach the server. Check your connection, then try again." : error.message}</p>
    </StateMessage>
  )
}
