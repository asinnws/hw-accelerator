import { getSession } from '../../../api/sessions'
import { useRemoteResource } from '../../../shared/useRemoteResource'

export function useSessionDetails(sessionId: string) {
  return useRemoteResource(sessionId, (signal) => getSession(sessionId, signal))
}
