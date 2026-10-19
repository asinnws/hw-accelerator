import { delay, http, HttpResponse } from 'msw'
import { isSessionStatus, type ApiErrorBody } from '../api/contract'
import type { MockDb } from './db'
import { scenarioErrors, unknownSessionError, type ScenarioErrorResponse } from './fixtures'
import type { ScenarioName } from './scenarios'

interface HandlerOptions {
  db: MockDb
  scenario: ScenarioName
  latencyMs: number
}

function errorResponse(status: number, code: string, message: string, fieldErrors?: Record<string, string>) {
  const body: ApiErrorBody = { error: fieldErrors ? { code, message, fieldErrors } : { code, message } }
  return HttpResponse.json(body, { status })
}

function scenarioResponse({ status, body }: ScenarioErrorResponse) {
  return HttpResponse.json(body, { status })
}

export function createHandlers({ db, scenario, latencyMs }: HandlerOptions) {
  const wait = () => (latencyMs > 0 ? delay(latencyMs) : Promise.resolve())

  return [
    http.get('/api/sessions', async ({ request }) => {
      await wait()
      if (scenario === 'list-error') return scenarioResponse(scenarioErrors['list-error'])

      const params = new URL(request.url).searchParams
      const status = params.get('status') ?? ''
      if (status && !isSessionStatus(status)) {
        return errorResponse(400, 'INVALID_FILTER', `Unsupported status "${status}".`)
      }
      return HttpResponse.json(db.list({ query: params.get('query') ?? '', status }))
    }),

    http.get('/api/sessions/:sessionId', async ({ params }) => {
      await wait()
      const sessionId = String(params.sessionId)
      const detailsError = scenarioErrors['details-error']
      if (scenario === 'details-error' && sessionId === detailsError.targetSessionId) {
        return scenarioResponse(detailsError)
      }
      const session = db.get(sessionId)
      if (!session) return HttpResponse.json(unknownSessionError, { status: 404 })
      return HttpResponse.json(session)
    }),

    http.get('/api/coaches', async () => {
      await wait()
      if (scenario === 'coaches-error') return scenarioResponse(scenarioErrors['coaches-error'])
      return HttpResponse.json({ data: db.coaches() })
    }),

    http.post('/api/sessions', async ({ request }) => {
      await wait()
      if (scenario === 'create-error') return scenarioResponse(scenarioErrors['create-error'])

      let body: unknown
      try {
        body = await request.json()
      } catch {
        return errorResponse(400, 'VALIDATION_FAILED', 'The request body must be valid JSON.')
      }
      const result = db.create(body)
      if (!result.ok) {
        return errorResponse(400, 'VALIDATION_FAILED', 'Some fields are invalid.', result.fieldErrors)
      }
      return HttpResponse.json(result.session, { status: 201 })
    }),
  ]
}
