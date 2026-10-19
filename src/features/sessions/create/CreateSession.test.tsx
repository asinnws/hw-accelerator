import { screen, within } from '@testing-library/react'
import type { UserEvent } from '@testing-library/user-event'
import { delay, http } from 'msw'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { freezeClock, restoreClock } from '../../../test/clock'
import { renderApp } from '../../../test/renderApp'

// FIXED_NOW is 2026-07-27, so this start is in the future in any time zone.
const VALID = {
  title: 'Evening Shooting Clinic',
  date: '2026-08-10',
  time: '18:30',
  duration: '90',
  coach: 'Lena Ortiz',
  locationName: 'North Court',
  locationAddress: '18 Harbor Street',
  capacity: '12',
}

async function fillValidForm(user: UserEvent) {
  await user.type(screen.getByLabelText('Title'), VALID.title)
  await user.type(screen.getByLabelText('Date'), VALID.date)
  await user.type(screen.getByLabelText('Start time'), VALID.time)
  await user.clear(screen.getByLabelText('Duration (minutes)'))
  await user.type(screen.getByLabelText('Duration (minutes)'), VALID.duration)
  await user.selectOptions(screen.getByLabelText('Coach'), VALID.coach)
  await user.type(screen.getByLabelText('Location name'), VALID.locationName)
  await user.type(screen.getByLabelText('Location address'), VALID.locationAddress)
  await user.type(screen.getByLabelText('Capacity'), VALID.capacity)
}

async function createSuccessfully(user: UserEvent) {
  await screen.findByRole('option', { name: VALID.coach })
  await fillValidForm(user)
  await user.click(screen.getByRole('button', { name: 'Create session' }))
  const text = await screen.findByText(`“${VALID.title}” was created.`)
  await within(screen.getByRole('table')).findByRole('link', { name: VALID.title })
  return text.closest<HTMLElement>('[role="status"]')!
}

describe('Create session', () => {
  beforeEach(freezeClock)
  afterEach(restoreClock)

  it('validates required fields, then submits once and makes the new session discoverable', async () => {
    const { user, server } = renderApp({ path: '/sessions/new' })
    let createRequests = 0
    server.events.on('request:start', ({ request }) => {
      if (request.method === 'POST') createRequests += 1
    })
    await screen.findByRole('option', { name: VALID.coach })

    await user.click(screen.getByRole('button', { name: 'Create session' }))

    expect(screen.getByLabelText('Title')).toHaveAccessibleDescription('Enter a title of 3 to 80 characters.')
    expect(screen.getByLabelText('Title')).toHaveFocus()
    expect(screen.getByLabelText('Date')).toHaveAccessibleDescription('Enter a start date and start time.')
    expect(screen.getByLabelText('Coach')).toHaveAccessibleDescription('Choose a coach.')
    expect(screen.getByLabelText('Location name')).toHaveAccessibleDescription(
      'Enter a location name of 2 to 80 characters.',
    )
    expect(screen.getByLabelText('Location address')).toHaveAccessibleDescription(
      'Enter a location address of 3 to 120 characters.',
    )
    expect(screen.getByLabelText('Capacity')).toHaveAccessibleDescription(
      expect.stringContaining('Enter a whole number of places from 1 to 100.'),
    )
    expect(createRequests).toBe(0)

    await fillValidForm(user)
    expect(screen.getByLabelText('Title')).not.toHaveAttribute('aria-invalid')

    await user.dblClick(screen.getByRole('button', { name: 'Create session' }))

    const banner = await screen.findByText(`“${VALID.title}” was created.`)
    expect(banner.closest('[role="status"]')).toBeInTheDocument()
    const row = await within(screen.getByRole('table')).findByRole('link', { name: VALID.title })
    expect(row).toBeInTheDocument()
    expect(createRequests).toBe(1)
    // The create panel closed; focus moves to the success banner (review N1).
    expect(screen.queryByRole('heading', { level: 2, name: 'Create session' })).not.toBeInTheDocument()
    expect(banner.closest('[role="status"]')).toHaveFocus()
  })

  it('a late create success keeps the session the user opened meanwhile (review R2)', async () => {
    const { user } = renderApp({
      path: '/sessions/new',
      // Falls through to the scenario handler after the delay.
      handlers: [http.post('/api/sessions', () => delay(200))],
    })
    await screen.findByRole('option', { name: VALID.coach })
    await fillValidForm(user)

    await user.click(screen.getByRole('button', { name: 'Create session' }))
    expect(await screen.findByRole('button', { name: 'Creating…' })).toHaveAttribute('aria-disabled', 'true')

    await user.click(within(screen.getByRole('table')).getByRole('link', { name: 'U14 Shooting Lab' }))
    expect(await screen.findByRole('heading', { level: 2, name: 'U14 Shooting Lab' })).toBeInTheDocument()

    expect(await screen.findByText(`“${VALID.title}” was created.`)).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 2, name: 'U14 Shooting Lab' })).toBeInTheDocument()
    expect(screen.queryByRole('heading', { level: 2, name: 'Create session' })).not.toBeInTheDocument()
    // The late banner must not pull focus out of the details panel (review N1).
    expect(screen.getByRole('heading', { level: 2, name: 'U14 Shooting Lab' })).toHaveFocus()
  })

  it('does not refocus the banner after create → search → clear (review N3)', async () => {
    const { user } = renderApp({ path: '/sessions/new' })
    const banner = await createSuccessfully(user)
    expect(banner).toHaveFocus()

    const search = screen.getByLabelText('Search sessions')
    await user.type(search, 'maya')
    expect(await screen.findByRole('heading', { level: 2, name: '2 sessions match' })).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Clear filters' }))
    expect(await screen.findByRole('heading', { level: 2, name: '6 sessions' })).toBeInTheDocument()
    expect(search).toHaveFocus()
    // Changing filters retires the banner instead of hiding it until they return.
    expect(screen.queryByText(`“${VALID.title}” was created.`)).not.toBeInTheDocument()
  })

  it('returns focus to the Create link when a later create is cancelled (review N3)', async () => {
    const { user } = renderApp({ path: '/sessions/new' })
    await createSuccessfully(user)

    await user.click(screen.getByRole('link', { name: 'Create session' }))
    expect(await screen.findByRole('heading', { level: 2, name: 'Create session' })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Cancel' }))

    expect(screen.queryByRole('heading', { level: 2, name: 'Create session' })).not.toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Create session' })).toHaveFocus()
  })

  it('moves focus to the list heading when the banner is dismissed (review N4)', async () => {
    const { user } = renderApp({ path: '/sessions/new' })
    await createSuccessfully(user)

    await user.click(screen.getByRole('button', { name: 'Dismiss' }))

    expect(screen.queryByText(`“${VALID.title}” was created.`)).not.toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 2, name: '6 sessions' })).toHaveFocus()
  })

  it('keeps every entered value after a server failure and explains how to recover', async () => {
    const { user } = renderApp({ path: '/sessions/new', scenario: 'create-error' })
    await screen.findByRole('option', { name: VALID.coach })

    await fillValidForm(user)
    await user.click(screen.getByRole('button', { name: 'Create session' }))

    const alert = await screen.findByText("The session couldn't be created. Your entries are kept. Try again.")
    expect(alert.closest('[role="alert"]')).toHaveTextContent('The session could not be created.')

    expect(screen.getByLabelText('Title')).toHaveValue(VALID.title)
    expect(screen.getByLabelText('Date')).toHaveValue(VALID.date)
    expect(screen.getByLabelText('Start time')).toHaveValue(VALID.time)
    expect(screen.getByLabelText('Duration (minutes)')).toHaveValue(Number(VALID.duration))
    expect(screen.getByLabelText('Coach')).toHaveDisplayValue(VALID.coach)
    expect(screen.getByLabelText('Location name')).toHaveValue(VALID.locationName)
    expect(screen.getByLabelText('Location address')).toHaveValue(VALID.locationAddress)
    expect(screen.getByLabelText('Capacity')).toHaveValue(Number(VALID.capacity))
    expect(screen.getByRole('button', { name: 'Create session' })).toBeEnabled()
    expect(screen.getByRole('button', { name: 'Create session' })).not.toHaveAttribute('aria-disabled')
  })
})
