# TASK-001: Browser Verification

- **Role:** `browser-verify`, invoked by the developer with `/browser-verify`.
- **Date:** 2026-10-19, 15:24–15:31 CEST.
- **Verdict: FAIL.** Every required evidence-matrix row passes. One reproducible defect, BV-1, was found outside the matrix: on narrow viewports, the Escape key can desync the create dialog from the route and discard input the user chose to keep. One design deviation (BV-2) is also recorded.

## Runtime And Ownership

| Item | Value |
| --- | --- |
| Readiness gate | `node toolchain/bin/doctor.mjs --json` returned top-level `DEGRADED`. `capability:browser` is **PASS** (agent-browser@0.32.3), `hooks:claude` is **PASS** (ACTIVE), and Node 24.18.0 is **PASS**. `DEGRADED` comes only from `hooks:codex` (PENDING_ACTIVATION), which is not the assessed runtime, so the role was not blocked. |
| Browser adapter | `node toolchain/bin/agent-browser.mjs`, the project adapter only. No global binary was used. |
| Adapter session name | `task001-verify` |
| Discovered URL | `http://localhost:5173/sessions`. This is the existing project dev server: PID 69550, `node …/client/node_modules/.bin/vite`, started 2026-10-19 15:21:36, listening on `[::1]:5173`. Discovered with `ps`/`lsof` and probed with `curl` (`200`). |
| Server ownership | **The developer's process, not started by this role.** No server was started, and PID 69550 was **not stopped**; it was still running after verification. |
| Mock scenario selection | `?scenario=<name>` on page load, logged by the mock layer as `[mocks] MSW active with scenario "<name>"`. Each `open` reloads the app, which starts a fresh in-memory mock store. |
| Session closure | `close` returned "✓ Browser closed". A later read-only probe (`get url`) accidentally relaunched a blank session; it was closed again. The final `session list` printed "No active sessions" twice. Only `task001-verify` was ever opened or closed. No other session or user browser was touched. |

## Required Evidence Matrix

| State or flow | URL / viewport | Interaction steps and observations | Verdict | Evidence |
| --- | --- | --- | --- | --- |
| **Populated workspace (desktop)** | `/sessions`, 1440×900 | <ul><li>Content: the `snapshot -i` accessibility tree shows the skip link, Primary nav, h1 "Training sessions", the "Create session" link, the searchbox "Search sessions", the combobox "Status", the region/h2 "5 sessions", and a table with five columns and five row links. Status badges show text plus a symbol (◷ Scheduled, ● Full, ✕ Cancelled, ✓ Completed). Fixture dates are rebased to the current week.</li><li>Overflow: `scrollWidth` 1440 = `clientWidth` 1440.</li><li>Keyboard: pressing Tab from the document start went Skip link → Sessions → Create session → search → Status → row links, in visual order. Every control has a 2px solid focus outline. On row links, the 2px `#1769E0` outline is drawn on the stretched `::after` over the whole row.</li></ul> | PASS | `evidence/populated-desktop.png`, `evidence/keyboard-focus-row-desktop.png` |
| **Populated workspace (mobile)** | `/sessions`, 390×844 | <ul><li>Layout: the table is replaced by 5 cards. `scrollWidth` 390 = `clientWidth` 390, so there is no horizontal page scroll.</li><li>Touch targets: each card's tap target is the stretched link, 356×135 px. A hit-test at a card's bottom-right corner resolves to the title link.</li><li>Controls: all controls are ≥ 44px tall. The only element under 44px is the "Skip to sessions" link (36px), which is off-screen until focused.</li><li>Accessibility tree: the same landmarks and controls as desktop, all reachable.</li></ul> | PASS (see BV-2) | `evidence/populated-mobile.png` |
| **Details and list context** | `/sessions` → `/sessions/ses_102`, 1440×900 | <ul><li>Open: Enter on the focused "Varsity Defense Intensive" row opened the inline panel. The URL became `/sessions/ses_102`, the row was highlighted, and focus moved to the h2 "Varsity Defense Intensive".</li><li>Details shown: all list fields, description, notes, capacity summary ("24 booked of 24 places · Full"), coach mailto, created and updated timestamps, and "Back to sessions".</li><li>Close: Escape returned to `/sessions` with focus on `#session-link-ses_102`.</li><li>Mobile: on `ses_101` at 390×844 the panel is a `:modal` `<dialog>` sheet (390×844, no inner overflow). Focus went to the heading, and Escape restored focus to the card link.</li><li>Tablet: on `ses_104` at 800×1000 the panel is a `:modal` 480px drawer. The cancellation section ("The gym is unavailable.") is rendered.</li></ul> | PASS | `evidence/details-desktop.png`, `evidence/details-mobile-sheet.png`, `evidence/details-tablet-drawer.png` |
| **Search and status filter** | `/sessions`, 1440×900 | <ul><li>Steps: typed "maya", selected Status "Scheduled", then typed "zzz".</li><li>URL: progressed through `?query=maya` → `?query=maya&status=scheduled` (heading "2 sessions match") → `?query=zzz&status=scheduled`.</li><li>Network: each change issued a new `GET /api/sessions?...`. A superseded request was aborted (`?query=maya`, no status), and the others returned `200`.</li></ul> | PASS | — |
| **No matches** | `/sessions?query=zzz&status=scheduled` | <ul><li>Shown: h2 "0 sessions match" and h3 "No sessions match your filters", which echoes "Search “zzz” · Status: Scheduled" and offers a "Clear filters" button.</li><li>While the request was in flight, the previous result and "Updating…" stayed visible, and "No sessions yet" never appeared (the R1 fix).</li><li>Clear filters: the URL went to `/sessions`, the heading to "5 sessions", focus to the empty search input, and Status to "All statuses".</li></ul> | PASS | `evidence/no-matches-desktop.png` |
| **Empty** | `/sessions?scenario=empty` | Shown: h2 "0 sessions" and h3 "No sessions yet" ("Create the first session to start planning.") with a "Create session" link. There is no Clear filters button, so it is visibly distinct from no-matches. `GET /api/sessions` returned `200` with an empty list. | PASS | `evidence/empty-desktop.png` |
| **List request error** | `/sessions?scenario=list-error` | <ul><li>Shown: an `alert` with h3 "Sessions couldn't be loaded", "Sessions cannot be loaded right now.", and a "Try again" button. The filters stay usable.</li><li>Network: `GET /api/sessions` returned `500`. "Try again" issued a new request, which also returned `500` because the scenario is fixed.</li><li>Recovery to data after retry is covered by an automated test that switches the mock to `normal`.</li></ul> | PASS | `evidence/list-error-desktop.png` |
| **Details request error** | `/sessions/ses_101?scenario=details-error` (deep link) | <ul><li>Shown: the panel h3 "Session details couldn't be loaded", "Session details cannot be loaded right now.", and the buttons "Try again" and "Back to sessions". `GET /api/sessions/ses_101` returned `500`, while the list loaded `200` behind it.</li><li>"Back to sessions" went to `/sessions?scenario=details-error`, keeping the parameter, with focus on `#session-link-ses_101`.</li><li>404 path: `/sessions/ses_unknown` showed "This session no longer exists" with Back only (`GET` returned `404`).</li></ul> | PASS | `evidence/details-error-desktop.png` |
| **Coaches request error** | `/sessions/new?scenario=coaches-error` | <ul><li>Shown: the Coach group shows the alert "Coach choices couldn't be loaded." with "Try again".</li><li>Submit: "Create session" is `disabled`, with `aria-describedby="create-submit-reason"` pointing to "Coach choices must load before you can create a session."</li><li>No orphan `label[for=create-coach]` remains (R7). `GET /api/coaches` returned `500`.</li></ul> | PASS | `evidence/coaches-error-desktop.png` |
| **Create: validation** | `/sessions/new`, 1440×900 | <ul><li>Empty submit: 6 fields were marked `aria-invalid`, each with an `aria-describedby` error: Title, Date and Start time ("Enter a start date and start time."), Coach, Location name, Location address, and Capacity (hint plus error). Focus moved to `#create-title`. The polite status said "Fix 6 fields to create the session."</li><li>Past start: date 2026-10-18 at 10:00 gave "Choose a start in the future."</li><li>Errors cleared as valid values were entered (0 `aria-invalid` remaining).</li></ul> | PASS | `evidence/create-validation-desktop.png` |
| **Create: pending prevention** | same | <ul><li>`dblclick` on submit sent **exactly one** `POST /api/sessions`, which returned `201`.</li><li>During the request the button read "Creating…" with `aria-disabled="true"` and kept its width (160px).</li></ul> | PASS | `evidence/create-pending-desktop.png` |
| **Create: success and discoverability** | same | <ul><li>The panel closed and the URL returned to `/sessions`.</li><li>Banner: the `role="status"` banner "✓ “Browser Verify Clinic” was created." **had focus** and offered "View session" and "Dismiss".</li><li>List: the heading changed to "6 sessions", and the new row (with a "New" tag, Lena Ortiz, 0 / 12, Scheduled) was visible after the `GET /api/sessions` refresh returned `200`.</li><li>Mobile (390×844): the create sheet (`:modal`) was submitted. After the dialog was removed, focus was on the success banner, which confirms the N1 dialog-mode path in a real browser.</li><li>Hidden by filters: creating from `/sessions/new?status=full` showed "✓ “Hidden Filter Check” was created, but the current filters hide it." with "Open session", "Clear filters", and "Dismiss". "Open session" went to `/sessions/ses_1001?status=full`, and its details loaded (`200`).</li></ul> | PASS | `evidence/create-success-desktop.png`, `evidence/create-success-mobile.png`, `evidence/create-mobile-sheet.png`, `evidence/create-hidden-by-filters-desktop.png` |
| **Create failure: preserved input** | `/sessions/new?scenario=create-error` | <ul><li>Filled all 10 fields and submitted. `POST /api/sessions` returned `500`.</li><li>The form alert read "The session couldn't be created. Your entries are kept. Try again." followed by "The session could not be created."</li><li>All values were preserved exactly: title, date 2026-11-15, time 17:45, duration 120, `coach_02`, location name and address, capacity 20, description, and notes.</li><li>Submit was re-enabled (`disabled=false`, no `aria-disabled`).</li></ul> | PASS | `evidence/create-failure-preserved-desktop.png` |

## Additional Checks

| Check | Result |
| --- | --- |
| Reduced motion | With `set media light reduced-motion`, `prefers-reduced-motion: reduce` matched and the drawer's computed `animation-duration` was `1e-05s`, so the global rule applies. A `getBoundingClientRect` read in headless mode still showed the 24px start offset, because no new frame had been rendered yet. The screenshot shows the settled position. **Not a defect.** |
| Tablet drawer position | The first read of `left: 344` (480px wide on an 800px viewport) was taken during the 150 ms slide-in. The screenshot shows the drawer flush right at x=320, with no overflow (`scrollWidth` 800). |

## Defects Found

### BV-1: should-fix. Below 1024px, a second Escape on a dirty create sheet closes the dialog natively while the route stays `/sessions/new`.

- **Viewport:** 390×844. The same `<dialog>` implementation is used at 768–1023px.
- **Steps:**
  1. Open `/sessions`.
  2. Activate "Create session". The sheet is `:modal`.
  3. Type "Dirty Form" into Title.
  4. Press Escape. The app's `onCancel` handler calls `confirm("Discard this new session?")`. The answer was **Cancel** (`window.confirm` was stubbed to return `false`, because native dialogs block automation). The sheet stays open and the title stays "Dirty Form". This step is correct.
  5. Press Escape again.
- **Observed:**
  - `confirm` was asked a second time and declined again.
  - Even so, the `<dialog>` closed: `open` was `false` while the element was still in the DOM.
  - The URL remained `/sessions/new`.
  - The user sees the list with no form.
  - The "Create session" link then does nothing, because it targets the same URL and the dialog stays closed.
  - Recovery requires navigating away (for example, the "Sessions" nav link) and then choosing Create again. That reopens the form **empty**, so the input the user chose to keep is lost.
- **Likely cause:** this matches the reviewer's residual note. After a cancelled `cancel` event with no user activation in between, Chrome's close-watcher makes the next `cancel` non-cancelable and closes the dialog. `src/features/sessions/ui/Panel.tsx` handles only `onCancel`, not the dialog's `close` event, so React state and the route never learn that the dialog closed.
- **Impact:**
  - Keyboard users (AC-7.1) can get stuck: create is unreachable until they navigate elsewhere.
  - The explicit choice to keep unsaved input is overridden, and the data is lost.
  - Desktop (≥1024px) uses the inline panel with a keydown handler and is **not** affected.
- **Evidence:** `evidence/escape-dirty-create-mobile-defect.png`.
- **Recommended follow-up:** `debugger` or `coder`, to handle the dialog `close` event, either by reopening, or by syncing the route and keeping the form state.

### BV-2: nit. On mobile, the search field is not full width.

- **Viewport:** 390×844.
- **Observed:** "Search sessions" shares a row with "Status". The placeholder is truncated to "Title, coach, or loc". `ui-design.md` specifies that the search field is full width on mobile.
- **Likely cause:** in `src/features/sessions/sessions.css`, inside `@media (max-width: 767px)`, the later `.filters__field { flex: 1 1 140px; }` overrides `.filters__field--search { flex-basis: 100%; }`. Both selectors have equal specificity, so the later rule wins.
- **Impact:** usable, with no overflow or unreachable control. This is a design deviation only.
- **Recommended follow-up:** `coder`.

## Console, Page Errors, And Network

- **Console:** `console` was checked after each scenario. Only these lines appeared:
  - `[debug] [vite] connecting…`
  - `[debug] [vite] connected.`
  - the React DevTools info message
  - `[info] [mocks] MSW active with scenario "<name>"`, for `normal`, `empty`, `list-error`, `details-error`, `coaches-error`, and `create-error`

  There were **no console errors or warnings** from the app.
- **Page errors:** `errors` was empty at every check (after the populated, list-error, create-error, and tablet runs). There were **no uncaught errors**.
- **Network:** all `/api` traffic used the contracted paths. Observed statuses:

  | Request | Status |
  | --- | --- |
  | `GET /api/sessions` (no filters, filters, `empty`) | `200` |
  | `GET /api/sessions` (`list-error`) | `500` |
  | `GET /api/sessions/ses_102`, `ses_104`, `ses_1001` | `200` |
  | `GET /api/sessions/ses_101` (`details-error`) | `500` |
  | `GET /api/sessions/ses_unknown` | `404` |
  | `GET /api/coaches` (`normal`) | `200` |
  | `GET /api/coaches` (`coaches-error`) | `500` |
  | `POST /api/sessions` (`normal`) | `201`, sent exactly once |
  | `POST /api/sessions` (`create-error`) | `500` |

  Every failed status was **intended by the selected scenario**. Each initial list and details load shows one request with no status, which was aborted, followed by a `200`. This is the expected React StrictMode double effect in development. Request durations measured in the page were about 250–800 ms, consistent with the 250 ms mock latency.
- **Unexpected navigation:** none. Every URL change came from a deliberate interaction.

## Unverified Behavior

These were not checked in this run:

- **Real screen-reader output:** the list count, loading, "Creating session…", banner, and focused-error announcements. The DOM roles, live regions, and focus targets were verified, but the speech was not.
- **Firefox and Safari:** close-watcher behavior for BV-1 was checked in the adapter's Chromium only.
- **Mock start-up failure path (R6/N2):** this needs a non-secure origin or a missing worker, and was not exercised.
- **Real touch devices:** touch targets were measured, but no physical device was used.
- **Resizing across 1024px while a panel is open:** mode switching was not exercised.
- **Long-content stress:** a very long title or notes was not tested in the browser.

## Evidence Files

All files are in `tasks/TASK-001/evidence/`.

| File | Viewport | Shows |
| --- | --- | --- |
| `populated-desktop.png` | 1440×900 | Populated workspace (required) |
| `populated-mobile.png` | 390×844 | Populated workspace, card layout (required) |
| `keyboard-focus-row-desktop.png` | 1440×900 | Visible focus ring on a stretched row link |
| `details-desktop.png` | 1440×900 | Inline details panel with the list context kept |
| `details-mobile-sheet.png` | 390×844 | Details as a modal sheet |
| `details-tablet-drawer.png` | 800×1000 | Details as a modal drawer, cancelled session |
| `no-matches-desktop.png` | 1440×900 | Taken during the "Updating…" transition into no-matches |
| `empty-desktop.png` | 1440×900 | Empty scenario |
| `list-error-desktop.png` | 1440×900 | List request error |
| `details-error-desktop.png` | 1440×900 | Details request error |
| `coaches-error-desktop.png` | 1440×900 | Coaches error with submit blocked |
| `create-validation-desktop.png` | 1440×900, full page | Client validation errors |
| `create-pending-desktop.png` | 1440×900 | "Creating…" pending state |
| `create-success-desktop.png` | 1440×900 | Success banner with focus, new row tagged "New" |
| `create-hidden-by-filters-desktop.png` | 1440×900 | Hidden-by-filters banner with actions |
| `create-mobile-sheet.png` | 390×844 | Create form as a modal sheet |
| `create-success-mobile.png` | 390×844 | Success banner focused after the dialog closed |
| `create-failure-preserved-desktop.png` | 1440×900, full page | Server failure with input preserved |
| `escape-dirty-create-mobile-defect.png` | 390×844 | BV-1: list shown with no form while the URL is `/sessions/new` |

## Next Step

- **Primary:** `debugger` or `coder`, for BV-1 (and BV-2). BV-1 is a reproducible keyboard-path defect with data loss at the narrow viewports.
- **After the fix:** re-run `browser-verify` for the dialog Escape path, then `verify`.
- The developer chooses. No other role was invoked.

## Remediation (coder, after browser-verify round 1)

- **Invocation:** `/coder`, with the request "Fix browser-verify findings BV-1 and BV-2 exactly as reported in tasks/TASK-001/browser-verification.md".
- **Time:** 2026-10-19 15:37 CEST.

### BV-1

**Fix (`src/features/sessions/ui/Panel.tsx`, `DialogPanel`):**

- The `<dialog>` now handles the native `close` event (`onClose`). Only the route ever closes this panel, by unmounting it. So if the browser closes the dialog while it is still connected, the panel calls `showModal()` again. This is the Chrome close-watcher case: a repeated Escape after the user declined to discard.
- After reopening, focus returns to the control that last had focus inside the dialog, or to the panel heading if that control is gone. A `focusin`-based `onFocus` tracker records that control.
- The route (`/sessions/new`) and the form state stay unchanged, so the user's "Cancel" on the discard confirm is honored.
- The handler skips a dialog that is no longer connected or is already open, which prevents unmount and loop issues.

**Test (`src/features/sessions/ui/Panel.test.tsx`):**

- jsdom implements neither `showModal()` nor `close()`. A temporary probe confirmed both are `undefined` (the probe was removed). The test therefore stubs both on `HTMLDialogElement.prototype`. The `close()` stub fires the native `close` event, as Chrome does.
- The test uses a mobile `matchMedia`. It types "Dirty Form", force-closes the dialog, and asserts four things:
  - the dialog is open again (`showModal` called twice);
  - the input still holds "Dirty Form";
  - the input has focus;
  - `onClose` was not called.
- The test **failed** with the `onClose` handler temporarily removed and **passes** with the handler restored.

### BV-2

**Fix (`src/features/sessions/sessions.css`):** inside `@media (max-width: 767px)`, `.filters__field--search { flex-basis: 100%; }` now comes **after** `.filters__field { flex: 1 1 140px; }`. The selectors have equal specificity, so source order decides, and the search field is now full width as `ui-design.md` specifies.

There is no automated test for this. It is CSS layout only, and the browser re-run must confirm it.

### Checks Run

All commands ran in `client/`:

| Command | Result |
| --- | --- |
| `npm test` | 13/13 passed |
| `npx tsc -b` | exit 0 (after typing the dialog query in the test) |
| `npm run lint` | exit 0, no warnings |
| `npm run build` | exit 0 |

## Re-verification (browser-verify round 2): after the BV-1 and BV-2 remediation

- **Role:** `browser-verify`, invoked with `/browser-verify` after the coder remediation and a round-5 `code-reviewer` PASS.
- **Date:** 2026-10-19, 15:41–15:45 CEST.
- **Verdict: PASS.**
  - BV-1 is resolved for the reported harm: the sheet or drawer reopens, the input is kept, and the route stays correct.
  - BV-2 is resolved.
  - The required matrix still passes.
  - One new nit, **BV-3**, was found: after the reopen, focus goes to the panel heading instead of the last-focused field. This contradicts the remediation's claim, but it is not blocking.

### Runtime And Ownership

| Item | Value |
| --- | --- |
| Readiness gate | `doctor.mjs --json` returned `DEGRADED`. `capability:browser`, `hooks:claude`, and `node` are all PASS. `DEGRADED` comes only from `hooks:codex` (PENDING_ACTIVATION). |
| URL | `http://localhost:5173/sessions`. This is the same developer-owned Vite server (PID 69550, started 15:21:36, `[::1]:5173`, probed with `curl` → `200`). **Not started and not stopped by this role.** It was still running afterwards. |
| Adapter sessions | `task001-reverify` (headless) and `task001-reverify-headed` (`--headed`, a visible Chromium window). Both were closed. The final `session list` printed "No active sessions". |

### Why A Headed Session Was Used

In the headless session, the reported BV-1 sequence at 390×844 at first looked **unresolved**: after the second Escape the dialog had `open: false` and the route was `/sessions/new`.

Instrumentation showed what happened:
- the second `cancel` event was non-cancelable (`cancelable: false`);
- the dialog closed;
- the native `close` event **was not delivered** until the next rendered frame.

In headless mode, frames are produced only on demand. The event fired about 12 s later, when a screenshot forced a frame. The fix then ran: `showModal` was logged, the dialog reopened with "Dirty Form" kept, and the URL was still `/sessions/new` (`evidence/bv1-headless-reopen-after-frame-mobile.png`). The same artifact explains why, in the first headless run, the third Escape found an open dialog.

The same headless artifact was seen earlier with animations. To get a real-world result, BV-1 was re-run in a **headed** browser, which renders continuously. Between the decisive steps, no screenshots or other frame-forcing commands were used.

### BV-1 Re-verification (headed Chromium)

`window.confirm` was stubbed with a scripted answer queue, because native dialogs block automation. The stub logs the dialog's `cancel` and `close` events.

| Viewport | Sequence | Observed | Result |
| --- | --- | --- | --- |
| 390×844 (sheet) | Click Title, type "Dirty Form", then Escape (confirm → Cancel) | `cancel` was cancelable. Dialog open, URL `/sessions/new`, value kept, focus on `#create-title`. | PASS |
| 390×844 | Escape again (confirm → Cancel) | `cancel` was **non-cancelable**, followed by `close` **3 ms later**. Within the handler the dialog was reopened (`open: true`, `:modal`). URL `/sessions/new`, title "Dirty Form" kept. **Focus is on the panel heading `#_r_0_`, "Create session", not on the Title field.** See BV-3. | PASS (BV-3 nit) |
| 390×844 | Escape a third time (confirm → **Discard**) | A non-cancelable `cancel` arrived, the dialog closed, the reopen ran briefly, and then the route change unmounted the panel. URL `/sessions`, dialog removed from the DOM, focus on the "Create session" link. | PASS |
| 900×1000 (480 px `:modal` drawer) | Click Location name, type "Tablet Gym", then Escape (Cancel), then Escape (Cancel) | Log: `cancel` (cancelable), then `cancel` (non-cancelable), then `close`. Dialog reopened (`open`, `:modal`), URL `/sessions/new`, value "Tablet Gym" kept. **Focus on the heading.** See BV-3. | PASS (BV-3 nit) |
| 390×844 (details sheet) | Open "U14 Shooting Lab", then press Escape twice quickly | URL `/sessions`, dialog removed, focus on `#session-link-ses_101`. Opening "Varsity Defense Intensive" afterwards opened normally (`/sessions/ses_102`, `open: true`). There is no trap and no reopen loop. | PASS |

Evidence: `evidence/bv1-headed-reopened-mobile.png`, `evidence/bv1-headed-reopened-tablet.png`, `evidence/bv1-headless-reopen-after-frame-mobile.png`, and `evidence/bv1-reopened-mobile.png`. The last one is from the headless run; its screenshot forced the reopen frame.

### BV-2 Re-verification

At 390×844, `/sessions` was checked.

| Measurement | Value |
| --- | --- |
| Search field width | 324 px, the full inner width of the filter bar |
| Search field top | 255 |
| Status top | 333, on the next row, also 324 px wide |
| Placeholder "Title, coach, or location…" | Fits (`scrollWidth ≤ clientWidth`) |
| Page `scrollWidth` | 390, equal to `clientWidth`. No horizontal scroll. |

**Result: PASS.** Evidence: `evidence/populated-mobile.png`, re-captured.

### Required Matrix Regression Pass

| Check | Viewport / mode | Result |
| --- | --- | --- |
| Populated desktop | 1440×900, headless | 5 rows, same landmarks and controls in `snapshot -i`, `scrollWidth` 1440 = `clientWidth`. `evidence/populated-desktop.png` re-captured. |
| Populated mobile | 390×844 | 5 cards, no overflow, `evidence/populated-mobile.png` re-captured. |
| Create success, mobile (N1 dialog path) | 390×844, headed | `dblclick` on submit sent exactly **one** `POST /api/sessions`, which returned `201`. The dialog was removed, the `role="status"` banner "✓ “Reverify Mobile Clinic” was created." **had focus**, and the new card was listed. `evidence/create-success-mobile.png` re-captured. |
| Empty | 1440×900, headed | "0 sessions" and "No sessions yet". |
| List error | 1440×900, headed | "Sessions couldn't be loaded" (alert). |
| No matches | 1440×900, headed | `?query=zzz` shows "0 sessions match" and "No sessions match your filters". |
| Details error | 1440×900, headed | `/sessions/ses_101?scenario=details-error` shows "Session details couldn't be loaded". |
| Coaches error | 1440×900, headed | "Coach choices couldn't be loaded." and submit `disabled=true`. |
| Create failure, preserved input | 1440×900, headed | The alert reads "The session couldn't be created. Your entries are kept. Try again." All 7 filled values are preserved, and submit is re-enabled. |

**Result: PASS.** The production changes (`Panel.tsx` `DialogPanel` and the mobile CSS order) did not regress any matrix state.

### Defects Found In This Round

**BV-3: nit. After a forced-close reopen, focus goes to the panel heading, not the last-focused control.**

- **Where:** `src/features/sessions/ui/Panel.tsx`, the `DialogPanel` `onClose` handler, together with its `onFocus` tracker.
- **Observed:** headed Chromium at 390×844 and at 900×1000. After the reopen, `document.activeElement` is the panel `h2` (`#_r_0_`), not `#create-title` or `#create-location-name`, which the user was editing.
- **Likely cause (from code reading, no code changed):**
  1. The handler calls `dialog.showModal()` **before** reading `lastFocused.current`.
  2. `showModal()` runs the dialog focusing steps, which move focus into the dialog.
  3. That fires the bubbling `onFocus` tracker, which overwrites `lastFocused.current` with the newly focused element before the handler reads it.

  The jsdom `showModal` stub in `Panel.test.tsx` does not move focus, so the test passed. This is a case where the unit test does not model the browser closely enough.
- **Impact:**
  - Focus still lands on a sensible, visible element inside the reopened dialog: its heading.
  - The input is kept and the route is correct, so the BV-1 harm (an unreachable form and lost input) is fixed.
  - The deviation is that the user must navigate back to the field they were editing. The remediation's claim of "restores focus to the last-focused control" does not hold in a real browser.
- **Recommended follow-up:** `coder` or `debugger`. Read `lastFocused.current` before calling `showModal()`, and make the test's `showModal` stub move focus, as browsers do.

### Console, Page Errors, And Network

- **Console:** only `[vite]`, React DevTools, and `[mocks] MSW active with scenario "<name>"` info lines appeared. There were **no warnings or errors** from the app, checked after the mobile create run and after the desktop regression pass.
- **Page errors:**
  - Mobile create run: `errors` was empty.
  - Final call after the desktop pass: the adapter printed "✗" with **no message and no error entries**. This was recorded as an adapter-level response, not a page error.
  - No uncaught errors were observed in any page state.
- **Network:**
  - Every non-2xx response was intended by its scenario: `GET /api/sessions` 500 (list-error), `GET /api/sessions/ses_101` 500 (details-error), `GET /api/coaches` 500 (coaches-error), and `POST /api/sessions` 500 (create-error).
  - On the normal path: `GET /api/sessions` 200, then `POST /api/sessions` 201 (sent exactly once), then `GET /api/sessions` 200.
- **Unexpected navigation:** none.

### Still Unverified

- Real screen-reader speech.
- Firefox and Safari close-watcher behavior. BV-1 was verified in Chromium only.
- The mock start-up failure path (R6/N2).
- Resizing across 1024 px while a panel is open.
- Long-content stress.

### Next Step

- **Optional:** `coder` or `debugger` for BV-3, a focus-order nit.
- Otherwise `verify`, which runs the project checks and gives the final verdict.
- The developer chooses. No other role was invoked.
