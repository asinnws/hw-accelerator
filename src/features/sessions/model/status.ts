import type { SessionStatus, SessionType, Visibility } from './types'

// Every status carries a text label and a symbol so it never relies on color alone.
export const STATUS_META: Record<SessionStatus, { label: string; symbol: string }> = {
  scheduled: { label: 'Scheduled', symbol: '◷' },
  full: { label: 'Full', symbol: '●' },
  cancelled: { label: 'Cancelled', symbol: '✕' },
  completed: { label: 'Completed', symbol: '✓' },
}

export const TYPE_LABEL: Record<SessionType, string> = {
  training: 'Training',
  camp: 'Camp',
  private: 'Private',
}

export const VISIBILITY_LABEL: Record<Visibility, string> = {
  public: 'Public',
  'invite-only': 'Invite-only',
}
