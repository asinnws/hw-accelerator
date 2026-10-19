import { formatFullStartRange, formatTimestamp } from '../../../shared/format'
import { endsAt, remainingPlaces } from '../model/capacity'
import { TYPE_LABEL, VISIBILITY_LABEL } from '../model/status'
import type { SessionDetail } from '../model/types'

function OptionalText({ value }: { value: string | null }) {
  return value ? <p className="prose">{value}</p> : <p className="muted">None provided</p>
}

export function SessionDetailsView({ session }: { session: SessionDetail }) {
  const remaining = remainingPlaces(session)
  const fillPercent = session.capacity > 0 ? Math.min((session.bookedCount / session.capacity) * 100, 100) : 0

  return (
    <div className="details">
      <dl className="details__list">
        <div>
          <dt>Start</dt>
          <dd>
            <time dateTime={session.startsAt.toISOString()}>
              {formatFullStartRange(session.startsAt, endsAt(session))}
            </time>
          </dd>
        </div>
        <div>
          <dt>Duration</dt>
          <dd>{session.durationMinutes} minutes</dd>
        </div>
        <div>
          <dt>Type</dt>
          <dd>{TYPE_LABEL[session.type]}</dd>
        </div>
        <div>
          <dt>Visibility</dt>
          <dd>{VISIBILITY_LABEL[session.visibility]}</dd>
        </div>
        <div>
          <dt>Location</dt>
          <dd>
            {session.location.name}
            <span className="details__secondary">{session.location.address}</span>
          </dd>
        </div>
        <div>
          <dt>Coach</dt>
          <dd>
            {session.coach.name}
            <a className="details__secondary" href={`mailto:${session.coach.email}`}>
              {session.coach.email}
            </a>
          </dd>
        </div>
        <div>
          <dt>Capacity</dt>
          <dd>
            <span className="num">
              {session.bookedCount} booked of {session.capacity} places
            </span>{' '}
            · {remaining > 0 ? `${remaining} left` : 'Full'}
            <span className="capacity-bar" aria-hidden="true">
              <span
                className={remaining > 0 ? 'capacity-bar__fill' : 'capacity-bar__fill capacity-bar__fill--full'}
                style={{ width: `${fillPercent}%` }}
              />
            </span>
          </dd>
        </div>
      </dl>

      <section className="details__section" aria-labelledby="details-description">
        <h3 id="details-description">Description</h3>
        <OptionalText value={session.description} />
      </section>

      <section className="details__section" aria-labelledby="details-notes">
        <h3 id="details-notes">Trainer notes</h3>
        <OptionalText value={session.trainerNotes} />
      </section>

      {session.cancellation ? (
        <section className="details__section" aria-labelledby="details-cancellation">
          <h3 id="details-cancellation">Cancellation</h3>
          <p className="prose">{session.cancellation.reason ?? 'No reason given'}</p>
          <p className="muted">
            Cancelled{' '}
            <time dateTime={session.cancellation.cancelledAt.toISOString()}>
              {formatTimestamp(session.cancellation.cancelledAt)}
            </time>
          </p>
        </section>
      ) : null}

      <dl className="details__meta">
        <div>
          <dt>Created</dt>
          <dd>
            <time dateTime={session.createdAt.toISOString()}>{formatTimestamp(session.createdAt)}</time>
          </dd>
        </div>
        <div>
          <dt>Last updated</dt>
          <dd>
            <time dateTime={session.updatedAt.toISOString()}>{formatTimestamp(session.updatedAt)}</time>
          </dd>
        </div>
      </dl>
    </div>
  )
}
