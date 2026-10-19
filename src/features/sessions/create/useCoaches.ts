import { listCoaches } from '../../../api/coaches'
import { useRemoteResource } from '../../../shared/useRemoteResource'

export function useCoaches() {
  return useRemoteResource('coaches', (signal) => listCoaches(signal))
}
