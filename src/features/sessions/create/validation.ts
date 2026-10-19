import { isSessionType, isVisibility } from '../../../api/contract'
import { TRAINER_NOTES_MAX, type CreateFieldErrors, type CreateSessionValues } from './formValues'

const DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/
const TIME_PATTERN = /^(\d{2}):(\d{2})$/
const INTEGER_PATTERN = /^\d+$/

/** Resolves the date and time inputs to an instant in the user's local time zone. */
export function parseLocalStart(date: string, time: string): Date | null {
  const dateMatch = DATE_PATTERN.exec(date)
  const timeMatch = TIME_PATTERN.exec(time)
  if (!dateMatch || !timeMatch) return null
  const [year, month, day] = dateMatch.slice(1).map(Number)
  const [hours, minutes] = timeMatch.slice(1).map(Number)
  const start = new Date(year, month - 1, day, hours, minutes)
  // Reject impossible dates that Date silently rolls over (e.g. 2026-02-31).
  if (start.getFullYear() !== year || start.getMonth() !== month - 1 || start.getDate() !== day) return null
  return start
}

function integerInRange(value: string, min: number, max: number): boolean {
  const trimmed = value.trim()
  if (!INTEGER_PATTERN.test(trimmed)) return false
  const number = Number(trimmed)
  return number >= min && number <= max
}

function lengthInRange(value: string, min: number, max: number): boolean {
  const length = value.trim().length
  return length >= min && length <= max
}

export function validateCreateSession(values: CreateSessionValues, now: Date): CreateFieldErrors {
  const errors: CreateFieldErrors = {}

  if (!lengthInRange(values.title, 3, 80)) errors.title = 'Enter a title of 3 to 80 characters.'
  if (!isSessionType(values.type)) errors.type = 'Choose a session type.'

  if (!values.date || !values.time) {
    errors.start = 'Enter a start date and start time.'
  } else {
    const start = parseLocalStart(values.date, values.time)
    if (!start) errors.start = 'Enter a valid start date and start time.'
    else if (start.getTime() <= now.getTime()) errors.start = 'Choose a start in the future.'
  }

  if (!integerInRange(values.duration, 30, 240)) {
    errors.duration = 'Enter a whole number of minutes from 30 to 240.'
  }
  if (!values.coachId) errors.coachId = 'Choose a coach.'
  if (!lengthInRange(values.locationName, 2, 80)) {
    errors.locationName = 'Enter a location name of 2 to 80 characters.'
  }
  if (!lengthInRange(values.locationAddress, 3, 120)) {
    errors.locationAddress = 'Enter a location address of 3 to 120 characters.'
  }
  if (!integerInRange(values.capacity, 1, 100)) errors.capacity = 'Enter a whole number of places from 1 to 100.'
  if (!isVisibility(values.visibility)) errors.visibility = 'Choose a visibility.'
  if (values.trainerNotes.length > TRAINER_NOTES_MAX) {
    errors.trainerNotes = `Shorten trainer notes to ${TRAINER_NOTES_MAX} characters or fewer.`
  }

  return errors
}
