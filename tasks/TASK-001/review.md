# TASK-001: Code Review

- **Role:** `code-reviewer`. The developer invoked it with `/code-reviewer`, and it ran as an isolated `code-reviewer` subagent (read-only tools).
- **Date:** 2026-10-19
- **Review surface:** the working tree against `HEAD` `5eff46663fd2002989420be27a57df1eb3d0cde8`, excluding `tasks/` and `package-lock.json`.
- **Reviewed against:** `requirements.md`, `architecture.md`, `api-integration.md`, `ui-design.md`, `implementation-plan.md`, and the fixed assessment spec, contract, and mocking guide.
- **Production code changed after the review:** yes. A follow-up `coder` ran at 2026-10-19 15:09 CEST; see "Remediation (coder, round 1)". A second `code-reviewer` pass is recorded under "Re-review (round 2)".

## Reviewer Verdict (verbatim)

Verdict: NEEDS-CHANGES

## Findings

**R1 — should-fix — Empty/no-match/count heading derived from stale data with current filters**
`src/features/sessions/list/SessionsWorkspace.tsx:34`, `:93-96`, `:151-157` with `src/shared/useRemoteResource.ts:46-47`.
`filtered` comes from the current URL (`hasActiveFilters(filters)`), but during a refetch `useRemoteResource` returns the previous key's `data` with `status: 'success'`, `isRefreshing: true` — and nothing records which filters produced that data. The heading, the "No sessions yet" branch and the "No sessions match" branch all combine new `filtered` with stale `list.data.total`.
Failure scenario (normal scenario): load `/sessions?query=zzz` → "No sessions match your filters". Activate "Clear filters" → for the whole refetch (250 ms in the browser; longer with a real backend) the list region shows heading "0 sessions" and the `NoSessions` state ("No sessions yet / Create the first session to start planning." + Create CTA, a freshly-mounted `role="status"`) before the rows replace it. Reverse direction: typing "zzz" over the 5-row list shows heading "5 sessions match" until the response lands. This briefly shows/announces the wrong one of the two states AC-4.3/AC-4.4 require to be distinct, and violates the review priority "derived-state correctness" (`rulesets/framework/code-reviewer/INDEX.md`). Tests wait with `findBy*` for the end state, so they don't catch it.
Fix direction: keep the key/filters of the settled data and derive `filtered`/empty-vs-no-match from those, or don't switch to the empty/no-match branches while `isRefreshing`.
Follow-up: **coder**.

**R2 — should-fix — Late create success navigates using a stale location snapshot**
`src/features/sessions/list/SessionsWorkspace.tsx:63-67` (`onCreated`) and `src/features/sessions/create/CreateSessionForm.tsx:119-123`.
`handleSubmit` awaits the POST and then calls the `onCreated` prop captured when submit was clicked; that closure holds the workspace's old `filtersKey` and `location.search` and unconditionally does `navigate({ pathname: '/sessions', search: <old search> })`. api-integration.md (Request behavior) deliberately lets the POST complete after unmount ("A late success still triggers the workspace `refresh()`"), which is exactly the path that misbehaves.
Failure scenarios (≥1024 px, where the panel is non-modal so the list/filters stay usable while "Creating…" is pending): (a) submit, then click another session row → details open → POST resolves → `onCreated` navigates to `/sessions`, closing the details panel the user just opened; (b) submit, then change Status → on success the URL is replaced with the pre-change search, silently reverting the status filter, and the banner is keyed to the old filters; (c) Escape → confirm discard → open a row while pending → same as (a). The window is short with the 250 ms mock latency but unbounded with a real backend (D8).
Fix direction: read current location/filters at call time (e.g. `useEffectEvent` or a ref in the workspace) and only navigate if the create route is still active; still record the banner and refresh.
Follow-up: **coder**.

**R3 — nit — A pending search debounce survives an external "Clear filters"**
`src/features/sessions/list/SessionFilters.tsx:40-44` (timer), `:24-30` (draft sync); `SessionsWorkspace.tsx:58-61` (`clearFilters` never reaches the timer); callers `ListStates.tsx:50,78`, `CreatedBanner.tsx:37`.
Failure scenario: on `/sessions?query=zzz`, type "y" in search and, within 300 ms, activate the "Clear filters" button in the no-matches state. The URL is cleared and the draft reset to "", then the stale timer fires `commit({ query: 'zzzy' })`. That sets `committedQuery='zzzy'` and writes `?query=zzzy`. Because `filters.query === committedQuery`, the draft stays "": the search box looks empty while the list is filtered by "zzzy".
Follow-up: **coder** (clear the timer when the URL query changes externally, or route all clears through one timer-owning handler).

**R4 — nit — Focus moves to the first invalid control before its error attributes are committed**
`src/features/sessions/create/CreateSessionForm.tsx:111-114`, `:138`.
`focusControl()` runs synchronously in the submit handler, before React renders `aria-invalid`/`aria-describedby`. Failure scenario: a screen reader announces "Title, edit text" without "invalid" or the error text. The polite "Fix N fields…" message partly compensates (AC-3.4 is met via the announcement), but the field's own error is heard only after leaving and returning.
Follow-up: **coder** (focus after commit, e.g. an effect keyed to a submit counter, or `flushSync`).

**R5 — nit — The loading announcement lives inside an `aria-busy` container and exists at mount**
`src/features/sessions/list/SessionsWorkspace.tsx:134`, `:141-143`.
The `role="status"` paragraph is a descendant of `<section aria-busy={list.status === 'loading'}>`, and AT may suppress changes inside a busy subtree. Failure scenario: in `list-error`, "Try again" changes the status text from "" to "Loading sessions…" while the section is `aria-busy="true"`, so screen readers may never speak the loading message (AC-7.5). This follows ui-design.md literally, so it is a design-level nit.
Follow-up: **ui-designer** (or coder): move the status region outside the busy section, or drop `aria-busy`.

**R6 — nit — A mock start-up failure leaves a blank page**
`src/main.tsx:14-21`.
`enableMocking().then(render)` has no rejection path, and `RootErrorBoundary` isn't mounted yet. Failure scenario: opening the dev server on a phone via `http://<LAN-IP>:5173` for the 390 px check isn't a secure context, so the service worker is unavailable and `worker.start()` rejects. The result is an empty `#root` with an unhandled rejection and no message.
Follow-up: **coder** (catch and render anyway, or render a visible "mock API failed to start" message).

**R7 — nit — The "Coach" label points at nothing when coaches fail or are empty**
`src/features/sessions/create/CreateSessionForm.tsx:255-266`.
`<Field id="create-coach">` still renders `<label htmlFor="create-coach">` while the inline alert replaces the `<select>`. Failure scenario: in `coaches-error`, an a11y linter or screen-reader user meets a label that controls nothing.
Follow-up: **coder**.

**R8 — nit — The planning docs conflict on `api/` → `features/` imports**
`src/api/mappers.ts:1`, `src/api/sessions.ts:1`, `src/api/coaches.ts:1` import domain types from `features/sessions/model/types`.
architecture.md says "`api/` imports nothing from `features/`", while api-integration.md ("Domain model") explicitly says `api/mappers.ts` imports `features/sessions/model/`. The code follows the more specific document, and the imports are type-only, so there is no code defect today, but the boundary rule is ambiguous for future work.
Follow-up: **api-integration** to reconcile the rule (e.g. move domain types to `api/` or `shared/`).

**R9 — nit — "Clear filters" in the hidden-session banner removes the banner and the "New" highlight**
`src/features/sessions/list/SessionsWorkspace.tsx:45` and `CreatedBanner.tsx:37`.
Failure scenario: create a session while `?status=full`, then click the banner's "Clear filters". The filters key changes, the banner unmounts and `highlightedId` becomes undefined, so the new row appears without the "New" tag or any confirmation and the user must scan for it. This matches ui-design.md ("stays until dismissed or the filters change") but weakens AC-3.10's "clear action". It is a design preference, not a rule breach.
Follow-up: **ui-designer**.

**R10 — nit — Minor deviations from the design or plan**
`src/features/sessions/model/capacity.ts:9` shows "No places left" for a full session, where the design copy for rows/cards is "Full". `src/shared/format.ts:49` `toIsoAttribute` is exported but unused.
Follow-up: **coder**.

## Residual runtime/test gaps

- **jsdom cannot cover:** `setup.ts` stubs `matchMedia` to desktop, so `<dialog>`/`showModal()` mode never runs in tests. Browser-verify must confirm:
  - the 768–1023 px drawer and the 390 px sheet;
  - the inert background;
  - focus restore after dialog removal;
  - mode switching across 1024 px;
  - no horizontal overflow at 390 px in the details/create panels and the filter bar;
  - the stretched-link `::after` on a `position: relative` `<tr>`;
  - the sticky inline panel;
  - 44 px targets.
- **Escape on a dirty create form in dialog mode (Chrome):** under close-watcher rules a second `cancel` event can be non-cancelable without intervening user activation. A dirty form could then close the dialog natively while the route stays `/sessions/new` (panel invisible, URL unchanged), because `Panel.tsx:77-80` handles only `onCancel`, not `onClose`. Verify in Chrome <1024 px: Escape → "Cancel" in the confirm → Escape again.
- **Screen-reader announcements need a real AT check:**
  - the list count;
  - "Loading sessions…" (see R5);
  - "Creating session…" status;
  - the created banner (a `role="status"` mounted with content, plus a focus move);
  - the polite trainer-notes counter.
- **Runtime-only:**
  - MSW worker start and the 250 ms latency;
  - `?scenario=` selection for all six scenarios;
  - reduced motion (drawer animation, spinner);
  - StrictMode double effects/aborts producing no console errors on the primary flows (AC-9.3).
- **Test coverage:** all six AC-8.1 areas are covered with user-observable assertions:
  - loading;
  - search and status;
  - empty vs no matches;
  - list error with retry;
  - validation + single submit + discoverability;
  - 500 preserves values.

  Not covered (for test-generator):
  - details 500/404 (AC-2.9);
  - the pending state visible/announced (AC-3.6: "Creating…", `aria-disabled`);
  - the hidden-by-filters banner actions (AC-3.10);
  - `scenario` param preservation across filter writes and panel navigation (an architecture Risk asked for a test);
  - `400 VALIDATION_FAILED` field mapping (AC-3.7);
  - coaches failure blocking submit (AC-3.11);
  - a regression test for R1 (assert "No sessions yet" never appears while clearing a no-match filter).

  The `dblClick` test in `CreateSession.test.tsx:63` proves only one POST; it may pass because of the state re-render rather than the synchronous ref guard.

## Context Summary

This was a read-only review of TASK-001 in `/Users/sachyshyn/Documents/work/fe-ai-assessment/client`: the working tree vs HEAD `5eff466`, excluding `tasks/` and `package-lock.json`.
- **Files read:** all new files under `src/api`, `src/app`, `src/features/sessions`, `src/mocks`, `src/shared` and `src/test`, plus the tracked diffs to `index.html`, `package.json`, `vite.config.ts` and `src/main.tsx`.
- **Checked against:** requirements AC-1..AC-9, architecture D1–D8, api-integration AI-1..AI-13, the UI design, the plan, and the fixed contract and mocking guide.
- **Files modified:** none.
- **Outcome:** the contract, mock layer, scenario isolation, fixture rebasing and error normalization are sound. Two should-fix state defects (R1, R2) keep the verdict at NEEDS-CHANGES.

## Evidence

- **Commands run:**
  - `git status --short`;
  - `git diff HEAD -- index.html package.json vite.config.ts src/main.tsx`;
  - `git status`/`git ls-files` on `frontend-accelerator-assessment/` (all 17 files tracked and unchanged);
  - read-only `cat`/`grep`/`find` over `src/`, the rulesets and the task docs;
  - `node -e` to print installed versions (react 19.3.1, react-router 8.4.0, msw 2.14.6).
- **Boundary greps:**
  - the only `fetch` is `src/api/http.ts:48`;
  - no `scenario`/fixture/`mocks/` imports in `api/`, `app/`, `features/` or `shared/`, except the dynamic import in `main.tsx:11`;
  - no `dangerouslySetInnerHTML`.
- **Mock layer checks:**
  - the nested `cancellation.cancelledAt` is rebased (`src/mocks/clock.ts:20-22`);
  - the list handler filters before `meta.total`, keeps `page: 1`/`pageSize: 10`, and returns `400 INVALID_FILTER` (`src/mocks/db.ts:94-99`, `src/mocks/handlers.ts:30-35`);
  - create validation covers the AI-9 checks (`src/mocks/db.ts:105-155`).
- **Rules applied:**
  - `rulesets/common/code-reviewer/rules/evidence-first-review.md`;
  - `rulesets/framework/code-reviewer/INDEX.md`, routed through `rulesets/framework/coder/INDEX.md` (conditional rendering, derived state, narrow dependencies, event listeners);
  - `rulesets/common/shared/web-interface-guidelines/command.md`, without the Vercel brand preferences;
  - there is no `rulesets/project` code-reviewer section, which is valid.
- **Not run by the reviewer:** `npm test`, `tsc -b`, `oxlint`, `vite build`. It relied on the coder-reported results (6/6 tests, tsc exit 0, 0 lint warnings, build exit 0). No browser checks were run.

## Next Step

- **Primary:** `coder`, to fix R1 and R2, plus the small local nits R3, R4, R6, R7 and R10. It should run because the verdict is NEEDS-CHANGES on should-fix state defects.
- **Alternatives after the coder fixes:**
  - `test-generator`, for the coverage gaps above, including the R1 regression test;
  - `browser-verify`, for the dialog/sheet modes, the Chrome Escape check, 390 px overflow, live regions and console checks.
- R5 and R9 are design choices; route them to `ui-designer` only if a change is wanted. R8 goes to `api-integration` for documentation clarification.
- The developer chooses which to run; none has been invoked.

## Remediation (coder, round 1)

- **Invocation:** `/coder` at 2026-10-19 15:09 CEST, with "Fix the TASK-001 issues recorded in tasks/TASK-001/review.md".
- **Out of scope:** R8 and R9, which stay accepted limitations.

**Changes:**

- **R1:** `src/features/sessions/list/useSessionsList.ts` now returns `{ filters, page }`, so every result carries the filters that produced it. `SessionsWorkspace.tsx` derives the heading, empty state, and no-match state from those filters (`shown.filters`) instead of the current URL. While a refetch is in flight, the old state stays consistent with the rows on screen, and "Updating…" is shown.
- **R2:** `SessionsWorkspace.tsx`:
  - `onCreated` reads the latest `{ search, filtersKey, isCreateOpen }` from a ref that an effect updates after every commit;
  - it navigates back to the list **only** if the create route is still open;
  - it always records the banner and refreshes the list.

  Follow-on fix in `CreatedBanner.tsx`: the banner takes focus only when focus was lost, for example when the create panel closes. A late success therefore no longer steals focus from a details panel the user opened meanwhile.
- **R3:** `SessionFilters.tsx` exposes a `clear()` handle (`useImperativeHandle`) that cancels the debounce timer, resets the draft, commits empty filters, and focuses search. Every "Clear filters" action (filter bar, no-matches state, list error, created banner) goes through `SessionsWorkspace` `clearFilters` and then this handle.
- **R4:** `CreateSessionForm.tsx` replaces the synchronous `focusControl()` in the submit handler with a `focusRequest` state and an effect. Focus moves after React commits `aria-invalid` and `aria-describedby`. This applies to both client and server (400) errors.
- **R5:** `SessionsWorkspace.tsx` moves the polite `role="status"` region outside the `aria-busy` list section. `aria-busy` stays on the section, as `ui-design.md` specifies, and the design intent is unchanged.
- **R6:** in `src/main.tsx`, a mock start-up rejection is logged with `console.error` and the app still renders, with a visible `role="alert"` (`src/app/MockStartupAlert.tsx`) explaining the secure-context requirement. A `.startup-alert` style was added to `src/index.css`.
- **R7:** in `CreateSessionForm.tsx`, in the `coaches-error` and empty-coaches states the Coach block is a `role="group"` labelled by a non-`<label>` heading, so there is no longer an orphan `<label for>`.
- **R10:** `model/capacity.ts` `placesLabel` returns "Full" for a full session, matching the design copy. The unused `toIsoAttribute` was removed from `src/shared/format.ts`.

**Regression tests added** (each was verified to **fail** with its fix temporarily reverted, then to pass with the fix restored):

| Test | Proves |
| --- | --- |
| `SessionsWorkspace.test.tsx`: "never shows "No sessions yet" while clearing a no-match search refetches (review R1)" | While the refetch is in flight, "Updating…" is visible, "No sessions yet" is absent, and the heading stays "0 sessions match". |
| `SessionsWorkspace.test.tsx`: "drops a pending search keystroke when filters are cleared elsewhere (review R3)" | After typing "y" and clearing from the no-matches state within the debounce, the search stays empty and the list shows 5 sessions. |
| `CreateSession.test.tsx`: "a late create success keeps the session the user opened meanwhile (review R2)" | It also asserts the pending "Creating…" button has `aria-disabled="true"`, which covers part of the AC-3.6 gap. |

**Checks run** in `client/`:
- `npm test`: 9/9 passed, exit 0.
- `npx tsc -b`: exit 0.
- `npm run lint`: exit 0, no warnings.
- `npm run build`: exit 0.

## Finding Dispositions

Updated after Remediation (coder, round 1).

| Finding | Severity | Disposition | Rationale and impact |
| --- | --- | --- | --- |
| R1 | should-fix | **Resolved** | `useSessionsList.ts` and `SessionsWorkspace.tsx` derive the state from the filters of the shown data. Regression test R1 passes, and fails without the fix. |
| R2 | should-fix | **Resolved** | `SessionsWorkspace.tsx` reads the latest location through a ref and navigates only while create is open. `CreatedBanner.tsx` no longer steals focus. Regression test R2 passes, and fails without the fix. |
| R3 | nit | **Resolved** | `SessionFilters.tsx` provides the `clear()` handle that owns the timer. Regression test R3 passes, and fails without the fix. |
| R4 | nit | **Resolved** | `CreateSessionForm.tsx` focuses through an effect after commit. The existing test assertion that Title has focus still passes. Screen-reader output itself is not verified (browser and AT gap). |
| R5 | nit | **Resolved** | `SessionsWorkspace.tsx` moves the status region outside the busy section. A real AT announcement check is still a browser-verify gap. |
| R6 | nit | **Resolved** | `main.tsx` and `MockStartupAlert.tsx` handle the rejection. Not exercised by automated tests: it needs a non-secure-context browser run. |
| R7 | nit | **Resolved** | `CreateSessionForm.tsx` uses a labelled group in the error and empty states. No automated test was added; the coaches-error flow remains a test-generator gap. |
| R8 | nit | **Accepted limitation** | Unchanged. The code follows `api-integration.md` with **type-only** imports, so there is no runtime coupling. It needs a docs reconciliation in `api-integration`, not a code change. |
| R9 | nit | **Accepted limitation** | Unchanged. The behavior matches the approved `ui-design.md`, and AC-3.10's "reset the relevant filters" outcome is met. Revisit only through `ui-designer`. |
| R10 | nit | **Resolved** | `capacity.ts` shows "Full", and `format.ts` no longer has the unused export. |

## Re-review (round 2)

- **Role:** `code-reviewer`. The developer invoked it with `/code-reviewer` after Remediation (coder, round 1). It ran in the same isolated read-only `code-reviewer` subagent as round 1.
- **Date:** 2026-10-19 15:13 CEST.
- **Review surface:** the working tree against `HEAD` `5eff466`, excluding `tasks/` and `package-lock.json`, focused on the round-1 remediation files.
- **Production code changed after this re-review:** none so far.

### Reviewer Verdict (verbatim)

Verdict: NEEDS-CHANGES

Eight of the ten round-1 findings are confirmed resolved, and the reviewer agreed with both accepted limitations (R8, R9). One new should-fix regression (N1) keeps the verdict at NEEDS-CHANGES: after a normal create, focus lands on the "Create session" link instead of the success banner.

### Round-1 Findings: Verification

| Finding | Verdict | Evidence |
| --- | --- | --- |
| R1 | CONFIRMED-RESOLVED | `useSessionsList.ts:9-12` carries the `filters` that produced each result. `SessionsWorkspace.tsx:94-105` builds the heading and announcement from `shown.filters`, and `:161-165` chooses NoSessions or NoMatches from `shownFiltered` and `shown.page.total` instead of the current URL. `ListError` still uses the URL-based `filtered` for its clear action (`:158`), which is correct because the error belongs to the current request. |
| R2 | CONFIRMED-RESOLVED | `SessionsWorkspace.tsx:63-73`: `onCreated` reads `latest.current`, navigates only when `isCreateOpen`, and always records the banner with the latest `filtersKey` and refreshes. One ordering window remains, judged negligible and not a finding: `latest` is updated in a passive effect, and React Router wraps navigations in `startTransition`. A POST that resolves within the few milliseconds between a row click and the transition's commit and effect flush would still see `isCreateOpen: true`. |
| R3 | CONFIRMED-RESOLVED | `SessionFilters.tsx:53-61`: `clear()` cancels the timer, resets the draft and committed query, commits `EMPTY_FILTERS`, and focuses search. `SessionsWorkspace.tsx:58` routes every clear through it: the filter bar, NoMatches, ListError, and the banner. Focus after a clear stays on the search input, as in round 1. |
| R4 | CONFIRMED-RESOLVED | `CreateSessionForm.tsx:74-81`: `focusRequest` holds `{ field, attempt }`, and an effect moves focus after the commit. The increasing `attempt` re-fires the effect for every request. It is used for client validation (`:123`) and server 400 errors (`:148`). The state updates are batched with `setSubmittedAt` and `setServer`, so `aria-invalid` and `aria-describedby` are already in the DOM when focus moves. |
| R5 | CONFIRMED-RESOLVED | `SessionsWorkspace.tsx:142-145`: the `role="status"` region now sits outside the `aria-busy` section (`:148`). |
| R6 | CONFIRMED-RESOLVED | `src/main.tsx:16-31`: `.then(onFulfilled, onRejected)` calls `render` exactly once on either path, so there is no double render. On failure, `console.error` runs and `MockStartupAlert` (`src/app/MockStartupAlert.tsx:1-8`) renders above `<App/>`. Copy nit in N2. |
| R7 | CONFIRMED-RESOLVED | `CreateSessionForm.tsx:265-283`: the error and empty-coaches states render `role="group" aria-labelledby="create-coach-label"` with a `<p>` label, so there is no orphan `<label for>`. The loading and success states still use `<Field>` with a real `<select>` (`:285-306`). |
| R8 | ACCEPTED-LIMITATION-AGREED | `src/api/mappers.ts:1` is unchanged. The import is type-only and follows `api-integration.md`. Only the planning documents need reconciling. |
| R9 | ACCEPTED-LIMITATION-AGREED | `SessionsWorkspace.tsx:45` is unchanged and matches the approved `ui-design.md`. AC-3.10's "reset the relevant filters" outcome is met. |
| R10 | CONFIRMED-RESOLVED | `src/features/sessions/model/capacity.ts:9` returns "Full". `toIsoAttribute` is gone from `src/` (grep finds nothing). |

### New Findings

**N1: should-fix. After a normal create, focus no longer reaches the success banner; it lands on the "Create session" link.**

- **Where:**
  - `src/features/sessions/list/CreatedBanner.tsx:19-22` (conditional focus);
  - `src/features/sessions/list/SessionsWorkspace.tsx:68-73` (`onCreated`) and `:79-91` (the focus-restore effect);
  - router behavior in `node_modules/react-router/dist/development/lib/dom/lib.js:162-166` (BrowserRouter) and `lib/components.js:385-389` (MemoryRouter). Both wrap location updates in `React.startTransition` unless `useTransitions === false`, and this app does not set it.
- **Defect:**
  - `onCreated` runs after an `await`. Its `setCreated` and `retry()` calls are default-priority updates, while `navigate()` is a transition, so React commits twice.
  - **Commit 1:** the banner mounts while the create panel is still in the DOM. Its effect sees `document.activeElement` on the submit button, which is the case whenever the button was clicked in Chrome, Edge, or Windows Firefox, or activated with the keyboard. So the banner does not take focus.
  - **Commit 2:** the transition removes the panel and focus falls to `<body>`. The workspace effect sees `previous === 'new'` and focuses `createLinkRef`, the "Create session" link.
- **Failure scenario:**
  - A keyboard or screen-reader user fills the form and presses Enter on "Create session". The panel closes and focus lands on the header link, not on the banner as `ui-design.md` ("After create": "focus moves to it") requires.
  - The banner's `role="status"` is inserted together with its text, so it may not be announced. The form's own live region is cleared (`CreateSessionForm.tsx:131`) and unmounted, which leaves only the workspace count ("6 sessions"). That does not say a session was created, which weakens AC-3.9 ("Success is explicit and announced") and AC-7.5.
  - This is a regression from the R2 follow-on change. Round 1 focused the banner unconditionally in commit 1.
- **Why no test fails:** no test asserts focus after a successful create.
- **Fix direction:**
  - Let the workspace own the focus target when create closes. For example, in the effect at `:79-91`, when `previous === 'new'` and a banner from this create exists, focus the banner instead of the Create link.
  - Or give the banner a focus intent that is set only when `onCreated` closed the panel itself (`current.isCreateOpen`).
  - Add a test asserting that the banner has focus after a normal success and that focus stays in the details panel in the late-success case.
- **Follow-up role:** coder.

**N2: nit. The mock start-up alert names only one cause.**

- **Where:** `src/app/MockStartupAlert.tsx:4-5`.
- **Defect:** the copy blames the failure on "Service workers need a secure context".
- **Failure scenario:** `worker.start()` also rejects when `public/mockServiceWorker.js` is missing or returns 404, or when service workers are disabled (for example Firefox private windows), even on `http://localhost`. The advice to switch to localhost or HTTPS would then be wrong.
- **Fix direction:** neutral copy that lists the likely causes, or the error's message.
- **Follow-up role:** coder.

### How The New Tests Check Behavior

- **R1 test** (`SessionsWorkspace.test.tsx:64-76`): fully user-observable. "Updating…" is visible, "No sessions yet" is absent, the heading stays "0 sessions match", and the rows and the "5 sessions" heading follow.
- **R3 test** (`:78-89`): asserts the visible search value and the heading. It uses a real 400 ms sleep, which is acceptable but coupled to the 300 ms debounce constant.
- **R2 test** (`CreateSession.test.tsx:73-91`): asserts the pending "Creating…" button with `aria-disabled="true"`, that the details heading persists, and that the banner appears. It does not assert focus.
- **The existing success test** (`:36-71`) does not assert banner focus either, which is why N1 went undetected.

### Residual Runtime And Test Gaps

- **Browser-only, not yet run:**
  - dialog and sheet modes: the 768–1023 px drawer and the 390 px sheet, with `showModal()`, an inert background, and focus restore after the dialog is removed;
  - mode switching across 1024 px;
  - no horizontal overflow at 390 px;
  - the stretched-link `::after` on a `<tr>`;
  - 44 px touch targets.
- **Chrome Escape check (dialog mode):** pressing Escape, then "Cancel" in the confirm dialog, then Escape again on a dirty create form may close the dialog natively, because `Panel.tsx:77-80` handles only `onCancel`. Not yet checked.
- **Real assistive-technology checks:**
  - the relocated status region (R5);
  - focused-error reading (R4);
  - the success announcement once N1 is fixed.
- **R6 runtime path:** not exercised. It needs a non-secure-context or missing-worker browser run.
- **Tests still missing** (for test-generator):
  - details 500 and 404 (AC-2.9);
  - the hidden-by-filters banner actions (AC-3.10);
  - `scenario` param preservation;
  - `400 VALIDATION_FAILED` mapping (AC-3.7);
  - coaches failure blocking submit and the R7 group markup (AC-3.11);
  - focus after a create success (N1).
- **Coverage in place:** the AC-8.1 essentials, including the "Creating…" and `aria-disabled` assertion now in the R2 test.

### Context Summary

The reviewer re-read the working tree against `HEAD` `5eff466`, excluding `tasks/` and `package-lock.json`, with a focus on the round-1 remediation files:
- the list hook, workspace, filters, and banner;
- the create form;
- `capacity.ts` and `format.ts`;
- `main.tsx` and `MockStartupAlert.tsx`;
- `index.css`;
- both test files.

It verified each R1–R10 disposition against the code and traced commit ordering between React state updates and React Router's transition-wrapped navigation. No files were modified.

### Evidence

- **Commands run (all read-only):**
  - `git status --short`;
  - `sed` on `tasks/TASK-001/review.md`, to read the "Remediation (coder, round 1)" and "Finding Dispositions" sections;
  - `cat -n` on the changed files;
  - `grep` for `toIsoAttribute` and `.startup-alert`;
  - `grep` in the installed `react-router` 8.4.0 dist, to confirm that `BrowserRouter` and `MemoryRouter` call `React.startTransition` (`dom/lib.js:162-166`, `components.js:385-389`).
- **Not run by the reviewer:** `npm test`, `tsc -b`, `oxlint`, and `vite build`. It relied on the coder-reported results (9/9 tests, all checks exit 0).
- **N1 is not reproduced:** it comes from code and router-source tracing, not an observed run. The recommended focus test would confirm it.

### Next Step

- **Primary:** `coder`, to fix N1 and add a test for where focus goes after a create success. N2 can be fixed in the same pass. This is recommended because N1 is a should-fix regression.
- **Alternatives after that:**
  - `test-generator`, for the remaining coverage gaps;
  - `browser-verify`, for dialog and sheet modes, the Chrome Escape check, 390 px overflow, screen-reader announcements, and console checks.
- The developer chooses which to run. None has been invoked.

### Round-2 Finding Dispositions

These were recorded at re-review time. No production code has changed since.

| Finding | Severity | Disposition | Rationale and impact |
| --- | --- | --- | --- |
| R1–R7, R10 | — | **Resolved** | The reviewer confirmed each fix in round 2 (see the verification table above). |
| R8, R9 | nit | **Accepted limitation** | The reviewer agreed with both. They are unchanged, and the rationale is under "Finding Dispositions" above. |
| N1 | should-fix | **Unresolved** | A regression introduced by the R2 follow-on change to banner focus. After a normal create, focus goes to the Create link instead of the success banner, which weakens AC-3.9 and AC-7.5. It comes from code tracing and is not yet reproduced; the recommended focus test would confirm it. Needs `coder`. |
| N2 | nit | **Unresolved** | The mock start-up alert copy names only the secure-context cause. Cosmetic, and only seen when MSW fails to start. Needs `coder`. |

## Remediation (coder, round 2)

- **Invocation:** `/coder`, with "Fix the remaining TASK-001 review findings N1 and N2 recorded in tasks/TASK-001/review.md (Re-review round 2)".
- **Timestamp:** see the workflow log.

### Changes

**N1**

- **Confirmed before fixing:** a new focus assertion was added to the existing success test (`CreateSession.test.tsx`, "validates required fields, then submits once…"). It **failed** on the round-1 code, with focus not on the banner, which confirms the reviewer's trace.
- **The fix:**
  - `SessionsWorkspace.tsx`: the `CreatedSession` state gains `focusOnMount`, which is set to `latest.current.isCreateOpen` when `onCreated` runs.
  - `CreatedBanner.tsx`: the banner focuses itself on mount only when `focusOnMount` is set, and marks itself with `data-created-focus`.
  - `SessionsWorkspace.tsx`, focus-restore effect: when the create panel closes (`previous === 'new'`), focus goes to the `[data-created-focus]` banner if one is present, otherwise to the Create link.
- **Why two parts:** below 1024px the open modal `<dialog>` makes the banner inert until the dialog is removed, so the banner's own mount-time focus cannot work there. The effect runs after removal and covers that case.
- **Late success** (the user moved to a details panel): `focusOnMount` is false, so focus stays in the details panel. The R2 test now asserts that the details heading keeps focus.

**N2**

- `src/app/MockStartupAlert.tsx` uses neutral copy that lists the common causes: not on localhost or HTTPS, service workers disabled (for example a private window), or `public/mockServiceWorker.js` missing. It also shows the actual error message (`reason`).
- `src/main.tsx` passes the rejection message to the alert.
- `src/index.css` adds spacing for the extra lines.

### Tests

- The **success test** now asserts that the create panel is gone and the `role="status"` banner has focus.
- The **R2 test** now asserts that the details heading keeps focus after a late success.
- There is still 9/9 test coverage (two existing tests were strengthened, with no new test cases).
- The **modal dialog path** (below 1024px) cannot be reproduced in jsdom, because jsdom does not make the background inert. It remains a browser-verify check.

### Checks Run

All run in `client/`:

| Command | Result |
| --- | --- |
| `npm test` | 9/9 passed |
| `npx tsc -b` | exit 0 |
| `npm run lint` | exit 0, no warnings |
| `npm run build` | exit 0 |

### Round-2 Dispositions After Remediation

| Finding | Severity | Disposition | Rationale and impact |
| --- | --- | --- | --- |
| N1 | should-fix | **Resolved** (pending re-review) | Fixed in `SessionsWorkspace.tsx` and `CreatedBanner.tsx`. The focus assertion failed before the fix and passes after it. The modal-dialog variant is still a browser-verify item. |
| N2 | nit | **Resolved** (pending re-review) | Fixed in `MockStartupAlert.tsx` and `main.tsx`. The copy is neutral and includes the error detail. The runtime path still needs a non-secure-context or missing-worker browser run. |

## Re-review (round 3)

- **Role:** `code-reviewer`. The developer invoked it with `/code-reviewer` after Remediation (coder, round 2). It ran in the same isolated, read-only `code-reviewer` subagent.
- **Review surface:** the working tree against `HEAD` `5eff466`, excluding `tasks/` and `package-lock.json`. The review focused on the files changed in coder round 2.
- **Production code changed after this re-review:** none so far.

### Reviewer Verdict (verbatim)

Verdict: NEEDS-CHANGES

N1 and N2 are confirmed resolved. The N1 fix introduced one new should-fix regression (N3): the banner's focus flag outlives its first use. One pre-existing nit (N4) was also found.

### Round-2 Findings: Verification

**N1: CONFIRMED-RESOLVED.** Three paths were checked.

- **Desktop (≥1024 px, inline panel):**
  - `SessionsWorkspace.tsx:58-68` sets `focusOnMount` from `latest.current.isCreateOpen`, which is true while the form is open at success.
  - `CreatedBanner.tsx:31-33` focuses the banner in its mount effect. This happens in commit 1, before the router transition commit removes the panel. The inline panel is not inert.
  - In commit 2 the panel is removed. The workspace effect (`SessionsWorkspace.tsx:74-87`) sees that the banner holds focus and returns at `:79`.
  - The success test asserts this with a final `toHaveFocus` on the `role="status"` banner. The coder reports this assertion failed on the code before the fix.
- **Below 1024 px (modal `<dialog>`):**
  - In commit 1, `focus()` is a no-op because the modal makes the banner inert.
  - In commit 2 the dialog is removed and focus falls to `<body>`. The effect runs `document.querySelector('[data-created-focus]')` and focuses the banner (`SessionsWorkspace.tsx:84-85`, `CreatedBanner.tsx:43`).
  - This is correct by reading the code. jsdom does not make the background inert, so the path still needs a browser check.
- **Late success:**
  - `focusOnMount` is false, so the banner has no `data-created-focus` and no self-focus.
  - The R2 test's last assertion checks that the details heading keeps focus.
  - If the form was closed mid-request, the restore effect ran before the banner existed, so focus went to the Create link.

**N2: CONFIRMED-RESOLVED.**

- `src/app/MockStartupAlert.tsx:1-12` uses neutral copy that names three causes: not on localhost or HTTPS, service workers disabled, or `mockServiceWorker.js` missing. It also prints the actual error in "Details: {reason}".
- `src/main.tsx:16-31` still renders exactly once on each path and passes the error message as `reason`.
- `src/index.css:265-272` only adds spacing.

### R1–R10 Still Hold

| Findings | Evidence |
| --- | --- |
| R1, R2, R5 | The related code in `SessionsWorkspace.tsx` is unchanged (`:94-105`, `:142-145`, `:161-165`). `onCreated` still navigates only when create is open (`:67`). |
| R3, R4, R7 | `SessionFilters.tsx` and `CreateSessionForm.tsx` were not modified in this round. |
| R6 | Still holds. See N2. |
| R10 | `capacity.ts:9` returns "Full". |
| R8, R9 | Unchanged accepted limitations. |

### New Findings

**N3: should-fix. The banner focus flag outlives its first use.**

- **Where:**
  - `src/features/sessions/list/SessionsWorkspace.tsx:64` sets `focusOnMount` once and never clears it.
  - `:35`: the banner is only hidden while filters differ; `created` itself persists.
  - `:84`: `querySelector('[data-created-focus]')` targets any banner that still carries the attribute.
  - `src/features/sessions/list/CreatedBanner.tsx:31-33` refocuses on every mount.
  - `src/features/sessions/list/CreatedBanner.tsx:43` keeps the attribute for the banner's whole lifetime.
- **Failure scenario (a): the banner steals focus from search.**
  1. Create a session with no filters. The banner mounts and takes focus, which is correct.
  2. Type "m" into "Search sessions". After the debounce `filtersKey` changes, the banner unmounts, and `created` persists.
  3. Delete the "m", or press "Clear filters". `handleClear` focuses the search input (`SessionFilters.tsx:58`).
  4. `filtersKey` returns to `|`, so the banner remounts with `focusOnMount: true` and its effect calls `focus()`. Focus is pulled out of the search input mid-typing. Further keystrokes go to the banner `<div>`, and a screen reader re-reads "“…” was created."

  This is a very common sequence: create, then search, then clear. Round-1 code also focused on every mount, unconditionally, so it existed then and the reviewer missed it. Round-2 code avoided it with the body-only guard. This round reintroduces it.
- **Failure scenario (b): the old banner captures focus after a later Cancel.**
  1. After one successful create the banner, with `data-created-focus`, stays visible.
  2. Open "Create session" again, then leave with Cancel, Escape, or the close button.
  3. The focused control is removed with the panel and focus falls to `<body>`. The effect sees `previous === 'new'`, finds the stale banner, and focuses it instead of the Create link.

  A screen-reader user who just cancelled hears "“<previous title>” was created.", which suggests a creation happened when none did. This undermines AC-3.9 ("never has to guess whether creation worked") and AC-2.8 (focus returns to a sensible element).
- **Fix direction:**
  - Make the focus intent single-use. For example, use a workspace ref meaning "focus the banner for session X". Set it in `onCreated` only when create is open, consume it once (in the banner mount effect or the restore effect), then clear it. Alternatively, clear `focusOnMount` with `setCreated` immediately after the first focus.
  - Consider also dropping `created` when filters change, since `ui-design.md` says the banner stays "until it is dismissed or the filters change". Today it resurrects when the filters return.
  - Add tests for both scenarios:
    - create, then search, then clear, and assert the search input keeps focus;
    - create, then reopen create, then Cancel, and assert the Create link has focus.
- **Follow-up role:** coder.

**N4: nit, pre-existing and not a regression. Dismiss drops focus to `<body>`.**

- **Where:** `src/features/sessions/list/SessionsWorkspace.tsx:52` (`onDismiss={() => setCreated(null)}`) and `CreatedBanner.tsx:66`.
- **Failure scenario:** a keyboard user activates "Dismiss". The banner, including the focused button, unmounts, and nothing receives focus. The next Tab starts from the top of the document.
- **Fix direction:** move focus to a stable target on dismiss, such as the list heading `#sessions-heading` or the search input.
- **Follow-up role:** coder.

### How The New Tests Check Behavior

The strengthened assertions are user-observable:

- the create panel heading is gone;
- the `role="status"` banner has focus;
- in the late-success case, the details heading keeps focus.

No test covers the banner remounting after a filter change, a second create, or a Cancel after an earlier success. That is why N3 is not caught.

### Residual Runtime And Test Gaps

- **Browser-only, not yet run:**
  - the N1 path below 1024 px, where the banner receives focus after the dialog is removed;
  - dialog and sheet modes: the drawer at 768–1023 px and the sheet at 390 px, with an inert background and focus restore;
  - mode switching across 1024 px;
  - no horizontal overflow at 390 px;
  - 44 px touch targets.
- **Chrome Escape check below 1024 px:** Escape, then "Cancel" in the confirm dialog, then Escape again, against `Panel.tsx:77-80`, which handles only `onCancel`.
- **Real assistive-technology checks:**
  - the relocated status region (R5);
  - focused-error reading (R4);
  - the banner's success announcement.
- **R6/N2 runtime path:** not exercised. It needs a non-secure-context or missing-worker browser run.
- **Tests still missing:**
  - details 500 and 404 (AC-2.9);
  - the hidden-by-filters banner actions (AC-3.10);
  - `scenario` parameter preservation;
  - `400 VALIDATION_FAILED` mapping (AC-3.7);
  - coaches failure blocking submit (AC-3.11);
  - the N3 and N4 focus paths.

### Context Summary

The reviewer re-read the working tree against `HEAD` `5eff466`, excluding `tasks/` and `package-lock.json`, focusing on the files changed in coder round 2:

- `SessionsWorkspace.tsx`
- `CreatedBanner.tsx`
- `CreateSession.test.tsx`
- `MockStartupAlert.tsx`
- `main.tsx`
- `index.css`

It verified N1 on the desktop, below-1024 px, and late-success paths, and verified N2. It confirmed that R1–R10 still hold and looked for regressions in how long the banner and its focus intent live. No files were modified.

### Evidence

- **Commands run:** read-only `sed` on `tasks/TASK-001/review.md` to read "Remediation (coder, round 2)", and `cat -n` on every changed file and the updated tests.
- **Code basis:** the N1 and N3 analysis relies on `SessionsWorkspace.tsx:35`, `:58-68`, and `:74-87`, and on `CreatedBanner.tsx:31-33` and `:43`. It also relies on React Router wrapping navigations in `startTransition`, which round 2 confirmed in `react-router/dist/development/lib/dom/lib.js:162-166`.
- **Not run by the reviewer:** `npm test`, `tsc -b`, `oxlint`, `vite build`. It relied on the coder-reported results: 9/9 tests passing and all checks exiting 0.
- **Not yet reproduced:** N3 and N4 come from code tracing. No test or browser run reproduces them yet.

### Next Step

- **Primary:** `coder`, to make the banner focus single-use (N3), optionally retire the banner when filters change, add the two regression tests above, and fix N4 in the same pass. N3 is a should-fix regression, so this must happen before a PASS.
- **Alternatives afterwards:**
  - `test-generator`, for the remaining coverage gaps;
  - `browser-verify`, for the dialog and sheet modes, the N1 path below 1024 px, the Chrome Escape check, AT announcements, and console checks.
- The developer chooses which to run. None has been invoked.

### Round-3 Finding Dispositions

These were recorded at re-review time. No production code has changed since.

| Finding | Severity | Disposition | Rationale and impact |
| --- | --- | --- | --- |
| N1 | should-fix | **Resolved** | Confirmed by the reviewer on the desktop and late-success paths, both covered by tests. The modal path below 1024 px is correct by code reading and is still a browser-verify item. |
| N2 | nit | **Resolved** | Confirmed by the reviewer. The runtime path is still unexercised in a browser. |
| N3 | should-fix | **Unresolved** | A regression from the N1 fix: the persistent `focusOnMount` and `data-created-focus` make the banner steal focus after create, search, clear, and capture focus after a later Cancel. Affects AC-3.9 and AC-2.8. Not yet reproduced by a test. Needs `coder`. |
| N4 | nit | **Unresolved** | Pre-existing since round 1. Dismiss leaves focus on `<body>`. Needs `coder`. |
| R1–R7, R10 | — | **Resolved** | Still hold, as the reviewer confirmed in round 3. |
| R8, R9 | nit | **Accepted limitation** | Unchanged. |

## Remediation (coder, round 3)

- **Invocation:** `/coder` with "Fix the remaining TASK-001 review findings N3 and N4 recorded in tasks/TASK-001/review.md (Re-review round 3)". The timestamp is in the workflow log.
- **Tests first:** three regression tests were added before any code change, and all three **failed** on the round-2 code. This confirmed N3 scenario (a), N3 scenario (b), and N4.

### Approach

Rounds 1 and 2 each patched a single banner path, and each patch broke another path. This round enumerated every banner lifecycle path and gave focus a single owner.

### Changes

**N3: `src/features/sessions/list/SessionsWorkspace.tsx`**

- **Single-use focus intent.** The workspace holds the ref `bannerFocusFor` (a created session id). `onCreated` sets it only when the create panel is still open, so a late success never sets it.
- **Focus effect.** One effect, keyed on `[bannerId, openChild]` and declared before the focus-restore effect, focuses the banner. It consumes the intent only when `document.activeElement` is the banner. This means:
  - **Desktop:** the intent is consumed in the first commit.
  - **Below 1024 px:** the modal `<dialog>` keeps the page inert, so the first attempt fails. The commit that removes the dialog (an `openChild` change) retries and succeeds.
  - **Stale intent:** if the banner is retired before focus lands, the effect discards the intent.
- **Banner retirement.** The banner is retired for good when filters change (`setCreated(null)` during render when `created.filtersKey !== filtersKey`). It no longer reappears when the filters return, which matches `ui-design.md`: "stays until dismissed or the filters change".
- **Focus restore.** The restore effect no longer queries `[data-created-focus]`. When the create panel closes without a pending banner focus (Cancel, Escape, close), focus returns to the Create link.

**N3: `src/features/sessions/list/CreatedBanner.tsx`**

- The banner no longer manages its own focus. The `focusOnMount` prop, the mount effect, and `data-created-focus` are removed.
- It accepts a `ref` (React 19 ref-as-prop) so the workspace can focus it.

**N4: `SessionsWorkspace.tsx`, `dismissBanner`**

- "Dismiss" removes the banner and moves focus to the list heading (`#sessions-heading`, `tabIndex={-1}`).

### Tests

All three tests are in `src/features/sessions/create/CreateSession.test.tsx`. Each failed before the fix and passes after it.

| Test | What it asserts |
| --- | --- |
| "does not refocus the banner after create → search → clear (review N3)" | After a create the banner has focus. Search "maya", then Clear filters: the search input keeps focus and the banner is gone (retired). |
| "returns focus to the Create link when a later create is cancelled (review N3)" | After one create, open create again and press Cancel: the Create link has focus. |
| "moves focus to the list heading when the banner is dismissed (review N4)" | Dismiss removes the banner, and the "6 sessions" heading has focus. |

- Existing N1 and R2 focus assertions still pass:
  - the banner is focused after a normal success;
  - the details heading keeps focus after a late success.
- A shared `createSuccessfully()` helper was added to the test file.
- The modal-dialog retry path below 1024 px still cannot be exercised in jsdom, so it remains a browser-verify check.

### Checks Run

All commands ran in `client/`.

| Command | Result |
| --- | --- |
| `npm test` | 12/12 passed. No warnings in the output. |
| `npx tsc -b` | exit 0 |
| `npm run lint` | exit 0, no warnings |
| `npm run build` | exit 0 |
| `grep` for `data-created-focus` and `focusOnMount` in `src/` | no matches |

### Round-3 Dispositions After Remediation

| Finding | Severity | Disposition | Rationale and impact |
| --- | --- | --- | --- |
| N3 | should-fix | **Resolved** (pending re-review) | Fixed by single-use workspace-owned focus and real banner retirement. Both scenarios are reproduced by tests that failed before the fix and pass after it. |
| N4 | nit | **Resolved** (pending re-review) | Dismiss now moves focus to the list heading. Covered by a test that failed before the fix and passes after it. |

## Re-review (round 4)

- **Role:** `code-reviewer`. The developer invoked it with `/code-reviewer` after Remediation (coder, round 3). It ran in the same isolated, read-only `code-reviewer` subagent as the earlier rounds.
- **Review surface:** the working tree against `HEAD` `5eff466`, excluding `tasks/` and `package-lock.json`, with a focus on the round-3 remediation.
- **Production code changed after this re-review:** none.

### Reviewer Verdict (verbatim)

Verdict: PASS

- N3 (both scenarios) and N4 are confirmed resolved.
- N1 still holds on all three paths, and R1–R10 still hold.
- No new blocking or should-fix defect was found.
- Remaining items are runtime and test gaps.

### Round-3 Findings: Verification

**N3 (a), create → search → clear: CONFIRMED-RESOLVED.**
- `src/features/sessions/list/SessionsWorkspace.tsx:47` retires the banner during render (`setCreated(null)`) as soon as `created.filtersKey` differs from the current filters. Returning to the old filters does not resurrect it, so it cannot refocus.
- `CreatedBanner.tsx` has no self-focus: there is no effect and no data attribute (`:16-28`).
- "Clear filters" still focuses search (`SessionFilters.tsx:53-59`).
- The test "does not refocus the banner after create → search → clear (review N3)" asserts that search keeps focus and the banner is gone.

**N3 (b), a later Cancel captures focus on the stale banner: CONFIRMED-RESOLVED.**
- The restore effect (`SessionsWorkspace.tsx:111-123`) no longer queries the banner. When create closes, it focuses `createLinkRef` (`:117-119`).
- Banner focus is a one-time intent, `bannerFocusFor` (`:56`). It is set only in `onCreated` while create is open (`:79-82`) and is consumed on use.
- The test "returns focus to the Create link when a later create is cancelled (review N3)" covers this with the stale banner still visible.

**N4, Dismiss drops focus: CONFIRMED-RESOLVED.**
- `dismissBanner` (`SessionsWorkspace.tsx:104-107`) focuses `#sessions-heading` (`tabIndex={-1}`, `:183`) before the banner unmounts.
- The test "moves focus to the list heading when the banner is dismissed (review N4)" covers this.

### N1 Still Holds

**Desktop (inline panel).** React Router's `startTransition` splits the success into two commits.
- **Commit 1:** the banner mounts. The focus effect (`:93-102`) sees `bannerId === target`. The inline panel is not inert, so `focus()` succeeds and the intent is cleared (`:101`).
- **Commit 2:** the panel is removed. The focus effect exits because `target === null`. The restore effect is declared after it, sees that the banner holds focus (`:116`), and stands down.
- The success test asserts banner focus.

**Below 1024 px (modal dialog).**
- **Commit 1:** `focus()` is a no-op on the inert banner. `activeElement` is not the banner, so the intent is kept.
- **Commit 2:** `openChild` goes from `'new'` to `null`. The dialog is gone from the DOM. The focus effect runs first, focuses the banner, and clears the intent. The restore effect then stands down.
- Correct by reading; browser confirmation is still needed.

**Late success.** `bannerFocusFor` is never set (`:79`), so focus is not moved. The R2 test asserts that the details heading keeps focus.

### R1–R10 Still Hold

| Finding | Evidence |
| --- | --- |
| R1 | Derived from `shown` (`SessionsWorkspace.tsx:126-137`). |
| R2 | `onCreated` reads `latest` and navigates only while create is open (`:75-83`). |
| R3 | `SessionFilters.tsx:53-61` is unchanged. |
| R4 | `CreateSessionForm.tsx:74-78` is unchanged. |
| R5 | The status region is still outside the `aria-busy` section (`SessionsWorkspace.tsx:175-178`). |
| R6 / N2 | `main.tsx:16-31` is unchanged. |
| R7 | `CreateSessionForm.tsx:267` is unchanged. |
| R10 | `capacity.ts:9` is unchanged. |
| R8, R9 | Still accepted limitations. R9's banner "Clear filters" now retires the banner and leaves focus on search, which matches `ui-design.md`. |

No `data-created-focus`, `focusOnMount`, or `toIsoAttribute` remains in `src/`.

### Regression Hunt: No New Findings

- **Render-time `setCreated(null)`:**
  - The guard at `:47` fires only while the keys differ. The next render has `created === null`, so there is no loop.
  - It is idempotent under StrictMode's double render.
  - With R9's banner "Clear filters", `clear()` focuses search, then the filter transition retires the banner.
- **Stale-intent discard (`:96-98`):**
  - The intent is dropped only when the banner is absent **and** no panel is open.
  - If the banner is retired before focus lands (for example, filters changed during create), the intent is dropped once the panel closes. It cannot outlive its banner.
  - A valid intent is never dropped early, because in both commits either the banner id matches or a panel is still open.
- **Second create while a banner exists:** the same element is reused (no key). The `bannerId` change re-runs the effect, which focuses it, with the same desktop and dialog behavior as above.
- **Create success while filters differ from submit-time filters:**
  - `onCreated` uses `latest.current.filtersKey`, so the banner is keyed to the filters current at success.
  - `latest` updates in a passive effect (`:71-73`). A filter transition committed but not yet effect-flushed within the same few milliseconds could key the banner to the old filters. The banner would then retire immediately and the intent would be dropped. This is negligible.
- **Effect order:** the `latest`, focus, and restore effects run in declaration order (`:71`, `:93`, `:111`). Because the focus effect runs before the restore effect, the restore effect stands down correctly.
- **Hidden-by-filters banner:** focus behavior is the same as for a visible banner. Only the copy and actions differ (`CreatedBanner.tsx:31-44`).

### Residual Runtime And Test Gaps

**Browser-verify, dialog mode below 1024 px:**
- Confirm that the banner receives focus after the dialog is removed (the N1 retry path).
- Confirm that the intent is consumed. If focus ever failed in commit 2, the intent would linger while that banner exists and be retried on the next `openChild` change, for example when opening a session row. It would then pull focus from the details heading to the banner. By reading this cannot happen, because the page is no longer inert after the dialog is removed, but it needs a real browser.

**Browser-verify, other checks:**
- the 768–1023 px drawer and 390 px sheet: inert background, focus restore, mode switching across 1024 px, no horizontal overflow at 390 px, and 44 px targets;
- the Chrome sequence Escape → confirm "Cancel" → Escape, against `Panel.tsx:77-80`;
- assistive-technology announcements for the status region, focused errors, and the banner;
- the mock start-up failure path (R6/N2);
- console cleanliness on the primary flows (AC-9.3).

**Tests still missing**, for test-generator:
- details 500 and 404 (AC-2.9);
- the hidden-by-filters banner actions, including focus after its "Clear filters" (AC-3.10);
- preservation of the `scenario` parameter;
- `400 VALIDATION_FAILED` mapping (AC-3.7);
- coaches failure blocking submit (AC-3.11);
- a second create while a banner is shown.

### Context Summary

The reviewer re-read the round-3 remediation against the same base (working tree vs `HEAD` `5eff466`, excluding `tasks/` and `package-lock.json`):
- `SessionsWorkspace.tsx` and `CreatedBanner.tsx`;
- the new and strengthened tests in `CreateSession.test.tsx`;
- spot checks of earlier fixes in `SessionFilters.tsx`, `CreateSessionForm.tsx`, `capacity.ts`, and `main.tsx`.

No files were modified. All open findings are resolved or accepted, so the verdict is PASS, with the residual browser and test gaps listed above.

### Evidence

- **Commands run (read-only):**
  - `sed` on `tasks/TASK-001/review.md` for "Remediation (coder, round 3)";
  - `cat -n` and `sed` on `SessionsWorkspace.tsx`, `CreatedBanner.tsx`, and the new tests and their helper;
  - `grep` to confirm the R3, R4, R7, R10, and R6 fixes are intact, and that no `data-created-focus`, `focusOnMount`, or `toIsoAttribute` references remain.
- **Prior evidence reused:** the commit-ordering analysis relies on React Router wrapping location updates in `startTransition`, confirmed in round 2 at `react-router/dist/development/lib/dom/lib.js:162-166` and `components.js:385-389`.
- **Not run by the reviewer:** `npm test`, `tsc -b`, `oxlint`, and `vite build`. The reviewer relied on the coder-reported results: 12/12 tests passing, all checks exiting 0, and the 3 new tests failing on the round-2 code. No browser checks were run.

### Next Step

- **Primary:** `browser-verify`, to confirm the dialog-mode focus path, the 390 px and 768–1023 px layouts, the Chrome Escape behavior, the assistive-technology announcements, and console cleanliness. These are the main unproven risks now that no blocking or should-fix findings remain.
- **Alternatives:** `test-generator`, for the coverage gaps above; `verify`, after browser evidence exists.
- The developer chooses which to run. None has been invoked.

## Final Finding Dispositions (after round 4)

| Finding | Severity | Disposition | Where resolved / rationale |
| --- | --- | --- | --- |
| R1 | should-fix | **Resolved** | Coder round 1. Confirmed in rounds 2, 3, and 4. |
| R2 | should-fix | **Resolved** | Coder round 1. Confirmed in rounds 2, 3, and 4. |
| R3 | nit | **Resolved** | Coder round 1. Confirmed in rounds 2, 3, and 4. |
| R4 | nit | **Resolved** | Coder round 1. Confirmed in rounds 2, 3, and 4. AT reading is still a browser gap. |
| R5 | nit | **Resolved** | Coder round 1. Confirmed in rounds 2, 3, and 4. AT announcement is still a browser gap. |
| R6 | nit | **Resolved** | Coder round 1 (copy refined in round 2 as N2). The runtime path is still a browser gap. |
| R7 | nit | **Resolved** | Coder round 1. Confirmed in rounds 2, 3, and 4. |
| R8 | nit | **Accepted limitation** | Type-only `api/` → `features/` import that follows `api-integration.md`. Needs a docs reconciliation, not a code change. The reviewer agreed. |
| R9 | nit | **Accepted limitation** | Matches the approved `ui-design.md`. The AC-3.10 outcome is met. The reviewer agreed. |
| R10 | nit | **Resolved** | Coder round 1. Confirmed in rounds 2, 3, and 4. |
| N1 | should-fix | **Resolved** | Coder rounds 2 and 3. Confirmed in round 4. The dialog path below 1024 px is still a browser gap. |
| N2 | nit | **Resolved** | Coder round 2. Confirmed in rounds 3 and 4. |
| N3 | should-fix | **Resolved** | Coder round 3. Confirmed in round 4. |
| N4 | nit | **Resolved** | Coder round 3. Confirmed in round 4. |

No finding is disputed or unresolved.

## Re-review (round 5): browser-verify remediation (BV-1, BV-2)

- **Role:** `code-reviewer`. The developer invoked it with `/code-reviewer`, described in the request as `/code-verifier`, which was interpreted as `code-reviewer`. It ran after the coder fixed browser-verify findings BV-1 and BV-2, in the same isolated, read-only `code-reviewer` subagent.
- **Review surface:** the working tree against `HEAD` `5eff466`, excluding `tasks/` and `package-lock.json`. The review covered `src/features/sessions/ui/Panel.tsx`, `src/features/sessions/sessions.css`, and the new `src/features/sessions/ui/Panel.test.tsx`.
- **Production code changed after this review:** none.

### Reviewer Verdict (verbatim)

Verdict: PASS

BV-1 and BV-2 are confirmed resolved, and all earlier fixes still hold. One non-blocking test-hygiene nit (N5) was found.

### Browser-Verify Findings: Verification

**BV-1: CONFIRMED-RESOLVED.** The fix is in `src/features/sessions/ui/Panel.tsx:82-94`, with the focus tracker at `:95-99`.

- **Chrome's second Escape:**
  1. The non-cancelable `cancel` still reaches `onCancel` (`:78-81`), which calls `requestClose` and so `confirm()`.
  2. When the user declines, Chrome closes the dialog natively and queues `close`.
  3. The handler checks the dialog is connected and not open (`:89`), calls `showModal()` (`:90`), and restores focus to the last focused control, or to the heading (`:91-93`).

  The form input lives in `CreateSessionForm` state above `Panel`, so it is untouched. The route stays `/sessions/new` and the panel is visible again.
- **Legitimate closes:** the route closes the panel by unmounting it. React removes the `<dialog>` from the DOM, and the HTML "dialog removing steps" do not fire `close`. A `close` that arrived after removal would exit at `!dialog.isConnected` (`:89`). Nothing in the app calls `dialog.close()`. A reopen therefore happens only while the panel is mounted.
- **No loop or trap:**
  - A reopen happens only after a user Escape that the user then declined in `confirm`. It never repeats on its own. Each later Escape asks again, because the non-cancelable `cancel` still fires.
  - The user can always leave:
    - accept "Discard": `onClose` navigates, and the unmount removes the dialog;
    - the Cancel button or the × button;
    - Escape on a clean form, where the first `cancel` is cancelable and the app navigates.
  - Possible cosmetic case: after an *accepted* discard on a non-cancelable Escape, the queued `close` may run before the route change commits. That causes a brief reopen, with the 150 ms `panel-in` animation, before the dialog is removed. The end state is correct.
- **Reopen versus route sync:** reopening is the right behavior. The user explicitly chose to keep their input. Syncing the route would unmount the form and lose that input, which is exactly the BV-1 harm.
- **Focus restore:** `onFocus` is React's bubbling focus event, so it records every focused descendant (`:95-99`). After `showModal()`, focus returns to that element if it is still inside the dialog, and otherwise to the heading.
- **Details panel:** it uses the same `DialogPanel`, and its `onClose` navigates with no `confirm`. A forced native close there causes at most a brief reopen until the route change removes the dialog. There is no behavior change and no trap.
- **InlinePanel (≥1024 px):** unaffected (`:40-60`).

**BV-2: CONFIRMED-RESOLVED.** In `src/features/sessions/sessions.css:88-98`, inside `@media (max-width: 767px)`, `.filters__field` now precedes `.filters__field--search { flex-basis: 100%; max-width: none; }`. The search field resolves to `flex: 1 1 100%`, and Status and Clear filters wrap to the next row.

### Earlier Findings Still Hold

Only `Panel.tsx`, `sessions.css`, and the new `Panel.test.tsx` changed. None of them touch the code behind the earlier findings.

| Findings | Evidence |
| --- | --- |
| R1–R5, R7, R10, N1, N3, N4 | `SessionsWorkspace.tsx`, `CreatedBanner.tsx`, `SessionFilters.tsx`, `CreateSessionForm.tsx`, and `capacity.ts` are unchanged. On the N1 dialog path, a successful create still removes the dialog by unmounting, so the new `close` handler does not interfere and the second-commit banner focus is unchanged. |
| R6, N2 | `main.tsx` and `MockStartupAlert.tsx` are unchanged. |
| R8, R9 | Still accepted limitations. |

No new production regressions were found.

### New Findings

**N5: nit. `Panel.test.tsx` deletes jsdom's native `open` accessor instead of restoring it.**

- **Where:** `src/features/sessions/ui/Panel.test.tsx:19-24` redefines `open`. Then `:37-39` runs `Reflect.deleteProperty(HTMLDialogElement.prototype, 'open')`.
- **Problem:** jsdom defines a native `open` getter on `HTMLDialogElement.prototype` (`node_modules/jsdom/lib/generated/idl/HTMLDialogElement.js:106`). Redefining and then deleting it removes the property for good, not just the stub.
- **Failure scenario:** a second test added to this file would see `dialog.open === undefined`. `DialogPanel`'s mount effect would then call the deleted `showModal()` and throw `TypeError: dialog.showModal is not a function`.
- **Why nothing fails today:** there is only one test in the file. Vitest's default per-file isolation also prevents a leak into other files, and `vite.config.ts` does not override `isolate`.
- **Fix direction:** capture the original descriptors and restore them in `afterEach`, or use `vi.spyOn`/`vi.stubGlobal`-style helpers.
- **Follow-up role:** test-generator, or coder.

**Stub fidelity:** adequate for what the test claims, which is that a native close while the route is active reopens the panel with its content and focus. There are two simplifications:
- `close()` dispatches `close` synchronously, where browsers queue it as a task. The handler does not depend on timing.
- The test does not exercise the `cancel` → `confirm` step, or that an unmount does not reopen the dialog (the `isConnected` guard).

### Residual Runtime And Test Gaps

**Browser checks:**
- **BV-1 in Chromium at 390 px and at 768–1023 px:**
  - On a dirty form: Escape, decline, then Escape, decline. The sheet should reopen with the input and focus intact, and the route should stay `/sessions/new`.
  - The same sequence but accepting the second time: the sheet should close, focus should go to the Create link, and at most a brief reopen flicker should appear.
  - On the details sheet: Escape twice quickly.
- **BV-2 at 390 px:** confirm the search field is full width and the placeholder is not truncated.
- **Firefox and Safari:** close-watcher behavior is still unverified.
- **Carried over:** real screen-reader speech, the mock start-up failure path (R6/N2), resizing across 1024 px with a panel open, and long-content stress.

**Tests still missing**, for test-generator:
- details 500 and 404 (AC-2.9);
- the hidden-by-filters banner actions (AC-3.10);
- `scenario` parameter preservation;
- `400 VALIDATION_FAILED` mapping (AC-3.7);
- coaches failure blocking submit (AC-3.11);
- a second create while a banner is shown;
- a `DialogPanel` test that an unmount does not reopen the dialog.

### Context Summary

This was a read-only review of the coder's fixes for BV-1 and BV-2, against the working tree vs `HEAD` `5eff466`, excluding `tasks/` and `package-lock.json`. The reviewer:

- read the defect report and remediation in `tasks/TASK-001/browser-verification.md`;
- read the updated `Panel.tsx`, the mobile rules in `sessions.css`, the new `Panel.test.tsx`, and `src/test/setup.ts`;
- checked jsdom's dialog support.

No files were modified.

### Evidence

- **Commands run (read-only):**
  - `sed` on `browser-verification.md`, from "Defects Found" through the remediation;
  - `cat -n` on `Panel.tsx`, `Panel.test.tsx`, and `setup.ts`;
  - `grep` on `sessions.css` for the mobile media query;
  - `grep` and `cat` in `node_modules/jsdom`. `HTMLDialogElement-impl.js` is an empty class, so jsdom has no `showModal` or `close`. `lib/generated/idl/HTMLDialogElement.js:106` defines a native `get open()`.
- **Not run by the reviewer:** `npm test`, `tsc -b`, `oxlint`, and `vite build`. It relied on the coder-reported results: 13/13 tests passing, all checks exiting 0, and the new test failing with `onClose` removed. No browser checks were run.

### Next Step

- **Primary:** `browser-verify`, to rerun the BV-1 Escape sequences (decline and accept, at 390 px and 768–1023 px, plus the details sheet) and the BV-2 layout check. No blocking or should-fix findings remain, so real-browser confirmation of these fixes is the main open risk.
- **Alternatives:** `test-generator`, for N5 and the coverage gaps; `verify`, after the browser evidence is updated.
- The developer chooses which to run. None has been invoked.

### Round-5 Dispositions

| Finding | Severity | Disposition | Rationale and impact |
| --- | --- | --- | --- |
| BV-1 | should-fix | **Resolved**, pending browser re-verify | The code fix and test are confirmed by the reviewer. Real-browser confirmation is the next step. |
| BV-2 | nit | **Resolved**, pending browser re-verify | The CSS order fix is confirmed by the reviewer. Real-browser confirmation is the next step. |
| N5 | nit | **Unresolved** | A test-hygiene issue: deleting jsdom's native `open` accessor would break a future second test in the file. Nothing fails today, because the file has one test and Vitest isolates files. Needs test-generator or coder. |
| R1–R10, N1–N4 | — | Unchanged (12 resolved, R8 and R9 accepted limitations) | The reviewer confirmed they still hold. |
