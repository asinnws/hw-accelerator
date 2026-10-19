import type { CreateSessionRequest } from '../../../api/contract'
import type { CreateSessionValues } from './formValues'
import { parseLocalStart } from './validation'

function optionalText(value: string): string | null {
  const trimmed = value.trim()
  return trimmed === '' ? null : trimmed
}

/** Builds the contract request from already-validated form values. */
export function toCreateSessionRequest(values: CreateSessionValues): CreateSessionRequest {
  const start = parseLocalStart(values.date, values.time)
  if (!start) throw new Error('toCreateSessionRequest requires a validated start')
  return {
    title: values.title.trim(),
    type: values.type,
    startsAt: start.toISOString(),
    durationMinutes: Number(values.duration.trim()),
    coachId: values.coachId,
    locationName: values.locationName.trim(),
    locationAddress: values.locationAddress.trim(),
    capacity: Number(values.capacity.trim()),
    visibility: values.visibility,
    description: optionalText(values.description),
    trainerNotes: optionalText(values.trainerNotes),
  }
}
