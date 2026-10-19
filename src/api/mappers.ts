import type { Coach, Session, SessionDetail, SessionsPage } from '../features/sessions/model/types'
import type { CoachSummary, SessionDetails, SessionsResponse, SessionSummary } from './contract'
import { ApiError } from './errors'

// Dates are parsed here and nowhere else; presentation receives Date objects.
function parseDate(iso: string, field: string): Date {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) {
    throw new ApiError(200, 'MALFORMED_RESPONSE', `The server returned an invalid ${field}.`)
  }
  return date
}

export function toCoach(dto: CoachSummary): Coach {
  return { id: dto.id, name: dto.name, email: dto.email }
}

export function toSession(dto: SessionSummary): Session {
  return {
    id: dto.id,
    title: dto.title,
    type: dto.type,
    status: dto.status,
    startsAt: parseDate(dto.startsAt, 'start time'),
    durationMinutes: dto.durationMinutes,
    capacity: dto.capacity,
    bookedCount: dto.bookedCount,
    visibility: dto.visibility,
    coach: toCoach(dto.coach),
    location: { name: dto.location.name, address: dto.location.address },
    updatedAt: parseDate(dto.updatedAt, 'update time'),
  }
}

export function toSessionDetail(dto: SessionDetails): SessionDetail {
  return {
    ...toSession(dto),
    description: dto.description,
    trainerNotes: dto.trainerNotes,
    createdAt: parseDate(dto.createdAt, 'creation time'),
    cancellation: dto.cancellation
      ? { reason: dto.cancellation.reason, cancelledAt: parseDate(dto.cancellation.cancelledAt, 'cancellation time') }
      : null,
  }
}

export function toSessionsPage(dto: SessionsResponse): SessionsPage {
  return {
    items: dto.data.map(toSession),
    total: dto.meta.total,
    page: dto.meta.page,
    pageSize: dto.meta.pageSize,
  }
}
