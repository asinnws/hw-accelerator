import type { CreateSessionRequest } from '../../../api/contract'
import type { CreateFieldErrors, CreateFieldKey } from './formValues'

const REQUEST_FIELD_TO_CONTROL: Record<keyof CreateSessionRequest, CreateFieldKey> = {
  title: 'title',
  type: 'type',
  startsAt: 'start',
  durationMinutes: 'duration',
  coachId: 'coachId',
  locationName: 'locationName',
  locationAddress: 'locationAddress',
  capacity: 'capacity',
  visibility: 'visibility',
  description: 'description',
  trainerNotes: 'trainerNotes',
}

function isRequestField(key: string): key is keyof CreateSessionRequest {
  return Object.hasOwn(REQUEST_FIELD_TO_CONTROL, key)
}

/** Maps `400 VALIDATION_FAILED` fieldErrors onto form controls; unknown keys stay form-level. */
export function mapServerFieldErrors(fieldErrors: Record<string, string> = {}) {
  const byField: CreateFieldErrors = {}
  const unmapped: string[] = []
  for (const [key, message] of Object.entries(fieldErrors)) {
    if (isRequestField(key)) byField[REQUEST_FIELD_TO_CONTROL[key]] = message
    else unmapped.push(message)
  }
  return { byField, unmapped }
}
