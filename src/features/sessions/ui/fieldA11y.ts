// Accessibility wiring for a control rendered inside <Field>; ids match Field's hint/error.
export function fieldA11y(id: string, { hasHint, error }: { hasHint?: boolean; error?: string }) {
  const describedBy = [hasHint ? `${id}-hint` : null, error ? `${id}-error` : null].filter(Boolean).join(' ')
  return {
    id,
    'aria-invalid': error ? true : undefined,
    'aria-describedby': describedBy || undefined,
  } as const
}
