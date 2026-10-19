# TASK-001: Final Report

Training Sessions Workspace. This report was assembled by `docs-generator` on 2026-10-19 from evidence that other roles had already produced. It adds no new checks or observations. Details are in the linked artifacts.

| Artifact | Contents |
| --- | --- |
| [requirements.md](requirements.md) | Acceptance criteria AC-1 to AC-9, assumptions, open questions |
| [architecture.md](architecture.md) | Decisions D1 to D8 |
| [api-integration.md](api-integration.md) | Contract classification, assumptions AI-1 to AI-13, state/error matrix |
| [ui-design.md](ui-design.md) | Layout, state matrix, responsive and accessibility rules |
| [implementation-plan.md](implementation-plan.md) | File-level plan and essential tests |
| [review.md](review.md) | Code review rounds 1 to 5 and dispositions |
| [browser-verification.md](browser-verification.md) | Browser runs 1 and 2, BV findings, evidence matrix |
| [verification.md](verification.md) | Final check commands and known limitations |
| [workflow-log.md](workflow-log.md) | Role sequence, prompts, decisions |
| [evidence/](evidence/) | Screenshots |

## Outcome

| Gate | Verdict | Source |
| --- | --- | --- |
| Code review (final, round 5) | **PASS** | [review.md](review.md), "Re-review (round 5)" |
| Browser verification (final, round 2) | **PASS**, with one open nit (BV-3) | [browser-verification.md](browser-verification.md), "Re-verification (browser-verify round 2)" |
| Project checks (`verify`) | **PASS** | [verification.md](verification.md) |

## Implemented Scope

Each item below was verified by the tests listed in `verification.md` and the browser runs in `browser-verification.md`.

- **Sessions workspace at `/sessions`:**
  - Each row shows title, type, status, start, duration, coach, location, capacity, and booked count.
  - The status filter and debounced search are applied by the MSW handler.
  - Filters live in the URL (`?query=&status=`), so the optional URL-sync extension is delivered as a side effect.
  - "Clear filters" resets them.
  - Status badges use text plus a symbol, not color alone.
  - Desktop shows a table; below 768 px each session is a card.
- **Details at `/sessions/:sessionId`:**
  - Deep-linkable. Shows description, trainer notes, capacity summary, coach contact, cancellation info, and created and updated timestamps.
  - The details panel is an inline panel at 1024 px and above, a modal drawer from 768 to 1023 px, and a full-screen sheet below 768 px.
  - Escape, Close, and "Back to sessions" return to the list with its filters, and focus goes back to the originating row.
  - A 500 response shows an error with retry. A 404 shows "This session no longer exists".
- **Create at `/sessions/new`:**
  - Client validation covers every field rule in the spec, including a future start in local time.
  - Field errors are programmatically associated with their inputs, and focus moves to the first invalid field.
  - Double-clicking submit sends exactly one POST.
  - The pending state ("Creating…") is visible and announced.
  - Entered values are preserved after a server error.
  - `400 fieldErrors` are mapped to fields.
  - The coaches-failure state blocks submit and states the reason.
  - After success a banner receives focus. The new session is shown with a "New" tag, or, if the active filters hide it, the banner offers "Open session" and "Clear filters".
- **Required UI states, all observable in the browser:**
  - initial loading;
  - populated;
  - empty;
  - no matches;
  - list error;
  - details error;
  - coaches error;
  - create pending, success, validation error, and server error.
- **Mock API boundary (`src/mocks/`):**
  - MSW 2.14.6 implements the contracted endpoints.
  - The six required scenarios are selected with `?scenario=` inside the mock layer only.
  - Fixture timestamps are rebased against `referenceNow`.
  - Create is stateful and kept in memory.
  - Presentation code never branches on a scenario.

## Missing Required Behavior

None is recorded as missing. Every required item above has test or browser evidence.

- **Documentation gap (Definition of Done #3 / AC-9.1):** `README.md` is still the Vite template. The start command exists (`npm run dev`) and is documented in this report under "Evaluator Reproduction Steps", but not in the README. Updating the README was outside this assembly request.
- **Optional extensions not implemented:**
  - session-type filter;
  - pagination;
  - cancellation, read-only mode, and the optional mock scenarios;
  - background refresh;
  - optimistic updates.

## Decisions That Shaped The Result

**Architecture** ([architecture.md](architecture.md)), confirmed by the developer:

- **Routing:** `react-router@8` in declarative mode. Details and create are child routes, so the list stays mounted.
- **Filter ownership:** URL search params are the only owner of filter state.
- **Server state:** plain React feature hooks. No data library was added.
- **Tests:** Vitest with Testing Library and jsdom, running against the same MSW handlers through `msw/node`.
- **Boundaries:** `api/` → `features/` → `app/`; mocks are isolated.
- **Backend replaceability:** setting `VITE_API_MOCKING=off` disables the mock layer.

**API integration** ([api-integration.md](api-integration.md)):

- **Contract:** used exactly as specified, with no proposed changes.
- **Errors:** every failure is normalized to an `ApiError` in `src/api/http.ts`, the only `fetch` call site.
- **Dates:** parsed once in `src/api/mappers.ts`.
- **Assumptions:** AI-1 to AI-13 are documented. For example, search also matches the location address, and a created session starts as `scheduled` with `bookedCount: 0`.

**UI** ([ui-design.md](ui-design.md)):

- **Design source:** the supplied design tokens and reference layout, with three deliberate deviations.
- **Top bar instead of a sidebar:** this avoids dead navigation links.
- **Type filter omitted:** it is an optional extension.
- **Control borders use `text-muted`:** the reference color `#AAB6B9` has 2.08:1 contrast, which fails the 3:1 minimum. The replacement gives 5.50:1.

## New Dependencies And Trade-Offs

| Dependency | Kind | Reason | Trade-off |
| --- | --- | --- | --- |
| `react-router@^8.4.0` | runtime | Deep links, nested panel routes, URL search params | One runtime dependency, in exchange for not hand-rolling history handling |
| `vitest@^5.0.5`, `jsdom@^30.1.3`, `@testing-library/react@^16.3.3`, `@testing-library/dom@^10.4.2`, `@testing-library/user-event@^14.6.8`, `@testing-library/jest-dom@^7.0.1` | dev | Behavior tests that reuse the Vite transform and the MSW handlers | jsdom implements neither `<dialog>.showModal()` nor `matchMedia`, so tests stub both and real-browser evidence covers the gap. This gap is why BV-3 was missed by unit tests. |

`msw` was already declared as `^2.14.6` (resolving to 2.14.6) and was left unchanged. See open question Q7 in [requirements.md](requirements.md).

## Review Findings And Remediation

The full history is in [review.md](review.md).

| Round | Verdict | Findings |
| --- | --- | --- |
| 1 | NEEDS-CHANGES | R1 and R2 (should-fix), R3–R10 (nits) |
| 2 | NEEDS-CHANGES | R1–R7 and R10 resolved. New: N1 (should-fix, banner focus regression), N2 |
| 3 | NEEDS-CHANGES | N1 and N2 resolved. New: N3 (should-fix, banner focus intent persisting), N4 |
| 4 | **PASS** | N3 and N4 resolved |
| 5 (browser fixes) | **PASS** | BV-1 and BV-2 resolved. New: N5 (nit) |

**Disposition summary:**

- **Resolved (12):** R1–R7, R10, N1–N4.
- **Accepted limitations (2):** R8 and R9.
- **Unresolved, non-blocking (1):** N5.
- **Disputed:** none.

Each should-fix finding has a regression test. Each of those tests was shown to fail with its fix temporarily reverted.

## Browser Verification

The full record is in [browser-verification.md](browser-verification.md).

**Run 1:** **FAIL**.

- **Matrix:** all required rows passed.
- **BV-1 (should-fix):** below 1024 px, pressing Escape a second time on a create form with unsaved input closed the dialog natively, but the route stayed `/sessions/new`. Create became unreachable and the input was lost.
- **BV-2 (nit):** on mobile the search field was not full width.

**Run 2:** **PASS**, after coder remediation and a round-5 review PASS.

- **BV-1 resolved:** confirmed in a headed Chromium session at 390×844 and 900×1000. The dialog reopens with its input and route kept. A headless run delayed the native `close` event until the next frame, which is a test-environment artifact.
- **BV-2 resolved.**
- **Matrix regression pass:** all rows passed again.
- **BV-3 (nit) found:** after the reopen, focus goes to the panel heading rather than the last-edited field.

**Environment (both runs):**

- **URL:** `http://localhost:5173/sessions`, served by the developer-owned Vite process (PID 69550). The role neither started nor stopped it.
- **Adapter sessions:** `task001-verify`, `task001-reverify`, and `task001-reverify-headed`. All were closed, and the final session list was empty.
- **Console:** only Vite, React DevTools, and `[mocks]` info lines. No app errors.
- **Page errors:** none observed.
- **Network:** every non-2xx status was intended by the active scenario.

**Evidence in [evidence/](evidence/):**

| Group | Files |
| --- | --- |
| Required | `populated-desktop.png` (1440×900), `populated-mobile.png` (390×844) |
| Flows | `create-validation-desktop.png`, `create-pending-desktop.png`, `create-success-desktop.png`, `create-success-mobile.png`, `create-hidden-by-filters-desktop.png`, `create-failure-preserved-desktop.png`, `create-mobile-sheet.png` |
| States | `empty-desktop.png`, `no-matches-desktop.png`, `list-error-desktop.png`, `details-error-desktop.png`, `coaches-error-desktop.png` |
| Layout and focus | `details-desktop.png`, `details-mobile-sheet.png`, `details-tablet-drawer.png`, `keyboard-focus-row-desktop.png` |
| BV-1 | `escape-dirty-create-mobile-defect.png` (defect, run 1), `bv1-headed-reopened-mobile.png`, `bv1-headed-reopened-tablet.png`, `bv1-headless-reopen-after-frame-mobile.png`, `bv1-reopened-mobile.png` |

## Commands And Verdicts

These are copied from [verification.md](verification.md). All were run in `client/` with Node v24.18.0 and npm 11.16.0.

| Command | Exit code | Result |
| --- | --- | --- |
| `npm test` | 0 | 3 files, 13/13 tests passed, no warnings |
| `npx tsc -b` | 0 | No diagnostics |
| `npm run lint` | 0 | No warnings or errors |
| `npm run build` | 0 | Built; the MSW worker is a separate lazy chunk |

Formatting and end-to-end checks are not applicable, because the project defines neither.

**Scope:**

- `HEAD` is `5eff466`, and all changes are staged.
- `git diff --stat HEAD`, excluding `package-lock.json` and `tasks/`, reports 68 files changed.
- `frontend-accelerator-assessment/` is unchanged.

## Known Limitations

The full list is in [verification.md](verification.md), under "Known Limitations".

**Open nits:**

- **BV-3:** focus after a forced dialog reopen goes to the heading instead of the last-edited field.
- **N5:** `Panel.test.tsx` deletes jsdom's native `open` accessor instead of restoring it.

**Accepted:**

- **R8:** `api/` imports a type from `features/`, a conflict between two planning docs.
- **R9:** the success banner is retired when filters change.

**Not verified:**

- real screen-reader speech;
- Firefox and Safari;
- the mock start-up failure path;
- resizing across 1024 px while a panel is open;
- long-content stress.

**No automated tests yet for:**

- details 500 and 404;
- the hidden-by-filters banner actions;
- `scenario` parameter preservation;
- the 400 field-error mapping;
- coaches failure blocking submit.

Most of these were exercised in the browser instead.

**Process:**

- **Doctor:** `DEGRADED`, caused only by the Codex hook. The Claude hooks are ACTIVE.
- **No Git checkpoint before coding:** the developer declined one. Ordering evidence is the timestamped [workflow-log.md](workflow-log.md).
- **`msw` version:** declared with a `^` range rather than pinned.
- **README:** not updated.

## Assumptions

These are taken from [requirements.md](requirements.md) (A1–A8) and resolved in [api-integration.md](api-integration.md) (AI-1 to AI-13).

- Search matches title, coach name, location name, and address, case-insensitively.
- The server's `status` is authoritative.
- A created session is `scheduled`, with `bookedCount: 0` and id `ses_1001` and up.
- Text is trimmed, and empty optional fields are sent as `null`.
- The list keeps server order.
- In the `empty` scenario, the store starts empty but create still works.
- `create-error` returns 500 on every POST.
- `400 INVALID_FILTER` uses the list-error path.

Five non-blocking questions for the evaluator are listed in `api-integration.md`.

## Accelerator Workflow

[workflow-log.md](workflow-log.md) records 18 role invocations between 14:09 and 15:47 CEST. Every role was selected manually by the developer, and every role stopped after its own work:

1. `requirements-analyst`
2. `architect`
3. `api-integration`
4. `ui-designer`
5. `writing-plans`
6. `coder`
7. `code-reviewer`
8. Three rounds of `coder` and `code-reviewer`
9. `browser-verify`
10. `coder`
11. `code-reviewer`
12. `browser-verify`
13. `verify`

**Contextual roles that were not used:**

- `brainstorm`: the product scope was unambiguous.
- `debugger`: the developer chose `coder` for BV-1.
- `test-generator`: not invoked. The coverage gaps are listed above.
- `git-worktrees`, `reflect`: not needed.

## Developer-Reported Time

| Field | Value (from [workflow-log.md](workflow-log.md)) |
| --- | --- |
| Active work started | 2026-10-19 14:09 CEST |
| Active work finished | 2026-10-19 15:55 CEST (set at the developer's instruction) |
| Substantial breaks | Not reported by the developer |
| Active time | Not reported by the developer; it equals calendar time only if there were no breaks |
| Calendar time | 1 h 46 min (14:09–15:55 CEST) |

The finish time was recorded in `workflow-log.md` at the developer's instruction. Breaks and active time were not reported, and agents do not infer them.

The log's "Manual Browser Observation" section summarizes the `browser-verify` runs. The browser adapter drove those runs at the developer's request, against the developer-started dev server.

## Evaluator Reproduction Steps

Run these from `client/`. The commands come from `package.json` and the verified runs. Dependency installation was not re-run during verification.

1. Install dependencies with `npm install`. A lockfile is present. The project needs Node 24 or later.
2. Run the checks:
   - `npm test`
   - `npx tsc -b`
   - `npm run lint`
   - `npm run build`
3. Start the app with `npm run dev`. Open the URL that Vite prints; in the verified runs it was `http://localhost:5173`. The route is `/sessions`.
4. Select mock scenarios with a query parameter on page load:

   | Scenario | URL |
   | --- | --- |
   | normal | `/sessions` (default) |
   | empty | `/sessions?scenario=empty` |
   | list-error | `/sessions?scenario=list-error` |
   | details-error | `/sessions/ses_101?scenario=details-error` |
   | coaches-error | `/sessions/new?scenario=coaches-error` |
   | create-error | `/sessions/new?scenario=create-error` |

   The mock data resets on every page load.
5. Optionally, set `VITE_API_MOCKING=off` to disable MSW, for example to run against a real same-origin backend.
