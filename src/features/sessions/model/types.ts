import type { SessionStatus, SessionType, Visibility } from '../../../api/contract'

export type { SessionStatus, SessionType, Visibility }

export interface Coach {
  id: string
  name: string
  email: string
}

export interface Session {
  id: string
  title: string
  type: SessionType
  status: SessionStatus
  startsAt: Date
  durationMinutes: number
  capacity: number
  bookedCount: number
  visibility: Visibility
  coach: Coach
  location: { name: string; address: string }
  updatedAt: Date
}

export interface SessionDetail extends Session {
  description: string | null
  trainerNotes: string | null
  createdAt: Date
  cancellation: { reason: string | null; cancelledAt: Date } | null
}

export interface SessionsPage {
  items: Session[]
  total: number
  page: number
  pageSize: number
}

export interface SessionFilters {
  query: string
  status: SessionStatus | ''
}
