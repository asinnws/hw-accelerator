# TASK-001: Architecture Decision

Inputs: `tasks/TASK-001/requirements.md` (open questions Q1–Q4), `frontend-accelerator-assessment/FRONTEND_ASSESSMENT_SPEC.md`, `API_CONTRACT.md`, `MOCKING_GUIDE.md`.

Rules applied:
- Common: `rulesets/common/architect/rules/frontend-boundaries.md` and `state-and-failure-flow.md`.
- Framework (React): the composition-patterns rules on state ownership, context interface, and React 19 APIs.
- Project: there is no `rulesets/project/architect` section, which is valid.

Documentation evidence: **degraded.** `toolchain/bin/ctx7.mjs` returned "Monthly quota exceeded". Version and peer compatibility were checked with `npm view` instead, which reads the npm registry as a primary source. No API-level claims below depend on library docs that were not consulted.

## Decision Needed

This document resolves only the architecture gaps that requirements routed to `architect`:

1. **Q1:** how details and create are presented as routes, how deep linking works, and how list context is preserved.
2. **Q2:** who owns server and request state, how a refresh after create works, and how stale-response races are handled.
3. **Q3:** which test stack to use and how a frozen clock is wired.
4. **Q4 (shared with `api-integration`):** where mock scenarios are selected and how they stay out of presentation code.

These are delegated to other roles and not decided here:

- **`api-integration`:** client module internals, error normalization shape, `fieldErrors` mapping, and assumptions A1–A4, A7, and A8.
- **`ui-designer`:** visual and interaction choices, including whether details renders as a drawer, modal, or panel, plus mobile layout, live-region copy, and form defaults.

## Existing Constraints

These are the facts from the repository at `5eff466`:

- There is a single frontend application at the repository root, `client/`, built with Vite 8.3.4, React 19.3.1, react-dom 19.3.1, TypeScript 7.0.2, and oxlint.
- The source tree is only the Vite template: `src/main.tsx`, `src/App.tsx`, `App.css`, `index.css`, and `assets/`. There are no existing feature modules, router, state library, or tests to follow.
- `msw@2.14.6` is installed, and `public/mockServiceWorker.js` is present.
- `tsconfig.app.json` uses `include: ["src"]`, `moduleResolution: "bundler"`, `verbatimModuleSyntax`, and `erasableSyntaxOnly`. The last one means no `enum` and no parameter properties, so domain unions must be string-literal types.
- Node is 24.18.0, which satisfies every candidate engine range below.
- The spec says not to add a data library merely because the React rules mention data patterns. It also requires every added dependency to have a recorded reason and trade-off, and forbids rewriting unrelated configuration.

## Options And Trade-Offs

| Decision | Options considered | Outcome |
| --- | --- | --- |
| Routing (Q1) | **react-router@8.4.0, declarative mode**; a hand-rolled History API module; no URL routing | react-router chosen by the developer (see the reasons below) |
| Filter state (Q1) | **URL search params**; in-memory React state on the mounted list layout | URL chosen by the developer |
| Server state (Q2) | **Plain React feature hooks**; `@tanstack/react-query@5.104.4` | Plain hooks chosen by the developer |
| Test stack (Q3) | **Vitest 5 + Testing Library + jsdom + msw/node**; the same with happy-dom; Vitest browser mode with Playwright | Vitest + RTL + jsdom chosen by the developer |
| Scenario selection (Q4) | **`?scenario=` read once by the mock bootstrap**; a `VITE_` env variable; an in-app switcher UI | `?scenario=` chosen (architect decision; no new dependency, reversible) |

### Routing

React Router was chosen over the alternatives because:
- deep links and back/forward work without custom code, and nested routes keep the list mounted;
- `react-router@8.4.0` has a peer requirement of `react >=19.2.7`, which the installed React satisfies, and an engine requirement of `node >=22.22`, which Node 24 satisfies;
- the cost is one runtime dependency. Using declarative mode rather than data-router loaders avoids putting a second owner over server data.

A hand-rolled router would avoid the dependency but would re-implement route matching, link interception, and history edge cases, which adds risk for no product gain. Having no URL routing at all gives up deep links and breaks context on reload.

### Filter state

Keeping filters in the URL gives them one owner that survives child routes, reloads, and deep links. The "reset filters" action becomes a navigation. As a side effect, this delivers the optional URL-sync extension. In-memory state on the list layout would survive child routes but would be lost on reload or deep link.

### Server state

TanStack Query brings caching, invalidation, and retries. That is more than four endpoints, five records, and one explicit refresh need, and the spec cautions against adding a data library for this.

### Test stack

The chosen stack reuses the Vite transform and runs the same MSW handlers in Node, offline and fast. The npm registry confirms compatibility:
- `vitest@5.0.5` has a peer requirement of `vite ^6.4 || ^7 || ^8`;
- `jsdom@30.1.3` requires `node ^24.15`;
- `@testing-library/react@16.3.3` has a peer requirement of `react ^19`;
- `@testing-library/jest-dom@7.0.1` has a peer requirement of `vitest >=0.32`.

happy-dom is somewhat faster but less faithful on forms and accessibility APIs. Browser mode is the highest-fidelity option but needs Playwright browsers installed, and real-browser evidence is already `browser-verify`'s job.

## Confirmed Decision

Each item below was confirmed by the developer on 2026-10-19, except D5 to D8, which are architect decisions that add no dependencies.

### D1: Routing

Add **`react-router@^8.4.0`** to `dependencies` and use **declarative mode** (`BrowserRouter`, `Routes`, `Route`). Data-router loaders and actions are **not** used.

```text
/                    -> redirect to /sessions (keeps search)
/sessions            -> SessionsWorkspace layout (list + filters), renders <Outlet/>
/sessions/new        -> CreateSession (child; static segment outranks :sessionId)
/sessions/:sessionId -> SessionDetails (child)
*                    -> not-found view with a link to /sessions
```

Details and create are **child routes of the list layout**. The list stays mounted while they are open, so its scroll position, focus origin, and loaded data persist.

Whether a child renders as a drawer, a modal, or a full-screen panel on mobile belongs to `ui-designer`. The routing contract stays the same whichever is chosen.

### D2: Filter state

Search and status live in **URL search params** (`?query=…&status=…`), and the URL is their single owner.
- Filter writes change only the `query` and `status` keys and preserve all other params, including `scenario`, which D7 depends on.
- Search typing writes with `replace: true`, so history is not flooded. Committing a filter value may use push or replace; `ui-designer` decides this together with the debounce question (Q8).
- An invalid `status` value in the URL is treated as "no status filter", so a malformed URL can never reach the API.

### D3: Server state

Use **plain React feature hooks**. No data library is added. There is one owner per piece of remote data:

| Data | Owner | Lifetime |
| --- | --- | --- |
| Sessions list | `useSessionsList(filters)`, called once in the `SessionsWorkspace` layout | While the workspace is mounted. Refetches when the committed filters change or `refresh()` is called. |
| Session details | `useSessionDetails(sessionId)`, called in the details route | Per mounted details route. It is not copied from the list summary. |
| Coaches | `useCoaches()`, called in the create route | Per mounted create route. Has an explicit `retry()`. |
| Create mutation | `useCreateSession()`, called in the create route | Per submission: `idle`, then `pending`, then `success` or `error`. |

The workspace exposes `{ refresh }` to its children through the router outlet context (`useOutletContext`) or a small typed context. Derived UI values are computed, never stored. Examples are "has active filters" and "no sessions versus no matches", which is derived from `meta.total` together with whether any filters are active.

### D4: Test stack

Add these to **devDependencies**:
- `vitest@^5.0.5`
- `jsdom@^30.1.3`
- `@testing-library/react@^16.3.3`
- `@testing-library/dom@^10` (the peer dependency of RTL)
- `@testing-library/user-event@^14.6.8`
- `@testing-library/jest-dom@^7.0.1`

Also add an `npm test` script (`vitest run`). Tests reuse the app's MSW handlers through `msw/node` `setupServer`.

### D5: Module boundaries

These are under `src/`, and they replace the Vite template content:

```text
src/
  main.tsx                 bootstrap: optional mock start, then render <App/>
  app/                     App (router + routes), AppShell layout, RootErrorBoundary
  api/                     contract types (DTOs), http client, sessions/coaches functions,
                           ApiError normalization, DTO -> domain mapping (dates parsed here)
  features/sessions/
    list/                  SessionsWorkspace layout, filters, list/table, list states
    details/               details route + view + states
    create/                create route, form, pure validation, mutation hook
    model/                 domain types, status metadata (label/symbol), filter parsing
  shared/                  only code with a second real caller (e.g. date formatting,
                           a generic async-resource hook, form field primitive)
  mocks/                   fixtures loading, clock rebasing, in-memory db, scenarios,
                           handlers, browser worker, node server
  test/                    vitest setup, render-with-router helper, frozen-clock helper
```

The exact file list belongs to `writing-plans`.

### D6: Dates

- `startsAt`, `createdAt`, `updatedAt`, and `cancellation.cancelledAt` are parsed **once**, in the `api/` DTO-to-domain mapping.
- Presentation formats values in the user's local timezone through one shared formatter built on `Intl.DateTimeFormat`.
- Create converts the local date and time inputs to a UTC ISO string in the create feature's request builder, which sits next to validation.

The exact domain type, for example `Date` or a branded ISO string, is decided by `api-integration`.

### D7: Mock scenario selection

- The mock bootstrap reads `?scenario=<name>` **once at startup**.
- An unknown or missing name falls back to `normal` and logs a `console.info` line from the mock layer only.
- The scenario value is held inside `src/mocks/`. It changes handler behavior there and nowhere else.
- Presentation components and `api/` never read or branch on it.
- Tests choose scenarios through the same mock-layer API, for example `createHandlers({ scenario, now, latencyMs: 0 })` or `server.use(...)`.

### D8: Mock enablement and backend replaceability

`main.tsx` starts the MSW worker through a dynamic `import('./mocks/browser')` **unless** `import.meta.env.VITE_API_MOCKING === 'off'`.

The API client always calls relative `/api/...` paths with `fetch`, and MSW intercepts at the network layer. Replacing MSW with a real backend therefore means setting `VITE_API_MOCKING=off` plus a dev proxy or same-origin deploy. No presentation or API-client code changes. The mocks are excluded from the bundle when mocking is disabled at build time.

## Boundaries And Dependency Direction

```text
main.tsx -> app -> features/sessions/* -> api, shared
                                       -> features/sessions/model
mocks -> api (contract DTO types only), frontend-accelerator-assessment/fixtures/*.json
test  -> mocks, app, features
```

These rules apply:

- `features/*` and `app/` **never** import `mocks/` or fixture JSON. Only `mocks/` imports fixture files, reading them in place from `frontend-accelerator-assessment/fixtures/` so the assessment inputs stay unchanged.
- Only `api/` calls `fetch`. Components call feature hooks, never `api/` functions directly. Feature hooks are the only `api/` consumers.
- `api/` imports nothing from `features/`, `app/`, or `mocks/`.
- `mocks/` may import contract DTO types from `api/` so the handlers and the client share one contract definition. It must not import client functions.
- Feature subfolders (`list`, `details`, `create`) may import from `model/` and `shared/`, but not from each other. Two exceptions are allowed: the create route may call the workspace `refresh` exposed through outlet context, and links to `/sessions/:id` are plain route paths.
- Code moves into `shared/` only when a second real caller exists.
- Component APIs follow the React rules: composition over boolean props, React 19 `ref` as a prop, and `use(Context)` where context is needed.

## State, Data, And Failure Flow

### List

- Committed URL filters go to `useSessionsList`, which calls `GET /api/sessions?query&status`.
- Each request has an `AbortController`. A filter change or unmount aborts the previous request, and a response for stale filters is ignored.
- During a refetch, the previous data stays visible with a non-blocking "updating" indication. A refetch never flashes a full loading state after the first load.
- The list exposes these states:
  - `loading` on the first load only;
  - `success` with `data` and `meta`;
  - `error` with a normalized `ApiError` and `retry`.
- "Empty" is `success` with total 0 and no active filters. "No matches" is `success` with total 0 and active filters.
- `400 INVALID_FILTER` uses the list error path. A clear-filters recovery is also offered, following assumption A8.

### Details

- `useSessionDetails(id)` follows the same abort and stale-response pattern.
- A `404 SESSION_NOT_FOUND` and other failures (for example `500`) produce distinct error states, each with a way back to `/sessions?<current filters>`. Non-404 failures also offer a retry.
- A failure is contained inside the details region, and the list behind it stays usable.

### Coaches

- When `useCoaches()` fails, the create form shows the error and a retry. Submit is unavailable while there is no loaded coach list (requirement AC-3.11).

### Create

1. `useCreateSession` blocks a second submit while `pending`, using both state and a synchronous in-flight ref guard. No idempotency key is invented.
2. Pure validation runs before the request.
3. A `400` response maps `fieldErrors` to fields and shows a form-level error for anything that does not map.
4. A `500` response or a network failure produces a form-level error. The form values stay in the form's own state, which is never reset on failure.
5. On `201`, the create route calls the workspace `refresh()`.
6. Once the refreshed list arrives, the workspace checks whether the created id is in `data`. This is the **server-truth discoverability check**: no client-side copy of the search logic.
   - If the id is present, the new session is shown or highlighted.
   - If it is absent, the user gets "hidden by current filters", with actions to open `/sessions/:newId` or clear the filters.

### Render failures

- A single `RootErrorBoundary` in `app/` catches unexpected render errors and keeps a usable shell with a reload action.
- Request errors are handled as state, not thrown into boundaries.

### Mock state

- `mocks/` builds an in-memory db from the rebased fixtures **once per startup**: `rebase(fixtures, now - referenceNow)`.
- Created sessions are appended to that db, so later list and details reads return them.
- Tests build a fresh db for each test so they stay isolated.

## Performance, Security, And Testability

### Performance

- The data is five fixture records plus any created sessions, so there is no virtualization, memoization layer, or code splitting beyond the dynamic mock import.
- Search requests are debounced. `ui-designer` decides the user-facing behavior (Q8) and the plan fixes the value.
- Aborting stale requests prevents responses from arriving out of order.

### Security

- There are no secrets, analytics, or credentials.
- All content renders as React text, and `dangerouslySetInnerHTML` is never used.
- Coach emails come from `example.test` fixtures. A `mailto:` link is acceptable.
- Hiding controls on the client is not authorization. This matters only if the optional read-only mode is ever added.

### Testability

- Validation, filter parsing, status metadata, DTO mapping, and clock rebasing are pure functions.
- Behavior tests render the real router (`MemoryRouter` with initial entries) against `msw/node` handlers built with `latencyMs: 0` and a fixed `now`.
- **Frozen clock:**
  - fake only `Date` (`vi.useFakeTimers({ toFake: ['Date'] })` plus `vi.setSystemTime`);
  - fake timers on `setTimeout` would stall MSW, Testing Library's `findBy*`, and debounce unless they are advanced explicitly;
  - the same `now` is passed to the mock db's rebase, so the fixtures and the "future start" validation agree.
- Tests assert user-observable output (roles, labels, text, and announcements), not hook internals.

## Implementation Implications

These are notes for `writing-plans` and `coder`:

- **Dependencies:**
  - `npm install react-router@^8.4.0`;
  - `npm install -D vitest@^5.0.5 jsdom@^30.1.3 @testing-library/react@^16.3.3 @testing-library/dom@^10 @testing-library/user-event@^14.6.8 @testing-library/jest-dom@^7.0.1`;
  - record the reason and trade-off for each in the final report, using the table above.
- **Config:**
  - add the `test` script;
  - add the Vitest config either as a separate `vitest.config.ts` (via `mergeConfig`) or as a `test` block in `vite.config.ts`, whichever is the smaller change, with `environment: 'jsdom'` and a setup file.
  - Verify JSON imports of the fixtures outside `src/` under `tsconfig.app.json`: `resolveJsonModule` and the `include` of the fixture path. Change TS config minimally, and only if it is required.
- **Template content:** replacing the Vite template content in `App.tsx`, `App.css`, `index.css`, and the template assets is in scope, because it is the application shell and not unrelated code.
- **MSW `onUnhandledRequest`:** use `'bypass'` for static assets in the browser and `'error'` in tests.
- **Living specs:** `specs/architecture.md` is **not** written by this role yet. These decisions are planned, not current implementation truth. `docs-generator` records them after verified implementation.

## Risks

- **React Router major version 8:** the version is recent, and the API was not verified through ctx7 because the quota was exceeded. The plan and the coder should confirm the declarative APIs used (`BrowserRouter`, `Routes`, `Route`, `Outlet`, `useSearchParams`, `useOutletContext`, `useNavigate`) against the installed package's types.
- **`?scenario=` and filter writes:** if a filter write ever replaces the whole search string, the scenario parameter is lost on reload. D2's "preserve other params" rule prevents this, and the plan should include a test or check for it.
- **Local date and time to UTC across DST gaps:** a non-existent local time, for example 02:30 on a spring-forward night, is normalized by `Date`. The future-start check runs on the resolved instant. This is an accepted edge case and is documented, not specially handled.
- **Page size:** the list response always reports `pageSize: 10`, with no pagination in v1. If created sessions push the total above 10, the discoverability check correctly reports a created session as "not visible" when the server omits it.
