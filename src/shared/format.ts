// All user-facing dates use Intl in the user's locale and time zone.
const shortStart = new Intl.DateTimeFormat(undefined, {
  weekday: 'short',
  month: 'short',
  day: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
})

const fullStart = new Intl.DateTimeFormat(undefined, {
  weekday: 'long',
  year: 'numeric',
  month: 'long',
  day: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
})

const timeOnly = new Intl.DateTimeFormat(undefined, {
  hour: '2-digit',
  minute: '2-digit',
  timeZoneName: 'short',
})

const timestamp = new Intl.DateTimeFormat(undefined, {
  year: 'numeric',
  month: 'short',
  day: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
})

export function formatShortStart(date: Date): string {
  return shortStart.format(date)
}

export function formatFullStartRange(start: Date, end: Date): string {
  return `${fullStart.format(start)} – ${timeOnly.format(end)}`
}

export function formatTimestamp(date: Date): string {
  return timestamp.format(date)
}

export function localTimeZoneName(): string {
  return Intl.DateTimeFormat().resolvedOptions().timeZone
}
