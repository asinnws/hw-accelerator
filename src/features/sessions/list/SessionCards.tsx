import { Link } from 'react-router'
import { formatShortStart } from '../../../shared/format'
import { placesLabel } from '../model/capacity'
import { TYPE_LABEL } from '../model/status'
import { StatusBadge } from '../ui/StatusBadge'
import type { SessionCollectionProps } from './SessionsTable'

// Mobile (<768px) scan-friendly representation of the same data as the table.
export function SessionCards({ sessions, search, selectedId, highlightedId }: SessionCollectionProps) {
  return (
    <ul className="session-cards">
      {sessions.map((session) => {
        const isSelected = session.id === selectedId
        return (
          <li key={session.id} className={isSelected ? 'session-card is-selected' : 'session-card'}>
            <div className="session-card__top">
              <Link
                id={`session-link-${session.id}`}
                className="row-link session-card__title"
                to={{ pathname: `/sessions/${session.id}`, search }}
                aria-current={isSelected ? 'true' : undefined}
              >
                {session.title}
              </Link>
              <StatusBadge status={session.status} />
            </div>
            {session.id === highlightedId ? <span className="tag">New</span> : null}
            <p className="session-card__line">
              <time dateTime={session.startsAt.toISOString()}>{formatShortStart(session.startsAt)}</time> ·{' '}
              {session.durationMinutes} min
            </p>
            <p className="session-card__line">{session.coach.name}</p>
            <p className="session-card__line">
              {TYPE_LABEL[session.type]} · {session.location.name}
            </p>
            <p className="session-card__line">
              <span className="num">
                {session.bookedCount} / {session.capacity} booked
              </span>{' '}
              · {placesLabel(session)}
            </p>
          </li>
        )
      })}
    </ul>
  )
}
