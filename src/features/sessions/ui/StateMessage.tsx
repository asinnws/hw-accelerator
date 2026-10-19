import type { ReactNode } from 'react'

interface StateMessageProps {
  title: string
  role: 'status' | 'alert'
  children?: ReactNode
  actions?: ReactNode
}

export function StateMessage({ title, role, children, actions }: StateMessageProps) {
  return (
    <div className={`state-message state-message--${role}`} role={role}>
      <h3 className="state-message__title">{title}</h3>
      {children ? <div className="state-message__body">{children}</div> : null}
      {actions ? <div className="state-message__actions">{actions}</div> : null}
    </div>
  )
}
