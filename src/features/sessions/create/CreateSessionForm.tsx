import { useEffect, useState, type FormEvent } from 'react'
import { SESSION_TYPES } from '../../../api/contract'
import type { ApiError } from '../../../api/errors'
import { localTimeZoneName } from '../../../shared/format'
import { TYPE_LABEL, VISIBILITY_LABEL } from '../model/status'
import type { SessionDetail, SessionType, Visibility } from '../model/types'
import { Field } from '../ui/Field'
import { fieldA11y } from '../ui/fieldA11y'
import { Panel, PanelBody, PanelHeader } from '../ui/Panel'
import {
  CONTROL_ID,
  FIELD_ORDER,
  INITIAL_VALUES,
  isDirty,
  TRAINER_NOTES_MAX,
  type CreateFieldErrors,
  type CreateFieldKey,
  type CreateSessionValues,
} from './formValues'
import { mapServerFieldErrors } from './serverFieldErrors'
import { toCreateSessionRequest } from './toRequest'
import { useCoaches } from './useCoaches'
import { useCreateSession } from './useCreateSession'
import { validateCreateSession } from './validation'

const NOTES_WARNING_THRESHOLD = 50
const NO_SERVER_ERRORS = { byField: {} as CreateFieldErrors, formMessage: null as FormMessage | null }

interface FormMessage {
  title: string
  details: string[]
}

function serverFailureMessage(error: ApiError): FormMessage {
  if (error.code === 'NETWORK_ERROR') {
    return {
      title: "The session couldn't be created. We couldn't reach the server.",
      details: ['Your entries are kept. Check your connection, then try again.'],
    }
  }
  return {
    title: "The session couldn't be created. Your entries are kept. Try again.",
    details: [error.message],
  }
}

function focusControl(field: CreateFieldKey) {
  document.getElementById(CONTROL_ID[field])?.focus()
}

function fieldForValue(key: keyof CreateSessionValues): CreateFieldKey {
  return key === 'date' || key === 'time' ? 'start' : key
}

function pluralFields(count: number): string {
  return count === 1 ? '1 field' : `${count} fields`
}

interface CreateSessionFormProps {
  onClose: () => void
  onCreated: (session: SessionDetail) => void
}

export function CreateSessionForm({ onClose, onCreated }: CreateSessionFormProps) {
  const coaches = useCoaches()
  const create = useCreateSession()
  const [values, setValues] = useState<CreateSessionValues>(INITIAL_VALUES)
  // Instant of the latest submit attempt; null until the user first submits.
  const [submittedAt, setSubmittedAt] = useState<Date | null>(null)
  const [server, setServer] = useState(NO_SERVER_ERRORS)
  const [liveMessage, setLiveMessage] = useState('')
  // Focus moves only after React commits aria-invalid/aria-describedby, so the
  // focused control is announced together with its error.
  const [focusRequest, setFocusRequest] = useState<{ field: CreateFieldKey; attempt: number } | null>(null)

  useEffect(() => {
    if (focusRequest) focusControl(focusRequest.field)
  }, [focusRequest])

  const requestFocus = (field: CreateFieldKey) =>
    setFocusRequest((previous) => ({ field, attempt: (previous?.attempt ?? 0) + 1 }))

  // After the first submit, errors are re-derived from the current values so a
  // fixed field clears immediately. Server field errors apply until edited.
  const clientErrors = submittedAt ? validateCreateSession(values, submittedAt) : {}
  const errorFor = (field: CreateFieldKey) => clientErrors[field] ?? server.byField[field]

  const coachesReady = coaches.status === 'success' && coaches.data.length > 0
  const submitBlockedReason =
    coaches.status === 'loading'
      ? 'Coach choices are loading. You can create the session once they appear.'
      : coachesReady
        ? null
        : 'Coach choices must load before you can create a session.'

  const update = <K extends keyof CreateSessionValues>(key: K, value: CreateSessionValues[K]) => {
    setValues((previous) => ({ ...previous, [key]: value }))
    const field = fieldForValue(key)
    if (server.byField[field]) {
      setServer((previous) => {
        const byField = { ...previous.byField }
        delete byField[field]
        return { ...previous, byField }
      })
    }
  }

  const requestClose = () => {
    if (isDirty(values) && !window.confirm('Discard this new session?')) return
    onClose()
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (create.isPending || !coachesReady) return
    const now = new Date()
    setSubmittedAt(now)

    const errors = validateCreateSession(values, now)
    const invalid = FIELD_ORDER.filter((field) => errors[field])
    if (invalid.length > 0) {
      setLiveMessage(`Fix ${pluralFields(invalid.length)} to create the session.`)
      requestFocus(invalid[0])
      return
    }

    setServer(NO_SERVER_ERRORS)
    setLiveMessage('Creating session…')
    const result = await create.submit(toCreateSessionRequest(values))
    if (result.ok) {
      setLiveMessage('')
      onCreated(result.session)
      return
    }
    if (!result.error) return

    if (result.error.code === 'VALIDATION_FAILED') {
      const { byField, unmapped } = mapServerFieldErrors(result.error.fieldErrors)
      const firstServerField = FIELD_ORDER.find((field) => byField[field])
      setServer({
        byField,
        formMessage:
          unmapped.length > 0 || !firstServerField
            ? { title: 'Some details were rejected. Your entries are kept.', details: [result.error.message, ...unmapped] }
            : null,
      })
      setLiveMessage('Some details were rejected. Review the highlighted fields.')
      if (firstServerField) requestFocus(firstServerField)
      return
    }

    setServer({ byField: {}, formMessage: serverFailureMessage(result.error) })
    setLiveMessage('')
  }

  const startError = errorFor('start')
  const notesRemaining = TRAINER_NOTES_MAX - values.trainerNotes.length
  const timeZone = localTimeZoneName()

  return (
    <Panel onClose={requestClose}>
      <PanelHeader eyebrow="New session" title="Create session" closeLabel="Close create session" />
      <PanelBody>
        <form className="create-form" noValidate onSubmit={handleSubmit} aria-describedby="create-intro">
          <p id="create-intro" className="muted">
            All fields are required unless marked optional.
          </p>

          {server.formMessage ? (
            <div className="form-alert" role="alert">
              <p className="form-alert__title">{server.formMessage.title}</p>
              {server.formMessage.details.map((detail) => (
                <p key={detail} className="form-alert__detail">
                  {detail}
                </p>
              ))}
            </div>
          ) : null}

          <Field id={CONTROL_ID.title} label="Title" error={errorFor('title')}>
            <input
              {...fieldA11y(CONTROL_ID.title, { error: errorFor('title') })}
              name="title"
              type="text"
              autoComplete="off"
              value={values.title}
              onChange={(event) => update('title', event.target.value)}
            />
          </Field>

          <Field id={CONTROL_ID.type} label="Session type" error={errorFor('type')}>
            <select
              {...fieldA11y(CONTROL_ID.type, { error: errorFor('type') })}
              name="type"
              value={values.type}
              onChange={(event) => update('type', event.target.value as SessionType)}
            >
              {SESSION_TYPES.map((type) => (
                <option key={type} value={type}>
                  {TYPE_LABEL[type]}
                </option>
              ))}
            </select>
          </Field>

          <fieldset
            className="field-group"
            aria-describedby={startError ? 'create-start-hint create-start-error' : 'create-start-hint'}
          >
            <legend className="field__label">Start</legend>
            <p id="create-start-hint" className="field__hint">
              Times are in your local time zone ({timeZone}).
            </p>
            <div className="field-group__row">
              <div className="field">
                <label className="field__label" htmlFor="create-date">
                  Date
                </label>
                <input
                  id="create-date"
                  name="date"
                  type="date"
                  value={values.date}
                  aria-invalid={startError ? true : undefined}
                  aria-describedby={startError ? 'create-start-error' : undefined}
                  onChange={(event) => update('date', event.target.value)}
                />
              </div>
              <div className="field">
                <label className="field__label" htmlFor="create-time">
                  Start time
                </label>
                <input
                  id="create-time"
                  name="time"
                  type="time"
                  value={values.time}
                  aria-invalid={startError ? true : undefined}
                  aria-describedby={startError ? 'create-start-error' : undefined}
                  onChange={(event) => update('time', event.target.value)}
                />
              </div>
            </div>
            {startError ? (
              <p id="create-start-error" className="field__error">
                {startError}
              </p>
            ) : null}
          </fieldset>

          <Field id={CONTROL_ID.duration} label="Duration (minutes)" hint="From 30 to 240 minutes." error={errorFor('duration')}>
            <input
              {...fieldA11y(CONTROL_ID.duration, { hasHint: true, error: errorFor('duration') })}
              name="duration"
              type="number"
              inputMode="numeric"
              min={30}
              max={240}
              step={15}
              value={values.duration}
              onChange={(event) => update('duration', event.target.value)}
            />
          </Field>

          {coaches.status === 'error' || (coaches.status === 'success' && coaches.data.length === 0) ? (
            // No select to label: name the group instead of leaving an orphan <label>.
            <div className="field" role="group" aria-labelledby="create-coach-label">
              <p id="create-coach-label" className="field__label">
                Coach
              </p>
              {coaches.status === 'error' ? (
                <div className="inline-alert" role="alert">
                  <p>Coach choices couldn't be loaded.</p>
                  <button type="button" className="button button--secondary" onClick={coaches.retry}>
                    Try again
                  </button>
                </div>
              ) : (
                <p className="inline-alert" role="alert">
                  No coaches are available.
                </p>
              )}
            </div>
          ) : (
            <Field id={CONTROL_ID.coachId} label="Coach" error={errorFor('coachId')}>
              <select
                {...fieldA11y(CONTROL_ID.coachId, { error: errorFor('coachId') })}
                name="coachId"
                value={values.coachId}
                disabled={coaches.status !== 'success'}
                onChange={(event) => update('coachId', event.target.value)}
              >
                {coaches.status === 'success' ? (
                  <>
                    <option value="">Select a coach</option>
                    {coaches.data.map((coach) => (
                      <option key={coach.id} value={coach.id}>
                        {coach.name}
                      </option>
                    ))}
                  </>
                ) : (
                  <option value="">Loading coaches…</option>
                )}
              </select>
            </Field>
          )}

          <Field id={CONTROL_ID.locationName} label="Location name" error={errorFor('locationName')}>
            <input
              {...fieldA11y(CONTROL_ID.locationName, { error: errorFor('locationName') })}
              name="locationName"
              type="text"
              autoComplete="off"
              value={values.locationName}
              onChange={(event) => update('locationName', event.target.value)}
            />
          </Field>

          <Field id={CONTROL_ID.locationAddress} label="Location address" error={errorFor('locationAddress')}>
            <input
              {...fieldA11y(CONTROL_ID.locationAddress, { error: errorFor('locationAddress') })}
              name="locationAddress"
              type="text"
              autoComplete="street-address"
              value={values.locationAddress}
              onChange={(event) => update('locationAddress', event.target.value)}
            />
          </Field>

          <Field id={CONTROL_ID.capacity} label="Capacity" hint="From 1 to 100 places." error={errorFor('capacity')}>
            <input
              {...fieldA11y(CONTROL_ID.capacity, { hasHint: true, error: errorFor('capacity') })}
              name="capacity"
              type="number"
              inputMode="numeric"
              min={1}
              max={100}
              value={values.capacity}
              onChange={(event) => update('capacity', event.target.value)}
            />
          </Field>

          <fieldset
            className="field-group"
            aria-describedby={errorFor('visibility') ? 'create-visibility-error' : undefined}
          >
            <legend className="field__label">Visibility</legend>
            <div className="radio-row">
              {(['public', 'invite-only'] as const satisfies readonly Visibility[]).map((visibility) => (
                <label key={visibility} className="radio">
                  <input
                    id={`create-visibility-${visibility}`}
                    type="radio"
                    name="visibility"
                    value={visibility}
                    checked={values.visibility === visibility}
                    onChange={() => update('visibility', visibility)}
                  />
                  {VISIBILITY_LABEL[visibility]}
                </label>
              ))}
            </div>
            {errorFor('visibility') ? (
              <p id="create-visibility-error" className="field__error">
                {errorFor('visibility')}
              </p>
            ) : null}
          </fieldset>

          <Field id={CONTROL_ID.description} label="Description" optional error={errorFor('description')}>
            <textarea
              {...fieldA11y(CONTROL_ID.description, { error: errorFor('description') })}
              name="description"
              rows={3}
              value={values.description}
              onChange={(event) => update('description', event.target.value)}
            />
          </Field>

          <Field
            id={CONTROL_ID.trainerNotes}
            label="Trainer notes"
            optional
            hint={`Up to ${TRAINER_NOTES_MAX} characters.`}
            error={errorFor('trainerNotes')}
          >
            <textarea
              {...fieldA11y(CONTROL_ID.trainerNotes, { hasHint: true, error: errorFor('trainerNotes') })}
              name="trainerNotes"
              rows={3}
              value={values.trainerNotes}
              onChange={(event) => update('trainerNotes', event.target.value)}
            />
            <p className={notesRemaining < 0 ? 'char-count char-count--over' : 'char-count'} aria-hidden="true">
              {values.trainerNotes.length} / {TRAINER_NOTES_MAX}
            </p>
            <p className="visually-hidden" aria-live="polite">
              {notesRemaining <= NOTES_WARNING_THRESHOLD
                ? notesRemaining >= 0
                  ? `${notesRemaining} characters left`
                  : `${-notesRemaining} characters over the limit`
                : ''}
            </p>
          </Field>

          <div className="form-actions">
            <button
              type="submit"
              className="button button--primary button--stable"
              aria-disabled={create.isPending ? true : undefined}
              disabled={!coachesReady}
              aria-describedby={submitBlockedReason ? 'create-submit-reason' : undefined}
            >
              {create.isPending ? (
                <>
                  <span className="spinner" aria-hidden="true" />
                  Creating…
                </>
              ) : (
                'Create session'
              )}
            </button>
            <button type="button" className="button button--secondary" onClick={requestClose}>
              Cancel
            </button>
          </div>
          {submitBlockedReason ? (
            <p id="create-submit-reason" className="field__hint">
              {submitBlockedReason}
            </p>
          ) : null}

          <p className="visually-hidden" role="status">
            {liveMessage}
          </p>
        </form>
      </PanelBody>
    </Panel>
  )
}
