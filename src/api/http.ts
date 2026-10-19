import type { ApiErrorBody } from './contract'
import { ApiError, isAbortError } from './errors'

type QueryValue = string | undefined

interface RequestOptions {
  method?: 'GET' | 'POST'
  query?: Record<string, QueryValue>
  body?: unknown
  signal?: AbortSignal
}

const API_BASE = '/api'

function buildUrl(path: string, query?: Record<string, QueryValue>): string {
  // Resolve against the page origin so requests are absolute in every runtime.
  const url = new URL(`${API_BASE}${path}`, window.location.origin)
  for (const [key, value] of Object.entries(query ?? {})) {
    if (value) url.searchParams.set(key, value)
  }
  return url.toString()
}

function isApiErrorBody(value: unknown): value is ApiErrorBody {
  if (typeof value !== 'object' || value === null || !('error' in value)) return false
  const error = (value as { error: unknown }).error
  return (
    typeof error === 'object' &&
    error !== null &&
    typeof (error as { code?: unknown }).code === 'string' &&
    typeof (error as { message?: unknown }).message === 'string'
  )
}

async function readJson(response: Response): Promise<unknown> {
  try {
    return await response.json()
  } catch {
    return undefined
  }
}

// The only fetch call site in the application. Every failure becomes an ApiError;
// AbortError is re-thrown untouched so callers can ignore cancelled requests.
export async function request<T>(path: string, { method = 'GET', query, body, signal }: RequestOptions = {}): Promise<T> {
  let response: Response
  try {
    response = await fetch(buildUrl(path, query), {
      method,
      signal,
      headers: body === undefined ? { Accept: 'application/json' } : { Accept: 'application/json', 'Content-Type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body),
    })
  } catch (error) {
    if (isAbortError(error)) throw error
    throw new ApiError(0, 'NETWORK_ERROR', 'The server could not be reached.')
  }

  const payload = await readJson(response)

  if (!response.ok) {
    if (isApiErrorBody(payload)) {
      const { code, message, fieldErrors } = payload.error
      throw new ApiError(response.status, code, message, fieldErrors)
    }
    throw new ApiError(response.status, 'HTTP_ERROR', `The request failed with status ${response.status}.`)
  }

  if (payload === undefined) {
    throw new ApiError(response.status, 'MALFORMED_RESPONSE', 'The server returned an unreadable response.')
  }
  return payload as T
}
