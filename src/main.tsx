import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import './features/sessions/sessions.css'
import { App } from './app/App'
import { MockStartupAlert } from './app/MockStartupAlert'

// MSW serves the API contract unless explicitly disabled (VITE_API_MOCKING=off),
// e.g. when a real backend is available on the same origin.
async function enableMocking() {
  if (import.meta.env.VITE_API_MOCKING === 'off') return
  const { startMockWorker } = await import('./mocks/browser')
  await startMockWorker()
}

function render(mockFailure: string | null) {
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      {mockFailure !== null ? <MockStartupAlert reason={mockFailure} /> : null}
      <App />
    </StrictMode>,
  )
}

enableMocking().then(
  () => render(null),
  (error: unknown) => {
    console.error('[mocks] The mock API failed to start.', error)
    render(error instanceof Error ? error.message : String(error))
  },
)
