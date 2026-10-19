import type { SessionType, Visibility } from '../model/types'

// Raw form state: every input keeps exactly what the user typed.
export interface CreateSessionValues {
  title: string
  type: SessionType
  date: string
  time: string
  duration: string
  coachId: string
  locationName: string
  locationAddress: string
  capacity: string
  visibility: Visibility
  description: string
  trainerNotes: string
}

export type CreateFieldKey =
  | 'title'
  | 'type'
  | 'start'
  | 'duration'
  | 'coachId'
  | 'locationName'
  | 'locationAddress'
  | 'capacity'
  | 'visibility'
  | 'description'
  | 'trainerNotes'

export type CreateFieldErrors = Partial<Record<CreateFieldKey, string>>

// Visual order of the controls; used to focus the first invalid one.
export const FIELD_ORDER: readonly CreateFieldKey[] = [
  'title',
  'type',
  'start',
  'duration',
  'coachId',
  'locationName',
  'locationAddress',
  'capacity',
  'visibility',
  'description',
  'trainerNotes',
]

export const CONTROL_ID: Record<CreateFieldKey, string> = {
  title: 'create-title',
  type: 'create-type',
  start: 'create-date',
  duration: 'create-duration',
  coachId: 'create-coach',
  locationName: 'create-location-name',
  locationAddress: 'create-location-address',
  capacity: 'create-capacity',
  visibility: 'create-visibility-public',
  description: 'create-description',
  trainerNotes: 'create-notes',
}

export const TRAINER_NOTES_MAX = 500

export const INITIAL_VALUES: CreateSessionValues = {
  title: '',
  type: 'training',
  date: '',
  time: '',
  duration: '60',
  coachId: '',
  locationName: '',
  locationAddress: '',
  capacity: '',
  visibility: 'public',
  description: '',
  trainerNotes: '',
}

export function isDirty(values: CreateSessionValues): boolean {
  return (Object.keys(INITIAL_VALUES) as (keyof CreateSessionValues)[]).some(
    (key) => values[key] !== INITIAL_VALUES[key],
  )
}
