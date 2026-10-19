import type { SessionDetails } from '../api/contract'
import { fixtureReferenceNow } from './fixtures'

// Fixture timestamps are anchored to `referenceNow`. Shifting them by
// `now - referenceNow` keeps relative ordering while keeping data fresh.
export function fixtureOffsetMs(now: Date): number {
  return now.getTime() - Date.parse(fixtureReferenceNow)
}

export function rebaseIso(iso: string, offsetMs: number): string {
  return new Date(Date.parse(iso) + offsetMs).toISOString()
}

export function rebaseSessionDetails(record: SessionDetails, offsetMs: number): SessionDetails {
  return {
    ...record,
    startsAt: rebaseIso(record.startsAt, offsetMs),
    createdAt: rebaseIso(record.createdAt, offsetMs),
    updatedAt: rebaseIso(record.updatedAt, offsetMs),
    cancellation: record.cancellation
      ? { ...record.cancellation, cancelledAt: rebaseIso(record.cancellation.cancelledAt, offsetMs) }
      : null,
  }
}
