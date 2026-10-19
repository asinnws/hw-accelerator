import type { Session } from './types'

export function remainingPlaces(session: Pick<Session, 'capacity' | 'bookedCount'>): number {
  return Math.max(session.capacity - session.bookedCount, 0)
}

export function placesLabel(session: Pick<Session, 'capacity' | 'bookedCount'>): string {
  const remaining = remainingPlaces(session)
  return remaining > 0 ? `${remaining} left` : 'Full'
}

export function endsAt(session: Pick<Session, 'startsAt' | 'durationMinutes'>): Date {
  return new Date(session.startsAt.getTime() + session.durationMinutes * 60_000)
}
