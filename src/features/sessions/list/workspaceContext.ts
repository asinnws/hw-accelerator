import { useOutletContext } from 'react-router'
import type { SessionDetail } from '../model/types'

// The only channel between the workspace layout and its child routes.
export interface WorkspaceOutletContext {
  /** Current `location.search` (filters plus any non-filter params) to return to. */
  filtersSearch: string
  onCreated: (session: SessionDetail) => void
}

export function useWorkspace(): WorkspaceOutletContext {
  return useOutletContext<WorkspaceOutletContext>()
}
