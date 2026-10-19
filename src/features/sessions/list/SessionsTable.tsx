import { Link } from 'react-router'
import { formatShortStart } from '../../../shared/format'
import { placesLabel } from '../model/capacity'
import { TYPE_LABEL } from '../model/status'
import type { Session } from '../model/types'
import { StatusBadge } from '../ui/StatusBadge'

export interface SessionCollectionProps {
  sessions: Session[]
  search: string
  selectedId: string | undefined
  highlightedId: string | undefined
}

export function SessionsTable({ sessions, search, selectedId, highlightedId }: SessionCollectionProps) {
  return (
    <table className="sessions-table">
      <caption className="visually-hidden">Sessions with start, coach, capacity, and status</caption>
      <thead>
        <tr>
          <th scope="col">Session</th>
          <th scope="col">Start</th>
          <th scope="col">Coach</th>
          <th scope="col">Capacity</th>
          <th scope="col">Status</th>
        </tr>
      </thead>
      <tbody>
        {sessions.map((session) => {
          const isSelected = session.id === selectedId
          return (
            <tr key={session.id} className={isSelected ? 'is-selected' : undefined}>
              <td>
                <Link
                  id={`session-link-${session.id}`}
                  className="row-link"
                  to={{ pathname: `/sessions/${session.id}`, search }}
                  aria-current={isSelected ? 'true' : undefined}
                >
                  {session.title}
                </Link>
                {session.id === highlightedId ? <span className="tag">New</span> : null}
                <div className="cell-sub">
                  {TYPE_LABEL[session.type]} · {session.location.name}
                </div>
              </td>
              <td>
                <time dateTime={session.startsAt.toISOString()}>{formatShortStart(session.startsAt)}</time>
                <div className="cell-sub">{session.durationMinutes} minutes</div>
              </td>
              <td>{session.coach.name}</td>
              <td>
                <span className="num">
                  {session.bookedCount} / {session.capacity}
                </span>
                <div className="cell-sub">{placesLabel(session)}</div>
              </td>
              <td>
                <StatusBadge status={session.status} />
              </td>
            </tr>
          )
        })}
      </tbody>
    </table>
  )
}
