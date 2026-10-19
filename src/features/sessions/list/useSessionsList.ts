import { listSessions } from '../../../api/sessions'
import { useRemoteResource } from '../../../shared/useRemoteResource'
import type { SessionFilters } from '../model/types'

// Single owner of the sessions list. `retry` doubles as an explicit refresh.
// Each result carries the filters that produced it, so headings and the
// empty/no-match states describe the rows on screen, not a pending request.
export function useSessionsList(filters: SessionFilters) {
  return useRemoteResource(`${filters.query}|${filters.status}`, async (signal) => ({
    filters,
    page: await listSessions(filters, signal),
  }))
}
