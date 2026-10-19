import { STATUS_META } from '../model/status'
import type { SessionStatus } from '../model/types'

export function StatusBadge({ status }: { status: SessionStatus }) {
  const meta = STATUS_META[status]
  return (
    <span className={`status-badge status-badge--${status}`}>
      <span aria-hidden="true" className="status-badge__symbol">
        {meta.symbol}
      </span>
      {meta.label}
    </span>
  )
}
