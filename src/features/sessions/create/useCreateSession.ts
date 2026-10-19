import { useCallback, useRef, useState } from 'react'
import type { CreateSessionRequest } from '../../../api/contract'
import { ApiError, isApiError } from '../../../api/errors'
import { createSession } from '../../../api/sessions'
import type { SessionDetail } from '../model/types'

export type CreateResult = { ok: true; session: SessionDetail } | { ok: false; error: ApiError } | { ok: false; error: null }

/**
 * Create mutation. A synchronous guard blocks duplicate submissions even before
 * the pending state renders. After a success the guard stays locked: the form is
 * closing, and a late second click must not create a duplicate session.
 * Requests are not aborted on unmount: the server may already have created it.
 */
export function useCreateSession() {
  const [isPending, setIsPending] = useState(false)
  const locked = useRef(false)

  const submit = useCallback(async (request: CreateSessionRequest): Promise<CreateResult> => {
    if (locked.current) return { ok: false, error: null }
    locked.current = true
    setIsPending(true)
    try {
      return { ok: true, session: await createSession(request) }
    } catch (error) {
      locked.current = false
      setIsPending(false)
      return {
        ok: false,
        error: isApiError(error) ? error : new ApiError(0, 'MALFORMED_RESPONSE', 'The response could not be processed.'),
      }
    }
  }, [])

  return { isPending, submit }
}
