import { createContext, use, useEffect, useId, useRef, type KeyboardEvent, type ReactNode } from 'react'
import { DESKTOP_QUERY, useMediaQuery } from '../../../shared/useMediaQuery'

interface PanelContextValue {
  titleId: string
  onClose: () => void
}

const PanelContext = createContext<PanelContextValue | null>(null)

function usePanel(): PanelContextValue {
  const value = use(PanelContext)
  if (!value) throw new Error('Panel parts must be rendered inside <Panel>')
  return value
}

function focusHeading(container: HTMLElement | null) {
  container?.querySelector<HTMLElement>('[data-panel-heading]')?.focus()
}

interface PanelProps {
  onClose: () => void
  children: ReactNode
}

/**
 * Child-route container. Desktop (≥1024px): inline, non-modal side panel so the
 * list stays interactive. Smaller widths: modal <dialog> drawer/sheet.
 */
export function Panel({ onClose, children }: PanelProps) {
  const titleId = useId()
  const isDesktop = useMediaQuery(DESKTOP_QUERY)
  return (
    <PanelContext value={{ titleId, onClose }}>
      {isDesktop ? <InlinePanel>{children}</InlinePanel> : <DialogPanel>{children}</DialogPanel>}
    </PanelContext>
  )
}

function InlinePanel({ children }: { children: ReactNode }) {
  const { titleId, onClose } = usePanel()
  const ref = useRef<HTMLElement>(null)

  useEffect(() => {
    focusHeading(ref.current)
  }, [])

  const handleKeyDown = (event: KeyboardEvent<HTMLElement>) => {
    if (event.key === 'Escape') {
      event.stopPropagation()
      onClose()
    }
  }

  return (
    <section ref={ref} className="panel panel--inline" aria-labelledby={titleId} onKeyDown={handleKeyDown}>
      {children}
    </section>
  )
}

function DialogPanel({ children }: { children: ReactNode }) {
  const { titleId, onClose } = usePanel()
  const ref = useRef<HTMLDialogElement>(null)
  const lastFocused = useRef<HTMLElement | null>(null)

  useEffect(() => {
    const dialog = ref.current
    if (dialog && !dialog.open) dialog.showModal()
    focusHeading(dialog)
  }, [])

  return (
    <dialog
      ref={ref}
      className="panel panel--modal"
      aria-labelledby={titleId}
      onCancel={(event) => {
        event.preventDefault()
        onClose()
      }}
      onClose={(event) => {
        // Only the route closes this panel (by unmounting it). Chrome's close
        // watcher can still force-close a modal dialog on a repeated Escape even
        // though `cancel` was prevented, e.g. after the user declined to discard
        // input. Reopen it and restore focus so the panel never ends up hidden
        // while its route is active (browser-verify BV-1).
        const dialog = event.currentTarget
        if (!dialog.isConnected || dialog.open) return
        dialog.showModal()
        const target = lastFocused.current
        if (target && dialog.contains(target)) target.focus()
        else focusHeading(dialog)
      }}
      onFocus={(event) => {
        // Focus bubbles up from controls inside the dialog.
        const target: EventTarget = event.target
        if (target instanceof HTMLElement) lastFocused.current = target
      }}
    >
      {children}
    </dialog>
  )
}

interface PanelHeaderProps {
  eyebrow: string
  title: string
  closeLabel: string
  children?: ReactNode
}

export function PanelHeader({ eyebrow, title, closeLabel, children }: PanelHeaderProps) {
  const { titleId, onClose } = usePanel()
  return (
    <header className="panel__header">
      <div className="panel__heading-group">
        <p className="panel__eyebrow">{eyebrow}</p>
        <h2 id={titleId} className="panel__title" tabIndex={-1} data-panel-heading="">
          {title}
        </h2>
        {children}
      </div>
      <button type="button" className="icon-button" aria-label={closeLabel} onClick={onClose}>
        <span aria-hidden="true">×</span>
      </button>
    </header>
  )
}

export function PanelBody({ children }: { children: ReactNode }) {
  return <div className="panel__body">{children}</div>
}

export function PanelFooter({ children }: { children: ReactNode }) {
  return <footer className="panel__footer">{children}</footer>
}
