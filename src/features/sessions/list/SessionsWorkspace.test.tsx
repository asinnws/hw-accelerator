import { cleanup, screen, within } from '@testing-library/react'
import { delay, http } from 'msw'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { freezeClock, restoreClock } from '../../../test/clock'
import { renderApp } from '../../../test/renderApp'

function rowTitles(): string[] {
  return within(screen.getByRole('table'))
    .getAllByRole('link')
    .map((link) => link.textContent ?? '')
}

describe('Sessions workspace', () => {
  beforeEach(freezeClock)
  afterEach(restoreClock)

  it('announces initial loading, then shows the sessions', async () => {
    renderApp({
      // Falls through to the scenario handler after the delay.
      handlers: [http.get('/api/sessions', () => delay(150))],
    })

    expect(await screen.findByText('Loading sessions…', { selector: '[role="status"]' })).toBeInTheDocument()
    expect(screen.queryByRole('table')).not.toBeInTheDocument()

    expect(await screen.findByRole('link', { name: 'U14 Shooting Lab' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 2, name: '5 sessions' })).toBeInTheDocument()
  })

  it('searches by coach and filters by one status through the API, then clears filters', async () => {
    const { user } = renderApp()
    await screen.findByRole('link', { name: 'U14 Shooting Lab' })

    await user.type(screen.getByLabelText('Search sessions'), 'maya')
    expect(await screen.findByRole('heading', { level: 2, name: '2 sessions match' })).toBeInTheDocument()
    expect(rowTitles()).toEqual(['U14 Shooting Lab', 'Private Footwork Review'])

    await user.click(screen.getByRole('button', { name: 'Clear filters' }))
    expect(await screen.findByRole('heading', { level: 2, name: '5 sessions' })).toBeInTheDocument()
    expect(screen.getByLabelText('Search sessions')).toHaveValue('')

    await user.selectOptions(screen.getByLabelText('Status'), 'cancelled')
    expect(await screen.findByRole('heading', { level: 2, name: '1 session matches' })).toBeInTheDocument()
    expect(rowTitles()).toEqual(['Weekend Ball Handling'])
    expect(within(screen.getByRole('table')).getByText('Cancelled')).toBeInTheDocument()
  })

  it('distinguishes "no sessions exist" from "filters produce no matches"', async () => {
    const empty = renderApp({ scenario: 'empty' })
    expect(await screen.findByRole('heading', { name: 'No sessions yet' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Clear filters' })).not.toBeInTheDocument()
    empty.server.close()
    cleanup()

    const { user } = renderApp({ path: '/sessions?query=zzz' })
    expect(await screen.findByRole('heading', { name: 'No sessions match your filters' })).toBeInTheDocument()
    expect(screen.queryByText('No sessions yet')).not.toBeInTheDocument()

    const noMatches = screen.getByRole('heading', { name: 'No sessions match your filters' }).parentElement!
    await user.click(within(noMatches).getByRole('button', { name: 'Clear filters' }))
    expect(await screen.findByRole('link', { name: 'U14 Shooting Lab' })).toBeInTheDocument()
  })

  it('never shows "No sessions yet" while clearing a no-match search refetches (review R1)', async () => {
    const { user, server } = renderApp({ path: '/sessions?query=zzz' })
    const noMatchesHeading = await screen.findByRole('heading', { name: 'No sessions match your filters' })
    server.use(http.get('/api/sessions', () => delay(200)))

    await user.click(within(noMatchesHeading.parentElement!).getByRole('button', { name: 'Clear filters' }))

    expect(await screen.findByText('Updating…')).toBeInTheDocument()
    expect(screen.queryByText('No sessions yet')).not.toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 2, name: '0 sessions match' })).toBeInTheDocument()
    expect(await screen.findByRole('link', { name: 'U14 Shooting Lab' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 2, name: '5 sessions' })).toBeInTheDocument()
  })

  it('drops a pending search keystroke when filters are cleared elsewhere (review R3)', async () => {
    const { user } = renderApp({ path: '/sessions?query=zzz' })
    const noMatchesHeading = await screen.findByRole('heading', { name: 'No sessions match your filters' })
    const search = screen.getByLabelText('Search sessions')

    await user.type(search, 'y')
    await user.click(within(noMatchesHeading.parentElement!).getByRole('button', { name: 'Clear filters' }))
    await new Promise((resolve) => setTimeout(resolve, 400))

    expect(search).toHaveValue('')
    expect(await screen.findByRole('heading', { level: 2, name: '5 sessions' })).toBeInTheDocument()
  })

  it('shows a useful list error and recovers on retry', async () => {
    const { user, switchScenario } = renderApp({ scenario: 'list-error' })

    const alert = await screen.findByRole('alert')
    expect(within(alert).getByRole('heading', { name: "Sessions couldn't be loaded" })).toBeInTheDocument()
    expect(alert).toHaveTextContent('Sessions cannot be loaded right now.')

    switchScenario('normal')
    await user.click(within(alert).getByRole('button', { name: 'Try again' }))
    expect(await screen.findByRole('link', { name: 'U14 Shooting Lab' })).toBeInTheDocument()
  })
})
