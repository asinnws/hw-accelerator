import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { Panel, PanelBody, PanelHeader } from './Panel'

// Below 1024px the panel is a modal <dialog>. jsdom implements neither
// showModal() nor close(), so these stubs model the browser: close() also fires
// the native `close` event, as Chrome does when it force-closes on Escape.
function stubDialog() {
  const showModal = vi.fn(function (this: HTMLDialogElement) {
    this.setAttribute('open', '')
  })
  const close = vi.fn(function (this: HTMLDialogElement) {
    this.removeAttribute('open')
    this.dispatchEvent(new Event('close'))
  })
  Object.defineProperty(HTMLDialogElement.prototype, 'showModal', { configurable: true, value: showModal })
  Object.defineProperty(HTMLDialogElement.prototype, 'close', { configurable: true, value: close })
  Object.defineProperty(HTMLDialogElement.prototype, 'open', {
    configurable: true,
    get(this: HTMLDialogElement) {
      return this.hasAttribute('open')
    },
  })
  return { showModal }
}

const desktopMatchMedia = window.matchMedia

describe('Panel in dialog mode (<1024px)', () => {
  beforeEach(() => {
    window.matchMedia = (query: string) => ({ ...desktopMatchMedia(query), matches: false })
  })

  afterEach(() => {
    window.matchMedia = desktopMatchMedia
    for (const key of ['showModal', 'close', 'open'] as const) {
      Reflect.deleteProperty(HTMLDialogElement.prototype, key)
    }
  })

  it('reopens with its content and focus when the browser force-closes it while the route is active (browser-verify BV-1)', async () => {
    const { showModal } = stubDialog()
    const onClose = vi.fn()
    const user = userEvent.setup()
    render(
      <Panel onClose={onClose}>
        <PanelHeader eyebrow="New session" title="Create session" closeLabel="Close create session" />
        <PanelBody>
          <label htmlFor="probe-title">Title</label>
          <input id="probe-title" />
        </PanelBody>
      </Panel>,
    )

    const dialog = screen.getByRole<HTMLDialogElement>('dialog', { hidden: true })
    expect(showModal).toHaveBeenCalledTimes(1)
    const title = screen.getByLabelText('Title')
    await user.type(title, 'Dirty Form')

    // Chrome: a repeated Escape after a declined discard closes the dialog natively.
    dialog.close()

    expect(dialog).toHaveAttribute('open')
    expect(showModal).toHaveBeenCalledTimes(2)
    expect(title).toHaveValue('Dirty Form')
    expect(title).toHaveFocus()
    expect(onClose).not.toHaveBeenCalled()
  })
})
