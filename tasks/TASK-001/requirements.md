# TASK-001: Training Sessions Workspace

Source: `frontend-accelerator-assessment/FRONTEND_ASSESSMENT_SPEC.md`, with `API_CONTRACT.md`, `MOCKING_GUIDE.md`, `EVIDENCE_PROTOCOL.md`, `EVALUATION_RUBRIC.md`, `designs/DESIGN_TOKENS.md`, and `fixtures/*` as supporting inputs.

## Goal

Deliver one frontend vertical slice that lets a training-business operator find, inspect, and create scheduled training sessions against a fixed API contract served by MSW, behind a client boundary that a real backend can replace without rewriting presentation components.

## Users And Outcome

- **User:** a busy basketball trainer running several programs across multiple coaches and locations, currently split across a calendar, spreadsheets, and chat.
- **Problem:** no single place to scan scheduled work, answer capacity questions, and create sessions; cancelled and recently completed sessions are hard to see.
- **Outcome:** one operational workspace optimized for fast scanning and predictable repeated actions, not decorative presentation.

## Acceptance Criteria

### AC-1 Sessions workspace (list)

- [ ] AC-1.1 A navigable sessions view exists and loads data from `GET /api/sessions`.
- [ ] AC-1.2 Each session shows title, type, status, start time, duration, coach, location, capacity, and booked count.
- [ ] AC-1.3 Start time is displayed in the user's local timezone.
- [ ] AC-1.4 The user can search by session title, coach name, or location. The search is sent as `query` and applied by the MSW handler, not by client-side filtering of the full list.
- [ ] AC-1.5 The user can filter by exactly one status (`scheduled`, `full`, `cancelled`, `completed`). It is sent as `status` and applied by the handler.
- [ ] AC-1.6 A single clear action resets every active filter (search and status) and restores the unfiltered list.
- [ ] AC-1.7 Scheduled, full, cancelled, and completed sessions are distinguishable by visible text or a familiar symbol, not by color alone.
- [ ] AC-1.8 Opening a session preserves the current list context: after the user returns, the search text, status filter, and the user's place in the list are unchanged.

### AC-2 Session details

- [ ] AC-2.1 Opening a session loads `GET /api/sessions/:sessionId` and displays all list information (AC-1.2).
- [ ] AC-2.2 Details also show the description and trainer notes, with a clear representation when either is `null`.
- [ ] AC-2.3 Details show a capacity summary (booked vs capacity, and remaining or full).
- [ ] AC-2.4 Details show a coach contact summary (name and email).
- [ ] AC-2.5 Details show created and last-updated timestamps in the user's local timezone.
- [ ] AC-2.6 The details experience (route, drawer, or modal) is fully keyboard operable, including opening, moving focus into it, and closing or returning.
- [ ] AC-2.7 Details are deep-linkable when the chosen routing approach permits it. A deep link loads the correct session on a fresh page load.
- [ ] AC-2.8 Leaving details returns the user to the previous list state (AC-1.8), and focus returns to a sensible element.
- [ ] AC-2.9 A failed details request (`500 SESSION_DETAILS_UNAVAILABLE`) shows a useful error with a retry and a way back to the list. A `404 SESSION_NOT_FOUND` shows a distinct "session no longer exists" message with a way back.

### AC-3 Create session

- [ ] AC-3.1 A create form provides title, session type, date, start time, duration, coach, location name, location address, capacity, visibility, optional description, and optional trainer notes.
- [ ] AC-3.2 Coach choices come from `GET /api/coaches`.
- [ ] AC-3.3 Client validation rejects each invalid value with a field-level message:
  - title: 3 to 80 characters after trimming;
  - date and start time: must resolve to a start in the future in the user's local timezone;
  - duration: integer from 30 to 240 minutes;
  - capacity: integer from 1 to 100;
  - coach: required;
  - location name: 2 to 80 characters after trimming;
  - location address: 3 to 120 characters after trimming;
  - trainer notes: at most 500 characters.
- [ ] AC-3.4 Field errors appear next to their controls and are programmatically associated with them (for example `aria-describedby` and `aria-invalid`). On a failed submit, focus or an announcement directs the user to the errors.
- [ ] AC-3.5 The submitted request matches `CreateSessionRequest`: `startsAt` is an ISO 8601 UTC string built from the local date and time, and numeric fields are numbers.
- [ ] AC-3.6 While a submission is pending, a second submission is impossible (for example via a disabled or guarded submit), and the pending state is visible and announced. The submit control keeps stable dimensions.
- [ ] AC-3.7 A `400 VALIDATION_FAILED` response maps its `fieldErrors` onto the matching controls. Any error that does not map to a field is shown as a form-level error.
- [ ] AC-3.8 A `500 CREATE_SESSION_FAILED` response shows a useful form-level error, keeps every entered value intact, and lets the user retry.
- [ ] AC-3.9 Success is explicit and announced. The user never has to guess whether creation worked.
- [ ] AC-3.10 After success, the created session can be found in the workspace. The mock returns it from later list and details reads. If the active search or status filter would hide it, the user gets a clear action to open the new session or to reset the filters that hide it.
- [ ] AC-3.11 If `GET /api/coaches` fails (`500 COACHES_UNAVAILABLE`), the form shows the failure and a retry. It must not offer submission as if a valid coach could be selected.

### AC-4 Required UI states

Each state is observable in the browser and reachable deterministically:

- [ ] AC-4.1 Initial loading of the list.
- [ ] AC-4.2 Populated result.
- [ ] AC-4.3 No sessions exist (`empty` scenario), with a message distinct from AC-4.4.
- [ ] AC-4.4 Filters produce no matches, with a message and a clear-filters recovery.
- [ ] AC-4.5 List request fails (`list-error`), with a useful error and a retry.
- [ ] AC-4.6 Details request fails (`details-error`, targeting `ses_101`).
- [ ] AC-4.7 Coaches request fails (`coaches-error`).
- [ ] AC-4.8 Create pending, success, validation failure, and server failure (`create-error`).

### AC-5 Mock API and boundary

- [ ] AC-5.1 MSW (`msw@2.14.6`) implements `GET /api/sessions`, `GET /api/sessions/:sessionId`, `GET /api/coaches`, and `POST /api/sessions` exactly as specified in `API_CONTRACT.md`. No endpoints are invented and no response shapes change.
- [ ] AC-5.2 The list handler applies case-insensitive `query` across title, coach name, and location, plus an exact `status` match, before it computes `meta.total`. It keeps `page: 1` and `pageSize: 10`.
- [ ] AC-5.3 The create handler validates its input: required fields, a known `coachId`, positive duration and capacity, supported enum values, and a valid ISO timestamp. Failures return `400 VALIDATION_FAILED` with `fieldErrors`. On success it returns `201` with a generated id and timestamps, the normalized submitted values, and the coach from `coaches.json`. The new session is stored in memory and appears in later list and details reads.
- [ ] AC-5.4 The required scenarios `normal`, `empty`, `list-error`, `details-error`, `coaches-error`, and `create-error` are selectable at the mock boundary. Presentation components and the API client never branch on scenario names.
- [ ] AC-5.5 At mock startup, every fixture `startsAt`, `createdAt`, `updatedAt`, and `cancelledAt` is shifted by `now - referenceNow` (`2026-07-27T12:00:00Z`). The API client and components see only ordinary ISO 8601 UTC strings. Tests freeze the clock and apply the same transformation.
- [ ] AC-5.6 Components contain no scattered raw transport calls. Application code does not import fixture JSON directly. Dates are parsed and normalized at one clear boundary.
- [ ] AC-5.7 Server and request state each have one deliberate owner, with no duplicated source of truth.
- [ ] AC-5.8 The app runs with mocked responses and without network access.

### AC-6 Responsive behavior

- [ ] AC-6.1 At 1440 x 900 the layout supports comparing sessions and repeating actions.
- [ ] AC-6.2 At 390 x 844 the list uses a representation that is easy to scan. No content or action is unreachable or overlapping, and the page never scrolls horizontally.
- [ ] AC-6.3 Mobile touch targets are at least 44px. Controls are at least 40px tall.

### AC-7 Accessibility

- [ ] AC-7.1 Every flow (list, search, filter, clear, open and close details, create, retry) can be completed with the keyboard alone.
- [ ] AC-7.2 Focus states are visible: an outline of at least 2px with an offset.
- [ ] AC-7.3 Controls are semantic and labeled. Page and section headings are useful.
- [ ] AC-7.4 Validation errors are programmatically associated with their fields.
- [ ] AC-7.5 Loading results, result counts or changes, and mutation pending, success, and failure are announced through appropriate live regions or focus management.
- [ ] AC-7.6 Text and controls have sufficient contrast. Any motion is disabled under `prefers-reduced-motion`.

### AC-8 Automated tests

- [ ] AC-8.1 Behavior-level tests (roughly four to six) cover:
  - search and status filtering;
  - create validation and successful submission;
  - preservation of input after a create server failure;
  - initial loading;
  - no sessions, and filters with no matches;
  - at least one list or details request error.
- [ ] AC-8.2 The tests run with a documented project command and pass.

### AC-9 Delivery and evidence (process, not product behavior)

- [ ] AC-9.1 The app starts with a documented project command.
- [ ] AC-9.2 `tasks/TASK-001/` contains every artifact listed in `EVIDENCE_PROTOCOL.md` §1. Architecture, API, and UI decisions plus the implementation plan exist before `coder` starts, and the ordering is evidenced per §2.
- [ ] AC-9.3 Browser evidence covers the §6 matrix at both viewports, with console, page-error, and network observations. No uncaught console errors occur during the primary flows.

## Constraints

- React 19, TypeScript 5.9 or newer, Vite 7 or newer, npm, and `msw@2.14.6`.
- Frontend only. The API contract is fixed. Proposed contract changes must be recorded separately and need evaluator approval.
- `frontend-accelerator-assessment/` must remain unchanged.
- Do not rewrite unrelated source or configuration. Every added dependency needs a recorded reason and trade-off. Do not add a data library merely because the React rules mention data patterns.
- Visual direction: `designs/DESIGN_TOKENS.md` sets the palette, spacing, and type. `sessions-dashboard-reference.svg` shows hierarchy and density only. Avoid marketing composition, hero sections, decorative gradients, and cards nested inside cards.
- Centralizing UI copy is optional. i18n is out of scope.
- No secrets, real personal data, analytics, or production credentials.
- Manual role selection with the STOP contract. Agents never chain the next role.

## Non-Goals

- Backend implementation, authentication, payments, and real notifications.
- Drag-and-drop calendar scheduling, recurring rules, attendee management, and organization administration.
- Deployment or public hosting.
- Optional extensions are deferred unless explicitly selected later: session-type filter, URL-synced filters, pagination, cancellation (403/409), read-only permission, background refresh, tablet verification, `create-conflict` and the other optional scenarios, optimistic updates, extra tests, and calendar or saved-filter views. They do not compensate for missing required behavior.

## Facts

- Repository root and the only frontend application candidate: `client/`, a Vite + React + TS template with only `App.tsx`, `main.tsx`, and CSS.
- `package.json` declares `react ^19.3.1`, `typescript ~7.0.2`, `vite ^8.3.4`, `@vitejs/plugin-react ^6.1.2`, and `oxlint`. These versions satisfy the stack constraints.
- `msw` is declared as `"^2.14.6"` under `dependencies`. `public/mockServiceWorker.js` is staged and `package.json` has `msw.workerDirectory: ["public"]`.
- No test runner, testing library, or router is installed. Scripts are `dev`, `build`, `lint`, and `preview`, with no `test` script.
- Fixtures contain five sessions, one or more per status:
  - `ses_101`: scheduled, 14/18 booked;
  - `ses_102`: full, 24/24;
  - `ses_103`: scheduled, private, 0/1;
  - `ses_104`: cancelled, with a `cancellation` object;
  - `ses_105`: completed, with a start in the past relative to `referenceNow`.
- There are three coaches, `coach_01` to `coach_03`. `coach_03` (Lena Ortiz) has only a cancelled session.
- The `details-error` scenario targets only `ses_101`. The `normal` scenario specifies `defaultLatencyMs: 250`.
- `SessionDetails.cancellation` exists in the contract but is not a required display field.

## Assumptions

Each assumption should be confirmed or overridden by the named owner.

- A1: "Location" in search means the location name; matching on the address too is harmless. Owner: `api-integration`.
- A2: The server-provided `status` is authoritative. The UI does not derive "full" from `bookedCount`/`capacity`. Owner: `api-integration`.
- A3: A created session returns `status: "scheduled"`, `bookedCount: 0`, and `cancellation: null`. The contract does not specify these. Owner: `api-integration`.
- A4: The client trims text fields before sending, and sends empty optional description and notes as `null`. Owner: `api-integration`.
- A5: The description has no client length limit, because the spec defines none. Owner: product (evaluator).
- A6: Showing cancellation reason and time for cancelled sessions is welcome but not required. Owner: `ui-designer`.
- A7: List order follows the server response. The client does not re-sort. Owner: `api-integration` and `ui-designer`.
- A8: `400 INVALID_FILTER` is shown through the same recovery path as a list failure. Owner: `api-integration`.

## Open Questions

Each question is routed to the specialist that owns the gap.

- Q1 (architect): Is details a dedicated route, a drawer, or a modal? Does the app need a router dependency? How are list context and deep links preserved?
- Q2 (architect): Who owns server and request state (plain React state and context versus a data library), and how are refetches after create and stale-response races handled?
- Q3 (architect): Which test stack (for example Vitest, Testing Library, and MSW in Node) is added, with a recorded reason and trade-off? How are frozen-clock tests wired?
- Q4 (architect and api-integration): How is a mock scenario selected (for example a dev-only query parameter or env flag read only by the mock bootstrap), and how is it kept out of presentation code?
- Q5 (api-integration): What is the client module shape, the error normalization (`ApiError` mapped to a typed result), the date parsing and formatting boundary, and the mapping of `fieldErrors` keys to form fields? This covers A1 to A4, A7, and A8.
- Q6 (ui-designer): What is the desktop table versus mobile scan representation, the status indicator form, the details layout, the create form placement (page, panel, or dialog), the success and "hidden by filters" affordance, the live-region strategy, and the default values for type, visibility, and duration?
- Q7 (developer): Should `msw` be pinned exactly to `2.14.6` and moved to `devDependencies`, as `MOCKING_GUIDE.md` shows (`--save-dev msw@2.14.6`)? The current declaration is `^2.14.6` under `dependencies`.
- Q8 (developer): Should search run as the user types (debounced) or on explicit submit? This is a product preference that `ui-designer` may decide if the developer does not.

## Readiness

The requirements are complete for the required scope. They are **not yet ready for `writing-plans`**: architecture (Q1 to Q4), API boundary (Q4, Q5), and UI (Q6) decisions must be recorded first.

Recommended next role, to be selected manually: `architect`, then `api-integration`, then `ui-designer`, then `writing-plans`. `brainstorm` is not needed because product scope is unambiguous.
