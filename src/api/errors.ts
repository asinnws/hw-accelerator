export type ApiErrorCode =
  | 'INVALID_FILTER'
  | 'SESSIONS_UNAVAILABLE'
  | 'SESSION_NOT_FOUND'
  | 'SESSION_DETAILS_UNAVAILABLE'
  | 'COACHES_UNAVAILABLE'
  | 'VALIDATION_FAILED'
  | 'CREATE_SESSION_FAILED'
  // Client-only codes for failures that never reached a contract error body.
  | 'NETWORK_ERROR'
  | 'HTTP_ERROR'
  | 'MALFORMED_RESPONSE'
  // A contract-shaped error with a code this client does not know yet.
  | (string & {})

export class ApiError extends Error {
  readonly status: number
  readonly code: ApiErrorCode
  readonly fieldErrors?: Record<string, string>

  constructor(status: number, code: ApiErrorCode, message: string, fieldErrors?: Record<string, string>) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.code = code
    this.fieldErrors = fieldErrors
  }
}

export function isApiError(value: unknown): value is ApiError {
  return value instanceof ApiError
}

export function isAbortError(value: unknown): boolean {
  // Checked by name: DOMException identity differs between runtimes (browser, Node, jsdom).
  return typeof value === 'object' && value !== null && (value as { name?: unknown }).name === 'AbortError'
}
