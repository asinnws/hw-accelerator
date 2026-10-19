// Wire types from frontend-accelerator-assessment/API_CONTRACT.md.
// Shared by the API client and the mock boundary; do not change shapes here.

export const SESSION_TYPES = ['training', 'camp', 'private'] as const
export const SESSION_STATUSES = ['scheduled', 'full', 'cancelled', 'completed'] as const
export const VISIBILITIES = ['public', 'invite-only'] as const

export type SessionType = (typeof SESSION_TYPES)[number]
export type SessionStatus = (typeof SESSION_STATUSES)[number]
export type Visibility = (typeof VISIBILITIES)[number]

export interface CoachSummary {
  id: string
  name: string
  email: string
}

export interface LocationSummary {
  name: string
  address: string
}

export interface SessionSummary {
  id: string
  title: string
  type: SessionType
  status: SessionStatus
  startsAt: string
  durationMinutes: number
  capacity: number
  bookedCount: number
  visibility: Visibility
  coach: CoachSummary
  location: LocationSummary
  updatedAt: string
}

export interface SessionDetails extends SessionSummary {
  description: string | null
  trainerNotes: string | null
  createdAt: string
  cancellation: null | {
    reason: string | null
    cancelledAt: string
  }
}

export interface SessionsResponse {
  data: SessionSummary[]
  meta: {
    page: number
    pageSize: number
    total: number
  }
}

export interface CoachesResponse {
  data: CoachSummary[]
}

export interface CreateSessionRequest {
  title: string
  type: SessionType
  startsAt: string
  durationMinutes: number
  coachId: string
  locationName: string
  locationAddress: string
  capacity: number
  visibility: Visibility
  description?: string | null
  trainerNotes?: string | null
}

export interface ApiErrorBody {
  error: {
    code: string
    message: string
    fieldErrors?: Record<string, string>
  }
}

export function isSessionStatus(value: string): value is SessionStatus {
  return (SESSION_STATUSES as readonly string[]).includes(value)
}

export function isSessionType(value: string): value is SessionType {
  return (SESSION_TYPES as readonly string[]).includes(value)
}

export function isVisibility(value: string): value is Visibility {
  return (VISIBILITIES as readonly string[]).includes(value)
}
