import type { Ref } from 'react'
import { Link } from 'react-router'

interface CreatedBannerProps {
  title: string
  sessionId: string
  /** `undefined` while the refreshed list is still loading. */
  isVisibleInList: boolean | undefined
  /** Focus is managed by the workspace (single-use, after create closes). */
  ref?: Ref<HTMLDivElement>
  search: string
  onClearFilters: () => void
  onDismiss: () => void
}

export function CreatedBanner({
  title,
  sessionId,
  isVisibleInList,
  ref,
  search,
  onClearFilters,
  onDismiss,
}: CreatedBannerProps) {
  const sessionLink = { pathname: `/sessions/${sessionId}`, search }

  return (
    <div ref={ref} className="banner banner--success" role="status" tabIndex={-1}>
      <p className="banner__text">
        <span aria-hidden="true">✓ </span>
        {isVisibleInList === false
          ? `“${title}” was created, but the current filters hide it.`
          : `“${title}” was created.`}
      </p>
      <div className="banner__actions">
        {isVisibleInList === false ? (
          <>
            <Link className="button button--secondary" to={sessionLink}>
              Open session
            </Link>
            <button type="button" className="button button--secondary" onClick={onClearFilters}>
              Clear filters
            </button>
          </>
        ) : (
          <Link className="button button--secondary" to={sessionLink}>
            View session
          </Link>
        )}
        <button type="button" className="button button--text" onClick={onDismiss}>
          Dismiss
        </button>
      </div>
    </div>
  )
}
