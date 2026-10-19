# TASK-001: API Integration

Inputs:
- `frontend-accelerator-assessment/API_CONTRACT.md` and `MOCKING_GUIDE.md`;
- `fixtures/*.json`, `fixtures/session-details/*.json`, `fixtures/mock-scenarios.json`, and `fixtures/fixture-clock.json`;
- `tasks/TASK-001/requirements.md` (assumptions A1–A4, A7, A8; Q4 and Q5);
- `tasks/TASK-001/architecture.md` (D3, D5–D8).

Rules applied:
- Common: `rulesets/common/api-integration/rules/contract-evidence.md` and `client-behavior.md`.
- Framework and Project: there is no `api-integration` section in either, which is valid.

Existing patterns: none. `src/` is the Vite template, with no client wrapper, schema, generated client, auth, or mocks. The transport and server-state patterns below follow `architecture.md`: native `fetch` and plain React hooks. No client or validation library is introduced.

Documentation evidence: no third-party documentation was needed for these decisions. The contract is fully specified by the assessment package.

**Contract authority.** The assessment contract is fixed. The evaluator is the "backend owner" for any change. This document **proposes no contract changes**.

## Confirmed Contract

These elements come directly from `API_CONTRACT.md` and `MOCKING_GUIDE.md`. They are binding for both the client and the MSW handlers.

| Element | Confirmed shape and behavior |
| --- | --- |
| Base path | `/api`. Every timestamp crossing the boundary is an ISO 8601 UTC string. |
| `GET /api/sessions` | Query `query` (string, default empty) and `status` (`SessionStatus`, default empty). Returns `200 SessionsResponse { data: SessionSummary[]; meta: { page; pageSize; total } }`. The required response keeps `page: 1` and `pageSize: 10`. The handler applies `query` (case-insensitive across title, coach name, and location) and an exact `status` before computing `meta.total`. Errors: `400 INVALID_FILTER`, `500 SESSIONS_UNAVAILABLE`. |
| `GET /api/sessions/:sessionId` | Returns `200 SessionDetails`. Errors: `404 SESSION_NOT_FOUND`, `500 SESSION_DETAILS_UNAVAILABLE`. |
| `GET /api/coaches` | Returns `200 CoachesResponse { data: CoachSummary[] }`. Error: `500 COACHES_UNAVAILABLE`. On this error the create form must not pretend it can submit a valid coach. |
| `POST /api/sessions` | Body `CreateSessionRequest`, where `locationName` and `locationAddress` are required and `description` and `trainerNotes` are optional or `null`. Returns `201 SessionDetails`: generated id and timestamps, echoing the normalized submitted values, with the coach taken from `coaches.json`. The new session appears in later list and details reads. Errors: `400 VALIDATION_FAILED` (with `fieldErrors` where available) and `500 CREATE_SESSION_FAILED`. |
| Error envelope | `ApiError { error: { code: string; message: string; fieldErrors?: Record<string, string> } }` |
| Enums | `SessionType = training \| camp \| private`, `SessionStatus = scheduled \| full \| cancelled \| completed`, `Visibility = public \| invite-only` |
| Idempotency | The client must prevent accidental duplicate submits, but must not claim idempotency guarantees. |
| Required scenarios | `normal`, `empty`, `list-error`, `details-error` (targets `ses_101`), `coaches-error`, `create-error`, with bodies as given in `mock-scenarios.json`. `normal.defaultLatencyMs = 250`. |
| Fixture clock | `referenceNow = 2026-07-27T12:00:00Z`. At mock startup, shift `startsAt`, `createdAt`, `updatedAt`, and `cancelledAt` by `now - referenceNow`. This happens only in the mock layer. |
| Fixture consistency (observed) | All five `sessions.json` summaries equal the summary fields of the matching `session-details/*.json`. `ses_103.trainerNotes` is `null`. Only `ses_104` has a non-null `cancellation`. |

**Out of scope:** the optional `POST /api/sessions/:sessionId/cancel`, `409 COACH_SCHEDULE_CONFLICT`, the permission input, and the optional scenarios. They are not implemented. If any is added later, it follows the contract as written.

## Assumed Contract

The contract does not specify these points. Each is a frontend or mock decision, labelled as an assumption, that resolves a requirements assumption or question. The evaluator may override any of them. None changes the shape of an endpoint, field, status, or error code.

| ID | Decision | Resolves |
| --- | --- | --- |
| AI-1 | **Search fields.** "Location" matches `location.name` **and** `location.address`. The search is a case-insensitive substring match on the trimmed `query`, combined with OR across title, coach name, location name, and location address. Matching on the address too only widens the results. | A1 |
| AI-2 | **Status is authoritative.** The client never derives `full` from `bookedCount` and `capacity`, and the mock never recomputes the status of a stored record. | A2 |
| AI-3 | **Created record defaults** (mock): `status: "scheduled"`, `bookedCount: 0`, `cancellation: null`, and `createdAt` equal to `updatedAt`, both equal to the mock's current instant. The id is `ses_` followed by an increasing number starting at `1001`, which is deterministic in tests. | A3 |
| AI-4 | **Normalization.** The client trims `title`, `locationName`, `locationAddress`, `description`, and `trainerNotes`, and sends an empty optional text as `null`. The mock applies the same trim and null normalization before storing and echoing, so the `201` body is the normalized value. | A4 |
| AI-5 | **Ordering.** The mock returns the seeded records in `sessions.json` order, followed by created records in creation order. The client renders the server order and never re-sorts. | A7 |
| AI-6 | **`400 INVALID_FILTER` trigger** (mock): `status` is present, non-empty, and not a `SessionStatus`. The client never sends such a value, because URL parsing drops invalid values (architecture D2). If the response is received anyway, it uses the list error path, which offers clear filters. | A8 |
| AI-7 | **Empty filter params** are omitted from the request URL. The mock treats a missing param and an empty one identically. | — |
| AI-8 | **`fieldErrors` keys** are `CreateSessionRequest` property names (`title`, `startsAt`, `coachId`, and so on). The client maps them as shown in the mapping table below. Unknown keys go to the form-level error. | Q5 |
| AI-9 | **Mock create validation** covers only the contract-level checks named in `MOCKING_GUIDE.md`. Product limits such as title length, future start, and notes length are enforced by client validation. A real backend may enforce more, and the client handles any extra `fieldErrors` through AI-8. Mock checks: `title`, `locationName`, and `locationAddress` must be non-empty after trimming; `type` and `visibility` must be supported enum values; `startsAt` must be a valid ISO 8601 instant; `durationMinutes` and `capacity` must be positive integers; `coachId` must exist in `coaches.json`. | — |
| AI-10 | **Empty scenario** (mock): it seeds the in-memory db with **zero** records instead of returning a static body. `GET /api/sessions` then returns exactly the scenario body (`data: []`, `total: 0`), but create still works and the new session becomes discoverable. A static body would hide created sessions forever and contradict the stateful-create requirement. | — |
| AI-11 | **`create-error` scenario** (mock): every `POST /api/sessions` returns the scenario's `500` body after latency, and the store is not mutated. | — |
| AI-12 | **Latency** (mock): the browser applies `250 ms` (`normal.defaultLatencyMs`) to every handler in every scenario, so pending and loading states stay observable. Tests use `0` and add a delay only where a test needs a pending window. | — |
| AI-13 | **Unknown session id:** `404 SESSION_NOT_FOUND`, in every scenario. The message is the contract code's meaning. The optional `unknown-session` scenario body is reused as the message source. | — |

## Proposed Contract

None. No endpoint, field, status, or error code is added or changed.

## Blocked Elements

None. Every element needed for the required scope is confirmed (see Confirmed Contract) or decided as an assumption (see Assumed Contract).

## Frontend Integration Boundary

The layering follows architecture D5 and D6: only `src/api/` calls `fetch`, and only `src/mocks/` touches fixtures or scenarios.

### `src/api/` modules

| Module | Responsibility |
| --- | --- |
| `contract.ts` | The DTO types from `API_CONTRACT.md`, verbatim: `SessionType`, `SessionStatus`, `Visibility`, `CoachSummary`, `LocationSummary`, `SessionSummary`, `SessionDetails`, `SessionsResponse`, `CoachesResponse`, `CreateSessionRequest`, `ApiErrorBody`. Exported as runtime constant arrays for the enums (`SESSION_STATUSES`, and so on) because `erasableSyntaxOnly` forbids `enum`. Shared with `mocks/`. |
| `errors.ts` | `class ApiError extends Error`, holding `status: number`, `code: ApiErrorCode`, `fieldErrors?: Record<string, string>`, and a type guard `isApiError`. `ApiErrorCode` is the contract codes plus the client-only codes `NETWORK_ERROR`, `HTTP_ERROR`, and `MALFORMED_RESPONSE`. |
| `http.ts` | `request<T>(path, { method?, query?, body?, signal? })`, which builds `/api` URLs, omits empty query values (AI-7), sends and receives JSON, and normalizes failures (see the normalization table). It is the only `fetch` call site. |
| `mappers.ts` | Maps DTOs to the domain model. Dates are parsed here and nowhere else. Any unparseable timestamp throws `ApiError(MALFORMED_RESPONSE)`. |
| `sessions.ts` | `listSessions(filters, signal)`, `getSession(id, signal)`, and `createSession(request)`. `getSession` encodes the id with `encodeURIComponent`. |
| `coaches.ts` | `listCoaches(signal)`, which returns `Coach[]`. |

The functions return these types:

| Function | Returns |
| --- | --- |
| `listSessions` | `Promise<SessionsPage>`, where `SessionsPage = { items: Session[]; total: number; page: number; pageSize: number }` |
| `getSession` | `Promise<SessionDetail>` |
| `createSession` | `Promise<SessionDetail>` |
| `listCoaches` | `Promise<Coach[]>` |

### Domain model

The domain model lives in `features/sessions/model/`, which `api/mappers.ts` imports. It is the contract shape with dates converted:

- `Session` has the same fields as `SessionSummary`, except that `startsAt` and `updatedAt` are `Date`.
- `SessionDetail` extends `Session` with `description` and `trainerNotes` (each `string | null`), `createdAt: Date`, and `cancellation: { reason: string | null; cancelledAt: Date } | null`.
- `Coach` has the same fields as `CoachSummary`.

Derived values are computed in `model/` helpers and never stored. Examples are the end time, remaining seats, and the status label and symbol.

### Validation boundary

- **Responses:** these are trusted to match the typed contract, apart from the date checks in `mappers.ts`. There is no schema library. The trade-off is accepted: the contract is fixed, and the mock is ours.
- **Create input:** this is validated by a pure `validateCreateSession(values, now)` in `features/sessions/create/`, which covers the product rules in requirements AC-3.3.
- **Request building:** `toCreateSessionRequest(values)` in the same folder trims text (AI-4), converts the local date and time to `startsAt` with `toISOString()`, and converts numeric fields with `Number()` only after validation.

### Request behavior

| Concern | Decision |
| --- | --- |
| Cancellation | GET requests receive an `AbortSignal` from their hook. A filter, id, or route change and an unmount all abort the request. Aborts are swallowed by the hook and never surface as errors. `POST` is **not** aborted on unmount, because the server may already have created the session. A late success still triggers the workspace `refresh()`. |
| Stale responses | Each hook ignores a response whose request key (filters or id) no longer matches the current key, even if the abort did not happen in time. |
| Retries | There are no automatic retries. GET states expose a user-initiated `retry()`. `POST` is never retried automatically, because the contract gives no idempotency. The user can resubmit after a failure. |
| Deduplication | `useCreateSession` blocks a second submit while pending, using both a state flag and a synchronous in-flight ref. No idempotency key is sent. |
| Caching | None. Details are always fetched for the opened id and are never seeded from the list summary, which keeps a single source of truth. Coaches are fetched each time the create route mounts. |
| Invalidation | After a `201`, the create route calls the workspace `refresh()`, which re-runs `GET /api/sessions` with the current filters. |
| Timeout | There is no client timeout. The mock is local, and the contract defines none. A real backend could add one in `http.ts` without touching any callers. |
| Auth and permissions | None. The optional read-only mode is not implemented. |

### Failure normalization in `http.ts`

| Transport outcome | `ApiError` produced | Notes |
| --- | --- | --- |
| Non-2xx with a parseable `ApiErrorBody` | `status`, plus `code`, `message`, and `fieldErrors` from the body | Covers every contract error code |
| Non-2xx with no or invalid JSON body | `status`, `HTTP_ERROR`, and a generic message | The UI never shows the raw body |
| `fetch` rejects with `AbortError` | Re-thrown unchanged | The hook ignores it |
| `fetch` rejects otherwise, for example offline or worker not ready | `0`, `NETWORK_ERROR` | Shown as "can't reach the server" with a retry |
| 2xx with a body that is not JSON, or a bad timestamp | `MALFORMED_RESPONSE` | Rendered as the generic failure state for that request |

User-facing copy is chosen by the UI for each request and code. The server `message` may be shown as supporting text, because it contains no sensitive data. Stack traces and raw responses are never rendered.

### `fieldErrors` mapping

This mapping is used in `features/sessions/create/`.

| `fieldErrors` key | Form control(s) |
| --- | --- |
| `title` | Title |
| `type` | Session type |
| `startsAt` | Date and start time. Shown once, on the date and time group. |
| `durationMinutes` | Duration |
| `coachId` | Coach |
| `locationName` | Location name |
| `locationAddress` | Location address |
| `capacity` | Capacity |
| `visibility` | Visibility |
| `description` | Description |
| `trainerNotes` | Trainer notes |
| *any other key* | Form-level error list |

## Frontend States And Errors

`AC` refers to the acceptance criteria in `requirements.md`. Every recovery keeps the application shell and the list usable.

| Request | Outcome | Client signal | User-visible state | Recovery | Scenario or test trigger | AC |
| --- | --- | --- | --- | --- | --- | --- |
| `GET /api/sessions` (first load) | pending | `status: loading`, no data | Initial loading, announced politely | — | any scenario (250 ms) / test with delayed handler | AC-4.1 |
| `GET /api/sessions` | `200`, total > 0 | `success`, items | Populated list or table, with a result count | — | `normal` | AC-4.2 |
| `GET /api/sessions` | `200`, total 0, **no** active filters | `success`, empty | "No sessions yet", with a create action | Create session | `empty` | AC-4.3 |
| `GET /api/sessions` | `200`, total 0, **with** active filters | `success`, empty, `hasActiveFilters` | "No sessions match …", distinct from the empty state | Clear filters | `normal` with `?query=zzz` | AC-4.4 |
| `GET /api/sessions` (refetch after a filter change or refresh) | pending | `success` plus `isRefreshing` | Previous results stay visible with a non-blocking "Updating" indicator | — | any filter change | AC-1.4, AC-1.5 |
| `GET /api/sessions` | `500 SESSIONS_UNAVAILABLE` | `error`, `ApiError` | List error region, with the filters still visible | Retry; filters stay editable | `list-error` | AC-4.5 |
| `GET /api/sessions` | `400 INVALID_FILTER` | `error` | List error, "These filters can't be applied" | Clear filters and retry | test override only (AI-6) | AC-4.5 |
| `GET /api/sessions` | `NETWORK_ERROR`, `HTTP_ERROR`, or `MALFORMED_RESPONSE` | `error` | Generic list error | Retry | test override only | AC-4.5 |
| `GET /api/sessions/:id` | pending | `loading` | Details loading inside the details region. The list behind stays visible. | Close or back | any | AC-2.1 |
| `GET /api/sessions/:id` | `200` | `success`, `SessionDetail` | Full details. A `null` description or notes shows "None provided". A cancellation shows its reason and time. | Close or back to the list with filters preserved | `normal` | AC-2.1–AC-2.5, AC-2.8 |
| `GET /api/sessions/:id` | `500 SESSION_DETAILS_UNAVAILABLE` | `error` | "Session details can't be loaded", inside the details region | Retry; back to the list | `details-error`, open `ses_101` | AC-2.9, AC-4.6 |
| `GET /api/sessions/:id` | `404 SESSION_NOT_FOUND` | `error`, `code` 404 | "This session no longer exists", with no retry | Back to the list | `/sessions/ses_unknown` in any scenario | AC-2.9 |
| `GET /api/sessions/:id` | network, HTTP, or malformed | `error` | Generic details error | Retry; back | test override only | AC-2.9 |
| `GET /api/coaches` | pending | `loading` | Coach control in a loading state. Submit is disabled with the reason stated. | — | any | AC-3.2 |
| `GET /api/coaches` | `200` | `success`, `Coach[]` | Coach select populated | — | `normal` | AC-3.2 |
| `GET /api/coaches` | `200`, `data: []` | `success`, empty | "No coaches available". Submit is unavailable. | — | test override only | AC-3.11 |
| `GET /api/coaches` | `500 COACHES_UNAVAILABLE` or other error | `error` | Inline error at the coach field. Other fields stay editable and keep their values. Submit is unavailable, with the reason stated. | Retry loading coaches | `coaches-error` | AC-3.11, AC-4.7 |
| *client validation* | invalid input | `fieldErrors` (client) | Messages next to each field, with `aria-invalid` and `aria-describedby`. A summary or focus moves to the first invalid field. | Correct the input | any scenario | AC-3.3, AC-3.4, AC-4.8 |
| `POST /api/sessions` | pending | `status: pending` | Submit disabled with stable size, a "Creating…" label, and an announcement | — | any (250 ms) | AC-3.6, AC-4.8 |
| `POST /api/sessions` | `201` | `success`, `SessionDetail` | Success message that names the session, announced. The workspace refreshes. | Open the new session; create another | `normal` | AC-3.9, AC-4.8 |
| *after `201`*, refreshed list contains the id | — | derived | New session visible or highlighted in the list | Open it | `normal`, no filters | AC-3.10 |
| *after `201`*, refreshed list lacks the id | — | derived | "Created, but hidden by the current filters" | **Open new session** or **Clear filters** | `normal` with `?status=full`, then create | AC-3.10 |
| `POST /api/sessions` | `400 VALIDATION_FAILED` | `error` plus `fieldErrors` | Server messages on the mapped fields (see the mapping table). Unknown keys and `message` appear at form level. All values are preserved. | Correct and resubmit | test override; or the mock rejects a request the client allowed | AC-3.7 |
| `POST /api/sessions` | `500 CREATE_SESSION_FAILED` | `error` | Form-level error, announced. **All values are preserved.** Submit is re-enabled. | Resubmit | `create-error` | AC-3.8, AC-4.8 |
| `POST /api/sessions` | `NETWORK_ERROR` or `HTTP_ERROR` | `error` | Same as the `500` row, with "We couldn't reach the server" copy | Resubmit | test override only | AC-3.8 |
| Any route | render exception | — | `RootErrorBoundary` keeps the shell and offers a reload | Reload | — | — |

## Mocking And Tests

### Mock layer

The mock layer lives in `src/mocks/`. It is the only place that imports fixture JSON or knows scenario names.

| Module | Responsibility |
| --- | --- |
| `fixtures.ts` | Imports the five `session-details/*.json` files, `sessions.json` (used only for the seed order and membership), `coaches.json`, `mock-scenarios.json`, and `fixture-clock.json`, all read in place from `frontend-accelerator-assessment/fixtures/`. |
| `clock.ts` | A pure `rebaseIso(iso, offsetMs)` and `rebaseSessionDetails(record, offsetMs)`, which shift `startsAt`, `createdAt`, `updatedAt`, and `cancellation.cancelledAt`. The offset is `now.getTime() - Date.parse(referenceNow)`. |
| `db.ts` | `createMockDb({ now, seed: 'fixtures' \| 'empty' })`. It holds **one** ordered store of `SessionDetails`. List rows are the summary projection of each record, which matches `sessions.json` exactly as the comparison above showed. The module provides `list({ query, status })` (AI-1, AI-5), `get(id)`, `create(request)` (AI-3, AI-4, AI-9), and `coaches()`. The store is in memory only and resets on reload. |
| `scenarios.ts` | `type ScenarioName` for the six required names. `resolveScenario(search)` reads `?scenario=`. An unknown or missing value falls back to `normal` with a `console.info`. The module also returns each scenario's override responses from `mock-scenarios.json`. |
| `handlers.ts` | `createHandlers({ db, scenario, latencyMs })` returns MSW `http.*` handlers for the four required endpoints. Scenario branching lives **only** here: `list-error`, `details-error` (only for `targetSessionId`), `coaches-error`, and `create-error` return the scenario's `status` and `body`. `empty` is handled by `seed: 'empty'` (AI-10). |
| `browser.ts` | `startMockWorker()` resolves the scenario from `location.search`, builds the db with `new Date()`, and calls `setupWorker(...handlers).start({ onUnhandledRequest: 'bypass' })`. It is imported dynamically by `main.tsx` unless `VITE_API_MOCKING === 'off'`. |
| `node.ts` | `createTestServer({ scenario?, now })` for Vitest. It uses `setupServer` with `latencyMs: 0` and `onUnhandledRequest: 'error'`. |

### Scenario selection

Scenarios are selected in the browser and are part of the evidence protocol §7.

| Scenario | URL to load |
| --- | --- |
| `normal` | `/sessions` (default) |
| `empty` | `/sessions?scenario=empty` |
| `list-error` | `/sessions?scenario=list-error` |
| `details-error` | `/sessions?scenario=details-error`, then open "U14 Shooting Lab", or deep-link to `/sessions/ses_101?scenario=details-error` |
| `coaches-error` | `/sessions/new?scenario=coaches-error` |
| `create-error` | `/sessions/new?scenario=create-error` |

Filter writes preserve `scenario` (architecture D2), so a reload keeps the selected scenario.

### Tests

Tests use Vitest, Testing Library, jsdom, and `msw/node`, and follow architecture D4.

- **Clock:** `vi.useFakeTimers({ toFake: ['Date'] })` and `vi.setSystemTime(FIXED_NOW)`. The same `FIXED_NOW` is passed to `createMockDb`, so the rebased fixtures and the "future start" validation agree.
- **Isolation:** each test gets a fresh db and handlers. `server.resetHandlers()` runs after each test.
- **Behavior tests** cover requirements AC-8.1. Each one renders the app routes in a `MemoryRouter`, and assertions are made on roles, labels, text, and live regions.

| Area | What the test does |
| --- | --- |
| Loading | Delay the list handler and assert that the loading status appears, then the populated rows. |
| Search and status | Type the coach name "Maya", then assert that only `ses_101` and `ses_103` remain. Set status to cancelled, then assert that only "Weekend Ball Handling" remains. The count is taken from `meta.total`. |
| Empty and no matches | With `seed: 'empty'`, assert the "no sessions" message. With `?query=zzz`, assert a distinct no-matches message and that clear filters restores the rows. |
| Request error | `list-error`: assert the error and that retry recovers after `server.use(normal)`. Optionally also cover `details-error`. |
| Create validation and success | Submit an empty form and assert the field errors and their association. Fill valid values, submit, then assert pending prevention (one request), the success announcement, and the new session in the list. |
| Create failure | With `create-error`, assert the form-level error and that **all entered values are still present**. |

- **Optional unit tests**, added if the plan includes them: `rebaseIso`, `db.list` filtering and `meta.total`, the `http.ts` normalization table, and the `fieldErrors` mapping. These are cheap, pure, and high-value for the mock boundary.

## Questions For Backend Owner

The evaluator is the contract authority. None of these questions blocks the required scope. Each has a documented assumption that applies until the evaluator answers.

1. Should location search also match `location.address`? (AI-1)
2. What `status`, `bookedCount`, and id format should a created session have? (AI-3)
3. Should the server sort the list, for example by `startsAt`? (AI-5)
4. Are `fieldErrors` keys guaranteed to equal `CreateSessionRequest` property names? (AI-8)
5. Should the `empty` scenario stay empty after a create, or reflect created sessions? (AI-10)

## Living Spec

`specs/api-integration.md` is **not** written. These are planned decisions, not verified implementation truth. `docs-generator` records them after verification.
