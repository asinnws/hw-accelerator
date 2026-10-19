import type { Coach } from '../features/sessions/model/types'
import type { CoachesResponse } from './contract'
import { request } from './http'
import { toCoach } from './mappers'

export async function listCoaches(signal?: AbortSignal): Promise<Coach[]> {
  const response = await request<CoachesResponse>('/coaches', { signal })
  return response.data.map(toCoach)
}
