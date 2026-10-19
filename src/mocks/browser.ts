import { setupWorker } from 'msw/browser'
import { createMockDb } from './db'
import { normalLatencyMs } from './fixtures'
import { createHandlers } from './handlers'
import { resolveScenario } from './scenarios'

export async function startMockWorker(): Promise<void> {
  const scenario = resolveScenario(window.location.search)
  const db = createMockDb({ now: new Date(), seed: scenario === 'empty' ? 'empty' : 'fixtures' })
  const worker = setupWorker(...createHandlers({ db, scenario, latencyMs: normalLatencyMs }))
  await worker.start({ onUnhandledRequest: 'bypass', quiet: true })
  console.info(`[mocks] MSW active with scenario "${scenario}".`)
}
