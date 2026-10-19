# TASK-001: Implementation Plan

Sources:
- `requirements.md` (AC-1 to AC-9);
- `architecture.md` (D1–D8);
- `api-integration.md` (AI-1 to AI-13, the module tables, and the state and error matrix);
- `ui-design.md` (layout, the state matrix, responsive and accessibility rules).

Every specialist decision this plan depends on is resolved. No open item blocks implementation.

Application root: `client/`, the repository root and the only frontend app.

## Current Behavior

`src/` is the Vite template:
- `main.tsx` renders `App` with a counter and links;
- the styles are `App.css` and `index.css`;
- the template assets are `src/assets/*` and `public/icons.svg`.

The project has no router, no API client, no MSW handlers (only `public/mockServiceWorker.js` and the `msw@2.14.6` package), and no tests or test runner. The scripts are `dev`, `build` (`tsc -b && vite build`), `lint` (`oxlint`), and `preview`.

## Intended Behavior

The app opens a **Training sessions workspace** at `/sessions`.

The MSW mock API implements the contract with the six required scenarios, selected by `?scenario=`. Fixture timestamps are rebased at startup.

The workspace:
- lists sessions with search and a status filter held in the URL, plus clear filters;
- distinguishes the four statuses by text and symbol;
- opens details (`/sessions/:id`) and create (`/sessions/new`) as child routes in a responsive panel, so the list context is preserved;
- validates and submits the create form with pending, success, and failure handling;
- shows a success banner that keeps the new session discoverable even when filters hide it.

Six behavior tests run with `npm test`.

## Verified Repository Facts Used By This Plan

- **JSON imports from outside `src/`** compile under the current `tsconfig.app.json` with no config change. This was checked in an isolated scratch copy of the config: importing `../fx/x.json` gave `tsc` exit 0. JSON values widen to `string` and `number`, so `src/mocks/fixtures.ts` must narrow them to the contract types.
- `tsconfig.node.json` includes only `vite.config.ts` with `types: ["node"]`. A `test` block in `vite.config.ts` is type-checked there.
- `erasableSyntaxOnly` forbids `enum` and parameter properties. Use string-literal unions and `as const` arrays, and assign class fields explicitly.
- **jsdom has no `window.matchMedia`** and no reliable `HTMLDialogElement.showModal`. The tests therefore stub `matchMedia` to report desktop (≥ 1024px), so the panel renders inline as a non-modal `<section>` and `showModal` is never called in tests.

## Dependency Changes

These were approved in `architecture.md` D1 and D4.

| Command | Purpose | Trade-off to record in the final report |
| --- | --- | --- |
| `npm install react-router@^8.4.0` | Routes, nested panel routes, and URL search params | One runtime dependency, in exchange for deep links and back/forward without a custom router |
| `npm install -D vitest@^5.0.5 jsdom@^30.1.3 @testing-library/react@^16.3.3 @testing-library/dom@^10 @testing-library/user-event@^14.6.8 @testing-library/jest-dom@^7.0.1` | Behavior tests that reuse the Vite transform and MSW handlers | Dev-only. jsdom is less faithful than a real browser, and `browser-verify` covers that gap. |

`msw` stays as it is: `^2.14.6`, resolved to `2.14.6`. Moving it is an open developer question (requirements Q7) and is **not** part of this plan.

## File Plan

Legend: **C** = create, **M** = modify, **D** = delete. The paths are relative to `client/`.

### 0. Configuration and template cleanup

| Action | File | Change |
| --- | --- | --- |
| M | `package.json` | Add the dependencies above and the script `"test": "vitest run"`. No other script changes. |
| M | `vite.config.ts` | Import `defineConfig` from `vitest/config`. Add `test: { environment: 'jsdom', setupFiles: ['./src/test/setup.ts'], restoreMocks: true }`. The React plugin is unchanged. |
| M | `index.html` | Set `<title>Training sessions · Courtside</title>` and add `<meta name="theme-color" content="#F5F7F8">`. |
| D | `src/App.tsx`, `src/App.css`, `src/assets/hero.png`, `src/assets/react.svg`, `src/assets/vite.svg` | Template content, replaced by the app shell. |
| — | `public/icons.svg`, `public/favicon.svg` | **Leave untouched.** They are not referenced after cleanup but are harmless, and the change stays minimal. |

### 1. Contract and domain types

| Action | File | Responsibility |
| --- | --- | --- |
| C | `src/api/contract.ts` | The DTOs from `API_CONTRACT.md`, verbatim. `SESSION_TYPES`, `SESSION_STATUSES`, and `VISIBILITIES` as `as const` arrays, with types derived from them. `ApiErrorBody`. |
| C | `src/features/sessions/model/types.ts` | Domain `Session`, `SessionDetail`, `Coach`, `SessionsPage`, and `SessionFilters { query: string; status: SessionStatus \| '' }`. These have `Date` fields, as described under "Domain model" in `api-integration.md`. |
| C | `src/features/sessions/model/status.ts` | `STATUS_META: Record<SessionStatus, { label; symbol }>` with ◷ Scheduled, ● Full, ✕ Cancelled, and ✓ Completed. |
| C | `src/features/sessions/model/filters.ts` | `parseFilters(URLSearchParams)`, which trims the query and drops an invalid status (D2). `applyFilters(params, next)`, which sets or deletes only `query` and `status` and preserves every other parameter, including `scenario`. `hasActiveFilters`. |
| C | `src/features/sessions/model/capacity.ts` | `remainingPlaces(session)` and `endsAt(session)`. Both are derived values, never stored. |

### 2. Mock API (`src/mocks/`)

This step depends on step 1. It can proceed **in parallel** with step 3.

| Action | File | Responsibility |
| --- | --- | --- |
| C | `src/mocks/fixtures.ts` | The **only** place that imports fixture JSON, read from `../../frontend-accelerator-assessment/fixtures/...`: the five details files, `sessions.json` (order only), `coaches.json`, `mock-scenarios.json`, and `fixture-clock.json`. Narrows the values to the contract types. |
| C | `src/mocks/clock.ts` | `fixtureOffsetMs(now)`, `rebaseIso(iso, offsetMs)`, and `rebaseSessionDetails(record, offsetMs)`. The last one covers `startsAt`, `createdAt`, `updatedAt`, and `cancellation.cancelledAt`. |
| C | `src/mocks/db.ts` | `createMockDb({ now, seed: 'fixtures' \| 'empty' })`. One ordered `SessionDetails[]` store. It provides `list({ query, status })` (AI-1, AI-5, `meta` with `page: 1`, `pageSize: 10`, and the filtered `total`), `get(id)`, `create(request)` (validation per AI-9, normalization per AI-4, defaults per AI-3, id `ses_1001` and up, coach from the fixture), and `coaches()`. |
| C | `src/mocks/scenarios.ts` | `REQUIRED_SCENARIOS`, `ScenarioName`, `resolveScenario(search)` (an unknown value falls back to `normal` with `console.info`), and `scenarioOverride(name)`, which returns `{ status, body, targetSessionId? }` from `mock-scenarios.json`. |
| C | `src/mocks/handlers.ts` | `createHandlers({ db, scenario, latencyMs })`, built with MSW `http` and `HttpResponse`. It covers the four endpoints, `400 INVALID_FILTER` (AI-6), `404 SESSION_NOT_FOUND` (AI-13), and the scenario overrides (AI-10, AI-11). Scenario branching exists **only** in this file. |
| C | `src/mocks/browser.ts` | `startMockWorker()`, which resolves the scenario from `location.search`, builds the db with `new Date()` and `seed` set by the scenario, and calls `setupWorker(...).start({ onUnhandledRequest: 'bypass' })`. |
| C | `src/mocks/node.ts` | `createTestServer({ scenario = 'normal', now })`. It uses `setupServer` with `latencyMs: 0` and exposes `server` and `db`. |

### 3. API client (`src/api/`)

This step depends on step 1.

| Action | File | Responsibility |
| --- | --- | --- |
| C | `src/api/errors.ts` | `ApiError` (with `status`, `code`, `message`, and `fieldErrors?`), `ApiErrorCode`, and `isApiError`. |
| C | `src/api/http.ts` | `request<T>(path, { method, query, body, signal })`. This is the **only `fetch` call site**. It omits empty query values (AI-7) and applies the failure normalization table from `api-integration.md`. An `AbortError` is re-thrown unchanged. |
| C | `src/api/mappers.ts` | `toSession`, `toSessionDetail`, and `toSessionsPage`. Dates are parsed here, and an invalid date throws `MALFORMED_RESPONSE`. |
| C | `src/api/sessions.ts` | `listSessions(filters, signal)`, `getSession(id, signal)` (with `encodeURIComponent`), and `createSession(request)`. |
| C | `src/api/coaches.ts` | `listCoaches(signal)`. |

### 4. Shared utilities (`src/shared/`)

Each of these has two or more real callers, as D5 requires.

| Action | File | Responsibility and callers |
| --- | --- | --- |
| C | `src/shared/format.ts` | `formatShortStart`, `formatFullStartRange` (includes the timezone name), `formatTimestamp`, and `localTimeZoneName()`. Built with `Intl.DateTimeFormat` and the user's locale. Callers: table, cards, details, form helper text. |
| C | `src/shared/useRemoteResource.ts` | `useRemoteResource<T>(key, load: (signal) => Promise<T>)`, which returns `{ status: 'loading' \| 'success' \| 'error', data?, error?, isRefreshing, retry }`. It aborts the previous request when the key changes or the component unmounts, ignores stale responses, swallows `AbortError`, and keeps previous data during a refetch. Callers: list, details, coaches. |
| C | `src/shared/useMediaQuery.ts` | `useMediaQuery(query)` built on `useSyncExternalStore` over `matchMedia`. Callers: the list (table or cards) and `Panel` (inline, drawer, or sheet). |
| C | `src/shared/useDebouncedCallback.ts` | Debounces search commits (300 ms). Callers: the filters, plus the trainer-notes counter if the plan's implementer finds that useful. Otherwise keep it local to `list/`. |

### 5. Feature UI primitives (`src/features/sessions/ui/`)

These follow `ui-design.md`'s reuse candidates. They live in the feature-level `ui/` folder, which every subfolder may import, the same way as `model/`.

| Action | File | Responsibility |
| --- | --- | --- |
| C | `StatusBadge.tsx` | Symbol (`aria-hidden`) plus text label, using a class for each status. |
| C | `Panel.tsx` | Compound component: `Panel`, `Panel.Header` (eyebrow, `h2` with `tabIndex={-1}`, close button), `Panel.Body`, and `Panel.Footer`. The mode comes from `useMediaQuery`: at ≥ 1024px it renders a non-modal `<section aria-labelledby>` with an Escape key handler; below that, a `<dialog>` opened with `showModal()`, with `onCancel` routed to `onClose`. Focuses the heading on mount. `onClose` comes from the route, and the `ref` is passed as a prop (React 19). |
| C | `StateMessage.tsx` | A title (`h3`), body, and actions slot. `role` (`status` or `alert`) is passed explicitly. |
| C | `Field.tsx` | Label, control slot, hint, and error. It generates ids and supplies `aria-describedby` and `aria-invalid` to the control through a render prop or `cloneElement`-free props. |
| C | `src/features/sessions/sessions.css` | Feature styles: filter bar, table, cards, badges, panel modes (with `prefers-reduced-motion`), form, banner, skeleton rows. Uses only token variables. |

### 6. App shell, routes, and bootstrap

| Action | File | Responsibility |
| --- | --- | --- |
| M | `src/index.css` | Replaced. `:root` tokens from `DESIGN_TOKENS.md` (plus `--control-border: var(--text-muted)` and the badge and selected tints from `ui-design.md`), base typography, a `:focus-visible` ring, a `.visually-hidden` utility, the skip-link style, page padding of 24px or 16px, and `overflow-x: clip` as a safety net only. |
| M | `src/main.tsx` | `async function enableMocking()`, which returns early when `import.meta.env.VITE_API_MOCKING === 'off'` and otherwise does `await (await import('./mocks/browser')).startMockWorker()`. Then it renders `<StrictMode><App/></StrictMode>`. |
| C | `src/app/App.tsx` | `<RootErrorBoundary><BrowserRouter><AppRoutes/></BrowserRouter></RootErrorBoundary>`. |
| C | `src/app/AppRoutes.tsx` | The route table from D1. `/` redirects to `/sessions` and keeps the search string. Kept separate so tests can render it inside a `MemoryRouter`. |
| C | `src/app/AppShell.tsx` | Skip link, top bar (`Courtside` and `<nav aria-label="Primary">` with Sessions marked `aria-current="page"`), `<main id="main">`, and `<Outlet/>`. |
| C | `src/app/RootErrorBoundary.tsx` | A class boundary that renders "Something went wrong" and a Reload button. Fields are assigned explicitly, with no parameter properties. |
| C | `src/app/NotFound.tsx` | "Page not found" and a link to `/sessions`. |

### 7. List feature (`src/features/sessions/list/`)

| Action | File | Responsibility |
| --- | --- | --- |
| C | `useSessionsList.ts` | `useRemoteResource` keyed by `query`, `status`, and a reload token. Exposes `refresh(): void`. |
| C | `workspaceContext.ts` | The type `WorkspaceOutletContext { filtersSearch: string; refresh(): void; onCreated(detail: SessionDetail): void }` and `useWorkspace()`, which wraps `useOutletContext`. |
| C | `SessionsWorkspace.tsx` | The layout route. It reads the URL filters and owns `useSessionsList`, the created banner state `{ id, title } \| null`, and the "last opened id" ref for focus restore. It renders the header (h1 and the Create link), `SessionFilters`, `CreatedBanner`, the list region with its `h2` count and the polite status region, the list body by state, and `<Outlet context=…/>`. When the child route closes, it focuses `#session-link-<id>` or the list heading. A filter change clears the banner. |
| C | `SessionFilters.tsx` | A search draft input (debounced commit, Enter commits immediately), the Status select, and a Clear filters button shown only when filters are active, which focuses the search input. Writes go through `applyFilters` with `replace: true`. |
| C | `SessionsTable.tsx` | A semantic `<table>` with the columns from `ui-design.md`. Each title is a `<Link id="session-link-<id>">` with a stretched `::after`. The selected row gets `aria-current="true"`, and a new row gets a "New" tag. |
| C | `SessionCards.tsx` | `<ul>` cards for widths below 768px, with the same link, id, and stretched target. |
| C | `ListStates.tsx` | `ListLoading` (skeleton rows and "Loading sessions…"), `NoSessions`, `NoMatches` (echoes the filters and offers Clear filters), and `ListError` (Try again, plus Clear filters when filters are active), all built on `StateMessage`. |
| C | `CreatedBanner.tsx` | Derives visibility as `items.some(id)`. While a refresh is in flight it shows a neutral message. Visible: "View session" and "Dismiss". Hidden: "Open session", "Clear filters", and "Dismiss". `role="status"`, focused when it appears. |

### 8. Details feature (`src/features/sessions/details/`)

| Action | File | Responsibility |
| --- | --- | --- |
| C | `useSessionDetails.ts` | `useRemoteResource` keyed by `sessionId`, calling `getSession`. |
| C | `SessionDetailsRoute.tsx` | Reads `:sessionId`, sets the document title, and renders `Panel` with loading, error (`500`: Try again and Back), not-found (`404`: Back only), or `SessionDetailsView`. `onClose` navigates to `/sessions` plus `filtersSearch`. |
| C | `SessionDetailsView.tsx` | The `<dl>` content, the description and notes (or "None provided"), the cancellation section, the capacity bar (`aria-hidden`), the created and updated footer, and "Back to sessions". |

### 9. Create feature (`src/features/sessions/create/`)

| Action | File | Responsibility |
| --- | --- | --- |
| C | `formValues.ts` | `CreateSessionValues` (all strings, matching the inputs), `INITIAL_VALUES` (type `training`, duration `60`, visibility `public`, everything else empty), and `CreateFieldName`. |
| C | `validation.ts` | `validateCreateSession(values, now): Partial<Record<CreateFieldName, string>>`, a pure function covering AC-3.3. The start is built as a local `new Date(y, m - 1, d, hh, mm)` and must be greater than `now`. Each error message names the fix. |
| C | `toRequest.ts` | `toCreateSessionRequest(values): CreateSessionRequest`. Trims text, sends empty optional values as `null`, `startsAt.toISOString()`, and `Number()` for numeric fields. |
| C | `serverFieldErrors.ts` | `mapServerFieldErrors(fieldErrors)`, which returns `{ byField, unmapped[] }` using the table in `api-integration.md`. |
| C | `useCoaches.ts` | `useRemoteResource` that calls `listCoaches`. Exposes `retry`. |
| C | `useCreateSession.ts` | `{ status, error, submit(request) }`, with a synchronous in-flight `useRef` guard and no abort on unmount. On success it calls `onSuccess(detail)`. |
| C | `CreateSessionForm.tsx` | Controlled values that are never reset on failure. Validation timing, focus on the first invalid control, the form-level alert, the pending button, the coach load, error, or empty states with submit disabled and the reason stated, the notes counter, and Cancel with a dirty-form `confirm`. |
| C | `CreateSessionRoute.tsx` | `Panel` plus `CreateSessionForm` and the document title. On success it calls `workspace.onCreated(detail)`, which records the banner and refreshes, then navigates to `/sessions` plus `filtersSearch`. |

### 10. Test infrastructure (`src/test/`)

| Action | File | Responsibility |
| --- | --- | --- |
| C | `src/test/setup.ts` | `import '@testing-library/jest-dom/vitest'`. Stubs `window.matchMedia` so `(min-width: 1024px)` and `(min-width: 768px)` both match, which means desktop. Runs `cleanup` after each test. |
| C | `src/test/clock.ts` | `FIXED_NOW = new Date('2026-07-27T12:00:00Z')`, equal to `referenceNow`, so the fixture offset is 0. `freezeClock()` calls `vi.useFakeTimers({ toFake: ['Date'] })` and `vi.setSystemTime(FIXED_NOW)`. `restoreClock()`. |
| C | `src/test/renderApp.tsx` | `renderApp({ path = '/sessions', scenario, seed })`. Builds `createTestServer({ scenario, now: FIXED_NOW })`, calls `server.listen({ onUnhandledRequest: 'error' })`, renders `<MemoryRouter initialEntries={[path]}><AppRoutes/></MemoryRouter>`, and returns `{ user: userEvent.setup(), server, db }`. Teardown is registered with `afterEach` through `server.close()`. |

## Essential Tests

These satisfy requirements AC-8.1. Tests assert on roles, labels, visible text, and live regions, never on hook internals.

| File | Test | Protects |
| --- | --- | --- |
| `src/features/sessions/list/SessionsWorkspace.test.tsx` | **Initial loading:** while the list handler is delayed through `server.use`, a "Loading sessions…" status appears. Then the "U14 Shooting Lab" row link appears. | AC-4.1, AC-4.2 |
| same file | **Search and status filter:** typing "maya" leaves exactly the `ses_101` and `ses_103` titles and the heading "2 sessions match". Selecting Status "Cancelled" after clearing leaves only "Weekend Ball Handling". "Clear filters" restores 5 rows. | AC-1.4–AC-1.6, AC-5.2 |
| same file | **No sessions versus no matches:** with the `empty` scenario, "No sessions yet" is shown. With the `normal` scenario at path `/sessions?query=zzz`, "No sessions match your filters" is shown together with a Clear filters button, and the "No sessions yet" text is absent. | AC-4.3, AC-4.4 |
| same file | **List request error:** the `list-error` scenario shows the alert "Sessions couldn't be loaded". After `server.resetHandlers` to `normal` and clicking "Try again", rows appear. | AC-4.5 |
| `src/features/sessions/create/CreateSession.test.tsx` | **Validation, then successful submit:** opening `/sessions/new` and submitting the empty form shows the title, start, capacity, coach, location name, and location address errors, each associated with its control (`toHaveAccessibleDescription`). Filling valid values and double-clicking submit sends exactly **one** POST (counted through a `server.events` listener). Afterwards the success banner with the title is shown and the new row link is in the list. | AC-3.3–AC-3.6, AC-3.9, AC-3.10 |
| same file | **Server failure keeps input:** in the `create-error` scenario, filling valid values and submitting shows the alert "The session couldn't be created", and every field still holds its entered value. | AC-3.8, AC-4.8 |

That is six tests, within the four-to-six target.

### Additional risk-based tests (optional, separate from the essential set)

- `src/mocks/db.test.ts`:
  - search matches title, coach, location name, and address case-insensitively;
  - `meta.total` reflects the filtered results;
  - a created record appears in `list` and `get`;
  - a `create` with an unknown `coachId` returns field errors.
- `src/mocks/clock.test.ts`: rebasing preserves relative order and shifts all four timestamp fields, including the nested `cancelledAt`.
- `src/features/sessions/create/validation.test.ts`: boundary values for the start in the past or future, durations 29, 30, 240, and 241, capacities 0, 1, 100, and 101, trimmed title lengths, and notes of 500 and 501 characters.
- A details-error test: `/sessions/ses_101` in the `details-error` scenario shows the alert with Try again and Back to sessions.
- A test that a created session is hidden by filters: create while `?status=full` and assert the "Open session" and "Clear filters" banner actions.

These go to `test-generator` if `code-reviewer` finds coverage gaps.

## Implementation Order

1. Step 0: install the dependencies and update `package.json`, `vite.config.ts`, and `index.html`. Delete the template files only in step 6, when `main.tsx` stops importing them.
2. Step 1: contract and domain types.
3. Steps 2 and 3 **in parallel**: the mocks and the API client. They share only `contract.ts`.
4. Step 4: shared utilities.
5. Step 5: feature UI primitives.
6. Step 6: app shell, routes, and bootstrap. The app now runs and shows an empty workspace frame.
7. Step 7: the list feature, plus the 4 list tests (with step 10's helpers written alongside the first test).
8. Steps 8 and 9 **in parallel**: details and create. The create tests come with step 9.
9. Final cleanup: delete the template files and confirm nothing imports them.

## Contracts Between Steps

- `features/*` and `app/` never import `src/mocks/` or fixture JSON. Only `src/api/http.ts` calls `fetch`.
- Feature subfolders `list`, `details`, and `create` do not import each other. They communicate only through `WorkspaceOutletContext` and route paths.
- Every child-route navigation back to the list uses `filtersSearch`, which is the current `location.search` and so includes `scenario`. Filter writes use `applyFilters`, which preserves non-filter parameters.
- `useRemoteResource` result shape: `status`, `data`, `error`, `isRefreshing`, `retry`. The list, details, and coaches hooks all rely on it.

## Verification Commands

These were discovered in `client/package.json`. `npm test` is added in step 0 as an approved decision.

| Command | Working directory | Expectation |
| --- | --- | --- |
| `npm test` | `client/` | All essential tests pass. |
| `npm run lint` | `client/` | `oxlint` reports no errors. |
| `npm run build` | `client/` | `tsc -b` and `vite build` succeed. |
| `npm run dev` | `client/` | Used for browser checks with `?scenario=` URLs. The URL is discovered from Vite's output, not assumed. |

## Rollback And Flags

- `VITE_API_MOCKING=off` disables MSW (D8). This is the only flag. It exists for backend replaceability, not for rollout.
- Rollback is a git revert to the pre-implementation commit `5eff466` plus this plan's checkpoint. No data migration is involved.

## Pre-Implementation Checkpoint

`EVIDENCE_PROTOCOL.md` §2 requires credible ordering evidence. Before `coder` starts, the developer should create a local Git checkpoint containing `tasks/TASK-001/` (requirements through this plan) and record its hash in `workflow-log.md`. This role does not create commits.
