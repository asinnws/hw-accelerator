// Scenario selection is assessment infrastructure. It stays inside src/mocks/;
// the API client and presentation components only see ordinary HTTP results.
export const REQUIRED_SCENARIOS = [
  'normal',
  'empty',
  'list-error',
  'details-error',
  'coaches-error',
  'create-error',
] as const

export type ScenarioName = (typeof REQUIRED_SCENARIOS)[number]

function isScenarioName(value: string): value is ScenarioName {
  return (REQUIRED_SCENARIOS as readonly string[]).includes(value)
}

export function resolveScenario(search: string): ScenarioName {
  const requested = new URLSearchParams(search).get('scenario')
  if (requested === null) return 'normal'
  if (isScenarioName(requested)) return requested
  console.info(
    `[mocks] Unknown scenario "${requested}". Using "normal". Available: ${REQUIRED_SCENARIOS.join(', ')}.`,
  )
  return 'normal'
}
