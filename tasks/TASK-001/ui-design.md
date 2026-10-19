# TASK-001: UI Design

Inputs:
- `frontend-accelerator-assessment/designs/DESIGN_TOKENS.md` and `sessions-dashboard-reference.svg`;
- `tasks/TASK-001/requirements.md` (AC-1 to AC-7, Q6, Q8);
- `architecture.md` (D1 routes, D2 URL filters);
- `api-integration.md` (state and error matrix).

Rules applied:
- Common: `rulesets/common/ui-designer/rules/product-context.md` and the pinned `shared/web-interface-guidelines/command.md`. The Vercel brand-specific preferences are **not** applied.
- Framework and Project: there is no `ui-designer` section in either, which is valid.

## Product Context

- **Audience:** one busy trainer or operator who uses the workspace repeatedly throughout the day, mostly on desktop and sometimes on a phone courtside.
- **Job:** scan the schedule, answer capacity questions, open a session, and create a session. Density and predictability matter more than visual expression.
- **Existing system:** none. `src/` is the Vite template, whose styles and assets are replaced. There are no components to reuse.

## Selected Direction

The supplied assessment design direction is used as is, so there are no competing directions to choose between.

The **tokens** in `DESIGN_TOKENS.md` are used verbatim as CSS custom properties: color, type scale, 4px spacing, a 6px maximum radius, 40px controls, and 44px touch targets.

The **reference SVG** sets the hierarchy:
- page title and description;
- a primary "Create session" action at the top right;
- a single filter bar;
- a dense session table;
- a side details panel with "Back to sessions".

Deliberate deviations from the reference:

| Reference | Design | Reason |
| --- | --- | --- |
| Dark sidebar with Coaches, Locations, and Programs | **Compact dark top bar** with the product name "Courtside" and a single "Sessions" nav item, marked as the current page | The other areas are out of scope, and dead nav links would mislead. A top bar returns 224px of width to the table and panel. |
| "All types" filter | Omitted | Type filtering is an optional extension and was not selected. |
| Control border `#AAB6B9` | Control borders use `text-muted` `#5F6B6F` | `#AAB6B9` on white is **2.08:1**, which fails the 3:1 non-text contrast requirement. `#5F6B6F` is **5.50:1**. The `border` token `#D7DEE0` is kept for non-interactive dividers only. |

The measured contrast of the token pairs used for text is ≥ 4.5:1:

| Pair | Ratio |
| --- | --- |
| scheduled `#217A3C` on `#DDF1E4` | 4.54 |
| full `#9A6200` on `#FFF0CF` | 4.52 |
| cancelled `#B42318` on `#FBE4E2` | 5.42 |
| completed `#5F6B6F` on `surface-muted` | 4.88 |
| `text-muted` on `surface` | 5.50 |
| white on `primary` | 4.90 |
| `focus` on white | 5.08 |

Additional values not in the tokens, taken from the reference:
- the status badge tint backgrounds listed above;
- a selected-row tint of `#EAF5F3`, with `text` on it at 14.74:1.

## Information Hierarchy

```text
[Skip to sessions]                                   (visually hidden until focused)
TOP BAR   Courtside · Sessions (current)
HEADER    h1 "Training sessions"   supporting text          [Create session] (primary)
FILTERS   [Search sessions ____] [Status ▾ All statuses] [Clear filters]*
          * shown only when a filter is active
WORKSPACE ┌ h2 "5 sessions" / "2 sessions match"  · "Updating…" ┐ ┌ PANEL (child route) ┐
          │ table (desktop/tablet) or list (mobile)           │ │ details | create     │
          └────────────────────────────────────────────────────┘ └──────────────────────┘
          success banner (after create) sits between FILTERS and the list
```

- **Primary action:** "Create session". It is the only filled `primary` button on the page.
- **Secondary actions:** opening a session (the row link), Clear filters, Try again, and Back to sessions. These are outline or text buttons.
- **Session row fields:**
  - title, which links to details;
  - type and location name;
  - start date and time, with duration;
  - coach;
  - capacity as `booked / capacity`, with "N left" or "Full";
  - status badge.
- **Numbers** use `font-variant-numeric: tabular-nums`.
- **Document title:**

  | Route | `<title>` |
  | --- | --- |
  | Workspace | `Training sessions · Courtside` |
  | Details | `<Session title> · Courtside` |
  | Create | `Create session · Courtside` |

## Primary Flow

### 1. Scan and filter

- **Search** is an `<input type="search">` with the visible label "Search sessions" and the placeholder "Title, coach, or location…".
- Resolution of Q8: search runs **as the user types, debounced by 300 ms**. Pressing Enter commits immediately. All filter writes use URL `replace`.
- **Status** is a native `<select>` labelled "Status", with the options All statuses, Scheduled, Full, Cancelled, and Completed. A change applies immediately.
- **Clear filters** is a secondary button that appears only while any filter is active. It resets both filters, and focus moves to the search input.
- **Result heading** (`h2`): "N sessions", or "N sessions match" when filters are active. A polite live region announces the settled count after a filter change, for example "2 sessions match". A refetch shows "Updating…" beside the heading while the previous rows stay visible.

### 2. Open details

- Each row's title is a real `<Link>` to `/sessions/:id?<current filters>`.
- The link's `::after` pseudo-element stretches over the row, so the whole row is clickable while staying a single link. Cmd or Ctrl and middle-click still work.
- The open row has the selected tint and `aria-current="true"`.
- The panel opens using the breakpoint behavior described under Responsive Behavior. Focus moves to the panel heading, the `h2` with the session title, which has `tabIndex={-1}`.
- **Close** is available in three ways: the close button in the panel header (an icon button with `aria-label="Close session details"`), the "Back to sessions" button in the panel footer, and Escape. Each navigates to `/sessions?<filters>`. Focus returns to the row link that opened the panel. If that row is gone, focus goes to the list heading.
- On desktop, clicking another row while the panel is open swaps the panel's content in place, which supports comparison.

#### Details panel content

Top to bottom:

1. The eyebrow "Session details", the `h2` title, and the status badge.
2. A definition list (`<dl>`):

   | Label | Value |
   | --- | --- |
   | Start | Weekday, full date, and time range, for example "Monday, August 3, 2026, 18:00–19:30 CEST", formatted with `Intl` and including the timezone name |
   | Duration | "90 minutes" |
   | Type | |
   | Visibility | "Public" or "Invite-only" |
   | Location | Name, with the address on the next line |
   | Coach | Name, with the email as a `mailto:` link on the next line |
   | Capacity | "14 booked of 18 places · 4 left", or "24 booked of 24 places · Full" |

   The capacity bar uses `primary`, or `warning` when full, and is marked `aria-hidden`.
3. The `h3` sections "Description" and "Trainer notes". A `null` value renders "None provided" in muted text.
4. **Cancellation**, shown only when `cancellation` is present: an `h3` "Cancellation" with the reason (or "No reason given") and "Cancelled <timestamp>".
5. A footer `<dl>` in muted supporting text with "Created <timestamp>" and "Last updated <timestamp>".
6. The "Back to sessions" outline button.

### 3. Create

"Create session" is a `<Link>` styled as a button that goes to `/sessions/new?<filters>`. The create form opens in the same panel container, and focus moves to the `h2` "Create session".

#### Fields

The fields are single column, in this order. Optional fields carry "(optional)" in their label. All other fields are required, and the form explains this once in its intro text: "All fields are required unless marked optional."

| # | Control | Element | Default | Notes |
| --- | --- | --- | --- | --- |
| 1 | Title | `input type="text"` with `autocomplete="off"` | — | |
| 2 | Session type | `<select>` | Training | Options: Training, Camp, Private |
| 3 | Date and Start time | `<fieldset>` "Start", containing `input type="date"` and `input type="time"` side by side | empty | Helper text: "Times are in your local time zone (<IANA zone>)." |
| 4 | Duration (minutes) | `input type="number"` with `min=30 max=240 step=15 inputMode="numeric"` | 60 | |
| 5 | Coach | `<select>` | — | Placeholder option "Select a coach" |
| 6 | Location name | `input type="text"` | — | |
| 7 | Location address | `input type="text"` with `autocomplete="street-address"` | — | |
| 8 | Capacity | `input type="number"` with `min=1 max=100 inputMode="numeric"` | empty | |
| 9 | Visibility | radio group in a `<fieldset>` | Public | Options: Public, Invite-only |
| 10 | Description (optional) | `<textarea>` | — | |
| 11 | Trainer notes (optional) | `<textarea>` | — | Has a live character counter, "0 / 500", updated `aria-live="polite"` only within 50 characters of the limit |

The actions are a primary "Create session" button (submit) and a secondary "Cancel" button.

#### Validation timing

- No errors appear before the first submit.
- On submit, every field is validated.
- After a field has been shown invalid, it re-validates on change, so its error clears as soon as the value is fixed.

#### Errors

- Each error sits directly under its control as `<p id="<field>-error">`. The control gets `aria-invalid="true"` and `aria-describedby="<field>-hint <field>-error"`.
- For the Start group, the error attaches to the date input and the fieldset.
- On a failed submit, focus moves to the **first invalid control**. A polite live message says "Fix 3 fields to create the session."

#### Pending

- The submit button keeps its width, shows a spinner and the label "Creating…", and sets `aria-disabled="true"`. A second activation is ignored.
- Fields stay editable. A live message says "Creating session…".

#### Server failure (500 or network)

- A form-level alert (`role="alert"`) appears at the top of the form: "The session couldn't be created. Your entries are kept. Try again." The server `message` is shown as supporting text.
- **Every value is preserved**, the submit button is re-enabled, and focus stays where it was.

#### Server 400

- Mapped messages appear on their fields. Unmapped messages appear in the form-level alert.
- Focus moves to the first field that has a server error.

#### Coaches loading or failing

- **Loading:** the Coach select is disabled with the option "Loading coaches…".
- **Error:** an inline alert in place of the select says "Coach choices couldn't be loaded." and offers a **Try again** button. Other fields stay editable.
- Submit is **disabled** with the visible reason "Coach choices must load before you can create a session.", referenced by `aria-describedby`. The form never pretends that a coach can be submitted.
- **Empty coach list:** the same pattern, with the message "No coaches are available."

#### Cancel with unsaved input

The Cancel button, Escape, and the close button each ask for confirmation with a native `confirm("Discard this new session?")`, but only when the form is dirty. A clean form closes immediately.

### 4. After create

On `201`, the panel closes and navigates to `/sessions?<filters>`. The workspace refreshes.

A **success banner** (`role="status"`, tinted `success`) appears above the list, and focus moves to it (`tabIndex={-1}`).

| Case | Banner text | Actions | Other effect |
| --- | --- | --- | --- |
| New session visible | "✓ “<Title>” was created." | **View session** (link), **Dismiss** | The new row gets the selected tint and a "New" text tag. |
| New session hidden by filters | "✓ “<Title>” was created, but the current filters hide it." | **Open session** (link to `/sessions/:newId?<filters>`), **Clear filters**, **Dismiss** | — |

The banner stays until it is dismissed or the filters change.

## State Matrix

The rows map to the `api-integration.md` matrix and requirements AC-4.

| Region | State | What renders | Announcement and focus |
| --- | --- | --- | --- |
| List | Initial loading | Five skeleton rows of fixed height, or cards on mobile, plus the visible text "Loading sessions…". The filters are rendered and usable. | Container has `aria-busy="true"`. "Loading sessions…" is in a polite status region. |
| List | Populated | Table or cards, with the count heading | The count is announced after filter changes only. |
| List | Refreshing | Previous rows at full opacity, with "Updating…" beside the heading | No announcement until it settles. |
| List | No sessions (`empty`) | `h3` "No sessions yet", the text "Create the first session to start planning.", and a primary **Create session** button | Polite: "No sessions yet." |
| List | No matches | `h3` "No sessions match your filters". The text echoes the filters, for example: Search “zzz” · Status: Cancelled. A **Clear filters** button. Visually distinct from the empty state: it is not a create prompt. | Polite: "No sessions match." |
| List | Error (`list-error`, other errors) | `h3` "Sessions couldn't be loaded", the server message as supporting text, a **Try again** button, and **Clear filters** when filters are active. The filters stay usable. | `role="alert"` on appearance. Focus is not moved. |
| Details | Loading | Panel with its header and the text "Loading session…" in a fixed-height body | Polite status |
| Details | Loaded | The content described under "Details panel content" | Focus goes to the `h2` title. |
| Details | Error (`details-error`) | "Session details couldn't be loaded" with the message, plus **Try again** and **Back to sessions** | `role="alert"` |
| Details | Not found (404) | "This session no longer exists" with **Back to sessions** and no retry | `role="alert"` |
| Create | Coaches loading, failed, or empty | As described under "Coaches loading or failing" | The inline alert is `role="alert"`. |
| Create | Client validation failure | Field errors, with focus on the first invalid control | Polite: "Fix N fields…" |
| Create | Pending | "Creating…" on a button of stable size | Polite: "Creating session…" |
| Create | Server failure | Form-level alert, with values preserved | `role="alert"` |
| Workspace | Success (visible or hidden) | Banner, as described under "After create" | `role="status"`. Focus goes to the banner. |
| Any route | Unknown path | "Page not found" with a link to "Training sessions" | — |
| App | Render crash | Shell with "Something went wrong" and a **Reload** button | `role="alert"` |

**Status badges** never rely on color alone. Each has a text label and an `aria-hidden` symbol:

| Status | Symbol | Label | Colors |
| --- | --- | --- | --- |
| scheduled | ◷ (clock) | Scheduled | success on `#DDF1E4` |
| full | ● (filled dot) | Full | warning on `#FFF0CF` |
| cancelled | ✕ | Cancelled | danger on `#FBE4E2` |
| completed | ✓ | Completed | `text-muted` on `surface-muted` |

Cancelled and completed rows keep full-contrast titles. No strikethrough is used, so the title stays readable.

## Responsive Behavior

| Width | List | Panel (details or create) |
| --- | --- | --- |
| **≥ 1024px** (verified at 1440 × 900) | `<table>`. The columns are Session (title, with "Type · Location" underneath), Start (date and time, with duration underneath), Coach, Capacity, and Status. The table takes the full width when no panel is open. | **Inline side panel**, 400px wide, sticky to the top of the viewport and scrolling internally. It is a **non-modal** `<section aria-labelledby>` region, and the list stays interactive. Escape closes it when focus is inside the panel. |
| **768–1023px** | The same table, full width | **Right drawer**: a native `<dialog>` opened with `showModal()`, `width: min(480px, 100vw)`, full height. The background becomes inert, Escape is native, and `overscroll-behavior: contain` is set. |
| **< 768px** (verified at 390 × 844) | **Card list** (`<ul>`). Each `<li>` holds the title link (stretched), the status badge at the top right, then the lines "Mon, Aug 3 · 18:00 · 90 min", "Maya Brooks", "Training · North Court", and "14 / 18 booked · 4 left". | **Full-screen sheet**: the same `<dialog>`, `100vw × 100dvh`, with a sticky header that holds the title and close button, and padding of `env(safe-area-inset-*)`. |

Further rules:

- **Reflow:**
  - Page padding is 24px on desktop and 16px on mobile.
  - The header wraps: the h1 and the Create button share a row with `flex-wrap`, and the supporting text sits below.
  - On mobile, the search field is full width, and Status and Clear filters share the next row.
  - Form date and time inputs are side by side at every width of 360px or more.
- **No horizontal page scroll** at 390px:
  - every flex child has `min-width: 0`;
  - addresses, emails, and long titles use `overflow-wrap: anywhere`;
  - the table is never shown below 768px;
  - the body sets `overflow-x: clip` only as a safety net, never to hide real overflow.
- **List context:** the list stays mounted under every panel mode, so its scroll position and the row being opened survive. The mobile sheet covers the list instead of replacing it.
- **Mode switches:** when the viewport crosses 1024px while a panel is open, the panel re-renders in the new mode, keeping its content and focus target.
- **Touch:**
  - controls are 44px tall below 768px and 40px at 768px and above;
  - row or card tap targets are the full row;
  - `touch-action: manipulation` is set on interactive controls.

## Accessibility And Interaction

- **Landmarks and headings:**
  - `<header>` (top bar with `<nav aria-label="Primary">`), then `<main id="main">` holding the h1, the filters `<search>` landmark (or `role="search"`), the list region, and the panel region.
  - The skip link "Skip to sessions" targets the list heading.
  - Heading order: h1 for the page, h2 for the list count and the panel title, h3 for state titles and details sections.
- **Keyboard:**
  - Every action is a native `<button>` or `<a>`, so Tab order follows the visual order.
  - In the table, each row has a single tab stop: its title link.
  - Escape closes the panel or sheet; this is guarded for a dirty create form.
  - Enter in search commits immediately.
  - No custom key handlers are needed beyond Escape on the non-modal panel.
- **Focus:**
  - The ring is `outline: 2px solid var(--focus); outline-offset: 2px` on `:focus-visible` for every interactive element. The outline is never removed without this replacement.
  - Focus moves are listed under Primary Flow and the State Matrix: the panel heading on open, the origin row on close, the first invalid field on a failed submit, and the banner on success.
- **Live regions:**
  - There is one persistent polite status region in the workspace for counts, loading, and pending messages.
  - Alerts use `role="alert"` only for failures.
  - Regions are rendered at mount and their text updated, rather than mounted together with their content.
- **Forms:**
  - Every control has a visible `<label htmlFor>`, and grouped controls use `<fieldset>` and `<legend>`.
  - Each field has a meaningful `name`.
  - Paste is never blocked.
  - Placeholders end with "…".
- **Motion:**
  - The only motion is the drawer and sheet entering: 150ms `transform` and `opacity`, never `transition: all`.
  - It is disabled under `prefers-reduced-motion: reduce`.
  - The skeleton has no shimmer animation.
- **Content and copy:**
  - Use active voice and specific button labels.
  - Use the `…` character.
  - Use numerals for counts.
  - Every error message includes a next step.
  - All dates and times are formatted with `Intl.DateTimeFormat` in the user's locale and time zone, never with hardcoded formats.

## Reuse Candidates

These are presentation primitives inside the feature. Promote one to `shared/` only when it has a second real caller (architecture D5).

| Candidate | Used by |
| --- | --- |
| `StatusBadge` (status, then symbol and label) | table row, mobile card, details header |
| `Panel` (responsive inline, drawer, or sheet; handles focus-on-open and Escape) | details route, create route |
| `StateMessage` (title, body, actions; `variant` defined by composition, not boolean props) | list empty, no-matches, and error states; details error and not-found states |
| `Field` (label, control slot, hint, error, wiring `aria-describedby` and `aria-invalid`) | the 11 create form controls |
| `Button` and link-as-button styles (primary, secondary, text) | everywhere |
| A date formatting helper (`formatShortStart`, `formatFullStart`, `formatTimestamp`) | list, cards, details, and banner. It lives in `shared/` because it already has three callers. |

## Unresolved Decisions

None blocks implementation. These are recorded choices the developer may override:

- Q8 is resolved as debounced type-ahead search (300 ms), with Enter committing immediately.
- The unsaved-input guard uses native `confirm()` rather than a custom dialog. This is a deliberate choice to stay small.
- Skeleton rows were chosen over a spinner for the initial load, to keep the layout stable.

`specs/ui-design.md` is **not** written. It is a confirmed direction for this task only and becomes living truth only after implementation is verified.
