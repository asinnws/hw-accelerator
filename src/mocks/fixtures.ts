// The only module that reads assessment fixtures. Application code and the API
// client never import fixture JSON.
import coachesJson from '../../frontend-accelerator-assessment/fixtures/coaches.json'
import fixtureClockJson from '../../frontend-accelerator-assessment/fixtures/fixture-clock.json'
import scenariosJson from '../../frontend-accelerator-assessment/fixtures/mock-scenarios.json'
import ses101 from '../../frontend-accelerator-assessment/fixtures/session-details/ses_101.json'
import ses102 from '../../frontend-accelerator-assessment/fixtures/session-details/ses_102.json'
import ses103 from '../../frontend-accelerator-assessment/fixtures/session-details/ses_103.json'
import ses104 from '../../frontend-accelerator-assessment/fixtures/session-details/ses_104.json'
import ses105 from '../../frontend-accelerator-assessment/fixtures/session-details/ses_105.json'
import sessionsJson from '../../frontend-accelerator-assessment/fixtures/sessions.json'
import {
  isSessionStatus,
  isSessionType,
  isVisibility,
  type ApiErrorBody,
  type CoachSummary,
  type SessionDetails,
} from '../api/contract'

type RawSessionDetails = Omit<SessionDetails, 'type' | 'status' | 'visibility'> & {
  type: string
  status: string
  visibility: string
}

function narrowDetails(raw: RawSessionDetails): SessionDetails {
  const { type, status, visibility } = raw
  if (!isSessionType(type) || !isSessionStatus(status) || !isVisibility(visibility)) {
    throw new Error(`Fixture ${raw.id} has an unsupported enum value`)
  }
  return { ...raw, type, status, visibility }
}

const detailsById = new Map<string, SessionDetails>(
  [ses101, ses102, ses103, ses104, ses105].map((raw) => {
    const details = narrowDetails(raw)
    return [details.id, details]
  }),
)

// sessions.json defines the default list membership and order; every summary
// matches its details fixture, so the details records are the single store.
export const seedSessions: readonly SessionDetails[] = sessionsJson.data.map((summary) => {
  const details = detailsById.get(summary.id)
  if (!details) throw new Error(`Missing details fixture for ${summary.id}`)
  return details
})

export const seedCoaches: readonly CoachSummary[] = coachesJson.data

export const fixtureReferenceNow: string = fixtureClockJson.referenceNow

export interface ScenarioErrorResponse {
  status: number
  body: ApiErrorBody
  targetSessionId?: string
}

export const normalLatencyMs: number = scenariosJson.normal.defaultLatencyMs

export const scenarioErrors = {
  'list-error': scenariosJson['list-error'],
  'details-error': scenariosJson['details-error'],
  'coaches-error': scenariosJson['coaches-error'],
  'create-error': scenariosJson['create-error'],
} satisfies Record<string, ScenarioErrorResponse>

export const unknownSessionError: ApiErrorBody = scenariosJson['unknown-session'].body
