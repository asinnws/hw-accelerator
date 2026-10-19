import {
  isSessionType,
  isVisibility,
  type CoachSummary,
  type SessionDetails,
  type SessionSummary,
  type SessionsResponse,
} from '../api/contract'
import { fixtureOffsetMs, rebaseSessionDetails } from './clock'
import { seedCoaches, seedSessions } from './fixtures'

export type MockSeed = 'fixtures' | 'empty'

export type CreateResult =
  | { ok: true; session: SessionDetails }
  | { ok: false; fieldErrors: Record<string, string> }

export interface MockDb {
  list(filters: { query: string; status: string }): SessionsResponse
  get(id: string): SessionDetails | undefined
  create(body: unknown): CreateResult
  coaches(): CoachSummary[]
}

const PAGE = 1
const PAGE_SIZE = 10
const FIRST_CREATED_ID = 1001

function toSummary(record: SessionDetails): SessionSummary {
  return {
    id: record.id,
    title: record.title,
    type: record.type,
    status: record.status,
    startsAt: record.startsAt,
    durationMinutes: record.durationMinutes,
    capacity: record.capacity,
    bookedCount: record.bookedCount,
    visibility: record.visibility,
    coach: record.coach,
    location: record.location,
    updatedAt: record.updatedAt,
  }
}

function matchesQuery(record: SessionDetails, query: string): boolean {
  const needle = query.trim().toLocaleLowerCase()
  if (!needle) return true
  return [record.title, record.coach.name, record.location.name, record.location.address].some(
    (value) => value.toLocaleLowerCase().includes(needle),
  )
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function requiredText(body: Record<string, unknown>, key: string, errors: Record<string, string>): string {
  const value = body[key]
  const text = typeof value === 'string' ? value.trim() : ''
  if (!text) errors[key] = 'This field is required.'
  return text
}

function optionalText(body: Record<string, unknown>, key: string, errors: Record<string, string>): string | null {
  const value = body[key]
  if (value === undefined || value === null) return null
  if (typeof value !== 'string') {
    errors[key] = 'Must be text.'
    return null
  }
  return value.trim() || null
}

function positiveInteger(body: Record<string, unknown>, key: string, errors: Record<string, string>): number {
  const value = body[key]
  if (typeof value !== 'number' || !Number.isInteger(value) || value <= 0) {
    errors[key] = 'Must be a positive whole number.'
    return 0
  }
  return value
}

const ISO_INSTANT = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2}(\.\d+)?)?(Z|[+-]\d{2}:\d{2})$/

export function createMockDb({ now, seed }: { now: Date; seed: MockSeed }): MockDb {
  const offset = fixtureOffsetMs(now)
  const records: SessionDetails[] =
    seed === 'fixtures' ? seedSessions.map((record) => rebaseSessionDetails(record, offset)) : []
  const coaches = [...seedCoaches]
  let nextId = FIRST_CREATED_ID

  return {
    list({ query, status }) {
      const data = records
        .filter((record) => matchesQuery(record, query) && (!status || record.status === status))
        .map(toSummary)
      return { data, meta: { page: PAGE, pageSize: PAGE_SIZE, total: data.length } }
    },

    get(id) {
      return records.find((record) => record.id === id)
    },

    create(body) {
      if (!isRecord(body)) return { ok: false, fieldErrors: { request: 'Request body must be an object.' } }
      const errors: Record<string, string> = {}

      const title = requiredText(body, 'title', errors)
      const locationName = requiredText(body, 'locationName', errors)
      const locationAddress = requiredText(body, 'locationAddress', errors)
      const description = optionalText(body, 'description', errors)
      const trainerNotes = optionalText(body, 'trainerNotes', errors)
      const durationMinutes = positiveInteger(body, 'durationMinutes', errors)
      const capacity = positiveInteger(body, 'capacity', errors)

      const type = typeof body.type === 'string' && isSessionType(body.type) ? body.type : null
      if (!type) errors.type = 'Choose a supported session type.'
      const visibility = typeof body.visibility === 'string' && isVisibility(body.visibility) ? body.visibility : null
      if (!visibility) errors.visibility = 'Choose a supported visibility.'

      const startsAt = typeof body.startsAt === 'string' ? body.startsAt : ''
      if (!ISO_INSTANT.test(startsAt) || Number.isNaN(Date.parse(startsAt))) {
        errors.startsAt = 'Must be a valid ISO 8601 date and time.'
      }

      const coach = coaches.find((candidate) => candidate.id === body.coachId)
      if (!coach) errors.coachId = 'Choose an existing coach.'

      if (Object.keys(errors).length > 0 || !type || !visibility || !coach) {
        return { ok: false, fieldErrors: errors }
      }

      const timestamp = new Date().toISOString()
      const session: SessionDetails = {
        id: `ses_${nextId++}`,
        title,
        type,
        status: 'scheduled',
        startsAt: new Date(startsAt).toISOString(),
        durationMinutes,
        capacity,
        bookedCount: 0,
        visibility,
        coach: { ...coach },
        location: { name: locationName, address: locationAddress },
        updatedAt: timestamp,
        description,
        trainerNotes,
        createdAt: timestamp,
        cancellation: null,
      }
      records.push(session)
      return { ok: true, session }
    },

    coaches() {
      return [...coaches]
    },
  }
}
