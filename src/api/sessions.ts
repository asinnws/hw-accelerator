import type { SessionDetail, SessionFilters, SessionsPage } from '../features/sessions/model/types'
import type { CreateSessionRequest, SessionDetails, SessionsResponse } from './contract'
import { request } from './http'
import { toSessionDetail, toSessionsPage } from './mappers'

export async function listSessions(filters: SessionFilters, signal?: AbortSignal): Promise<SessionsPage> {
  const response = await request<SessionsResponse>('/sessions', {
    query: { query: filters.query, status: filters.status },
    signal,
  })
  return toSessionsPage(response)
}

export async function getSession(sessionId: string, signal?: AbortSignal): Promise<SessionDetail> {
  const response = await request<SessionDetails>(`/sessions/${encodeURIComponent(sessionId)}`, { signal })
  return toSessionDetail(response)
}

export async function createSession(body: CreateSessionRequest): Promise<SessionDetail> {
  const response = await request<SessionDetails>('/sessions', { method: 'POST', body })
  return toSessionDetail(response)
}
