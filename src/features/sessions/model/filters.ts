import { isSessionStatus } from '../../../api/contract'
import type { SessionFilters } from './types'

export const EMPTY_FILTERS: SessionFilters = { query: '', status: '' }

// The URL is the single owner of filters. Invalid status values are ignored so a
// malformed link can never reach the API.
export function parseFilters(params: URLSearchParams): SessionFilters {
  const query = (params.get('query') ?? '').trim()
  const rawStatus = params.get('status') ?? ''
  return { query, status: isSessionStatus(rawStatus) ? rawStatus : '' }
}

// Writes only the filter keys and keeps every other parameter (e.g. `scenario`).
export function applyFilters(params: URLSearchParams, next: SessionFilters): URLSearchParams {
  const result = new URLSearchParams(params)
  const query = next.query.trim()
  if (query) result.set('query', query)
  else result.delete('query')
  if (next.status) result.set('status', next.status)
  else result.delete('status')
  return result
}

export function hasActiveFilters(filters: SessionFilters): boolean {
  return filters.query !== '' || filters.status !== ''
}
