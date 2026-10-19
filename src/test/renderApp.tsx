import { render } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { RequestHandler } from 'msw'
import type { SetupServer } from 'msw/node'
import { MemoryRouter } from 'react-router'
import { afterEach } from 'vitest'
import { AppRoutes } from '../app/AppRoutes'
import { createHandlers } from '../mocks/handlers'
import { createTestServer } from '../mocks/node'
import type { ScenarioName } from '../mocks/scenarios'
import { FIXED_NOW } from './clock'

const activeServers: SetupServer[] = []

afterEach(() => {
  for (const server of activeServers.splice(0)) server.close()
})

interface RenderAppOptions {
  path?: string
  scenario?: ScenarioName
  /** Extra handlers placed in front of the scenario handlers before rendering. */
  handlers?: RequestHandler[]
}

/** Renders the real routes against the MSW contract mock with a frozen fixture clock. */
export function renderApp({ path = '/sessions', scenario = 'normal', handlers = [] }: RenderAppOptions = {}) {
  const { server, db } = createTestServer({ scenario, now: FIXED_NOW })
  server.listen({ onUnhandledRequest: 'error' })
  if (handlers.length > 0) server.use(...handlers)
  activeServers.push(server)

  const user = userEvent.setup()
  const view = render(
    <MemoryRouter initialEntries={[path]}>
      <AppRoutes />
    </MemoryRouter>,
  )

  /** Swaps the mock to another scenario while keeping the same in-memory data. */
  const switchScenario = (next: ScenarioName) => {
    server.resetHandlers(...createHandlers({ db, scenario: next, latencyMs: 0 }))
  }

  return { ...view, user, server, db, switchScenario }
}
