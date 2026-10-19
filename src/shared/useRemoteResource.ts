import { useCallback, useEffect, useEffectEvent, useState } from 'react'
import { ApiError, isAbortError, isApiError } from '../api/errors'

export type RemoteResource<T> =
  | { status: 'loading'; data: undefined; error: undefined; isRefreshing: false; retry: () => void }
  | { status: 'success'; data: T; error: undefined; isRefreshing: boolean; retry: () => void }
  | { status: 'error'; data: undefined; error: ApiError; isRefreshing: false; retry: () => void }

type Settled<T> =
  | { requestKey: string; status: 'success'; data: T }
  | { requestKey: string; status: 'error'; error: ApiError }

function toApiError(error: unknown): ApiError {
  if (isApiError(error)) return error
  return new ApiError(0, 'MALFORMED_RESPONSE', 'The response could not be processed.')
}

/**
 * Loads remote data for `key`. A new key or `retry()` aborts the previous request;
 * responses for stale keys are ignored. Previous data stays visible while a
 * refetch is in flight (`isRefreshing`).
 */
export function useRemoteResource<T>(key: string, load: (signal: AbortSignal) => Promise<T>): RemoteResource<T> {
  const [attempt, setAttempt] = useState(0)
  const [settled, setSettled] = useState<Settled<T> | null>(null)
  const requestKey = `${key}#${attempt}`
  const runLoad = useEffectEvent((signal: AbortSignal) => load(signal))

  useEffect(() => {
    const controller = new AbortController()
    runLoad(controller.signal).then(
      (data) => {
        if (!controller.signal.aborted) setSettled({ requestKey, status: 'success', data })
      },
      (error: unknown) => {
        if (controller.signal.aborted || isAbortError(error)) return
        setSettled({ requestKey, status: 'error', error: toApiError(error) })
      },
    )
    return () => controller.abort()
  }, [requestKey])

  const retry = useCallback(() => setAttempt((value) => value + 1), [])
  const isPending = settled?.requestKey !== requestKey

  if (settled?.status === 'success') {
    return { status: 'success', data: settled.data, error: undefined, isRefreshing: isPending, retry }
  }
  if (settled?.status === 'error' && !isPending) {
    return { status: 'error', data: undefined, error: settled.error, isRefreshing: false, retry }
  }
  return { status: 'loading', data: undefined, error: undefined, isRefreshing: false, retry }
}
