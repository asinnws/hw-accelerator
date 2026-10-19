import type { ReactNode } from 'react'

interface FieldProps {
  hint?: string
  error?: string
  id: string
  label: string
  optional?: boolean
  children: ReactNode
}

export function Field({ id, label, optional, hint, error, children }: FieldProps) {
  return (
    <div className="field">
      <label className="field__label" htmlFor={id}>
        {label}
        {optional ? <span className="field__optional"> (optional)</span> : null}
      </label>
      {hint ? (
        <p id={`${id}-hint`} className="field__hint">
          {hint}
        </p>
      ) : null}
      {children}
      {error ? (
        <p id={`${id}-error`} className="field__error">
          {error}
        </p>
      ) : null}
    </div>
  )
}
