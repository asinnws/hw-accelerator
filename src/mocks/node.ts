import { setupServer } from 'msw/node'
import { createMockDb } from './db'
import { createHandlers } from './handlers'
import type { ScenarioName } from './scenarios'

export function createTestServer({ scenario = 'normal', now }: { scenario?: ScenarioName; now: Date }) {
  const db = createMockDb({ now, seed: scenario === 'empty' ? 'empty' : 'fixtures' })
  const server = setupServer(...createHandlers({ db, scenario, latencyMs: 0 }))
  return { server, db }
}
