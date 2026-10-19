import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, Outlet, useLocation, useMatch, useNavigate, useSearchParams } from 'react-router'
import { TABLE_QUERY, useMediaQuery } from '../../../shared/useMediaQuery'
import { useDocumentTitle } from '../../../shared/useDocumentTitle'
import { applyFilters, hasActiveFilters, parseFilters } from '../model/filters'
import type { SessionDetail, SessionFilters as Filters } from '../model/types'
import { CreatedBanner } from './CreatedBanner'
import { ListError, ListLoading, NoMatches, NoSessions } from './ListStates'
import { SessionCards } from './SessionCards'
import { SessionFilters, type SessionFiltersHandle } from './SessionFilters'
import { SessionsTable } from './SessionsTable'
import { useSessionsList } from './useSessionsList'
import type { WorkspaceOutletContext } from './workspaceContext'

interface CreatedSession {
  id: string
  title: string
  /** Filters active when it was created; changing filters retires the banner. */
  filtersKey: string
}

function countLabel(total: number, filtered: boolean): string {
  const noun = total === 1 ? 'session' : 'sessions'
  if (!filtered) return `${total} ${noun}`
  return `${total} ${noun} ${total === 1 ? 'matches' : 'match'}`
}

export function SessionsWorkspace() {
  const [searchParams, setSearchParams] = useSearchParams()
  const location = useLocation()
  const navigate = useNavigate()
  const filters = useMemo(() => parseFilters(searchParams), [searchParams])
  const filtersKey = `${filters.query}|${filters.status}`
  const filtered = hasActiveFilters(filters)
  const list = useSessionsList(filters)
  const showTable = useMediaQuery(TABLE_QUERY)

  const isListOnly = useMatch('/sessions') !== null
  const isCreateOpen = useMatch('/sessions/new') !== null
  const childMatch = useMatch('/sessions/:sessionId')
  const selectedId = !isCreateOpen ? childMatch?.params.sessionId : undefined
  const openChild = selectedId ?? (isCreateOpen ? 'new' : null)

  const [created, setCreated] = useState<CreatedSession | null>(null)
  // The banner stays until dismissed or the filters change (ui-design.md). Retire
  // it for good on a filter change so it never reappears when filters return.
  if (created && created.filtersKey !== filtersKey) setCreated(null)
  const banner = created && created.filtersKey === filtersKey ? created : null

  const filtersHandle = useRef<SessionFiltersHandle>(null)
  const headingRef = useRef<HTMLHeadingElement>(null)
  const createLinkRef = useRef<HTMLAnchorElement>(null)
  const bannerRef = useRef<HTMLDivElement>(null)
  // Single-use focus intent: id of the created session whose banner should take
  // focus once. Set only when this workspace closes the create panel itself.
  const bannerFocusFor = useRef<string | null>(null)

  useDocumentTitle(isListOnly ? 'Training sessions' : null)

  const setFilters = useCallback(
    (next: Filters) => setSearchParams((previous) => applyFilters(previous, next), { replace: true }),
    [setSearchParams],
  )

  const clearFilters = () => filtersHandle.current?.clear()

  // A create request may resolve after the user moved on (opened a session,
  // changed filters, closed the form). Read the latest location at that moment
  // instead of the values captured when the form was submitted.
  const latest = useRef({ search: location.search, filtersKey, isCreateOpen })
  useEffect(() => {
    latest.current = { search: location.search, filtersKey, isCreateOpen }
  })

  const onCreated = (session: SessionDetail) => {
    const current = latest.current
    setCreated({ id: session.id, title: session.title, filtersKey: current.filtersKey })
    list.retry()
    if (current.isCreateOpen) {
      bannerFocusFor.current = session.id
      navigate({ pathname: '/sessions', search: current.search })
    }
  }

  const outletContext: WorkspaceOutletContext = { filtersSearch: location.search, onCreated }

  // Deliver the single-use banner focus. The intent is consumed only once focus
  // actually lands: below 1024px the create <dialog> keeps the page inert until
  // the navigation removes it, so the first attempt can fail and a later commit
  // (openChild change) retries. Declared before the restore effect so a focused
  // banner makes that effect stand down.
  const bannerId = banner?.id
  useEffect(() => {
    const target = bannerFocusFor.current
    if (target === null) return
    if (bannerId !== target) {
      if (bannerId === undefined && openChild === null) bannerFocusFor.current = null
      return
    }
    bannerRef.current?.focus()
    if (document.activeElement === bannerRef.current) bannerFocusFor.current = null
  }, [bannerId, openChild])

  const dismissBanner = () => {
    setCreated(null)
    headingRef.current?.focus()
  }

  // When a panel closes and focus was lost with it, return focus to its origin.
  const previousChild = useRef<string | null>(openChild)
  useEffect(() => {
    const previous = previousChild.current
    previousChild.current = openChild
    if (previous === null || openChild !== null) return
    const active = document.activeElement
    if (active && active !== document.body) return
    if (previous === 'new') {
      createLinkRef.current?.focus()
      return
    }
    const origin = document.getElementById(`session-link-${previous}`)
    ;(origin ?? headingRef.current)?.focus()
  }, [openChild])

  // Shown rows and the filters that produced them (may lag the URL while refreshing).
  const shown = list.status === 'success' ? list.data : undefined
  const shownFiltered = shown ? hasActiveFilters(shown.filters) : false
  const settledItems = shown && !list.isRefreshing ? shown.page.items : undefined
  const bannerVisibility = banner && settledItems ? settledItems.some((item) => item.id === banner.id) : undefined

  let heading = 'Sessions'
  let announcement = ''
  if (list.status === 'loading') announcement = 'Loading sessions…'
  if (shown) {
    heading = countLabel(shown.page.total, shownFiltered)
    announcement = list.isRefreshing ? '' : heading
  }

  const collectionProps = {
    search: location.search,
    selectedId,
    highlightedId: banner?.id,
  }

  return (
    <div className="workspace">
      <div className="page-header">
        <div className="page-header__text">
          <h1 className="page-title">Training sessions</h1>
          <p className="page-description">Find scheduled work, review capacity, and create sessions.</p>
        </div>
        <Link
          ref={createLinkRef}
          className="button button--primary"
          to={{ pathname: '/sessions/new', search: location.search }}
        >
          Create session
        </Link>
      </div>

      <SessionFilters filters={filters} onChange={setFilters} handleRef={filtersHandle} />

      {banner ? (
        <CreatedBanner
          title={banner.title}
          sessionId={banner.id}
          ref={bannerRef}
          isVisibleInList={bannerVisibility}
          search={location.search}
          onClearFilters={clearFilters}
          onDismiss={dismissBanner}
        />
      ) : null}

      {/* Outside the aria-busy region so assistive tech announces loading changes. */}
      <p className="visually-hidden" role="status">
        {announcement}
      </p>

      <div className={openChild ? 'workspace__body workspace__body--with-panel' : 'workspace__body'}>
        <section className="list-region" aria-labelledby="sessions-heading" aria-busy={list.status === 'loading'}>
          <div className="list-region__header">
            <h2 id="sessions-heading" ref={headingRef} tabIndex={-1} className="section-title">
              {heading}
            </h2>
            {list.isRefreshing ? <span className="list-region__updating">Updating…</span> : null}
          </div>
          {list.status === 'loading' ? <ListLoading /> : null}

          {list.status === 'error' ? (
            <ListError error={list.error} onRetry={list.retry} onClear={filtered ? clearFilters : undefined} />
          ) : null}

          {shown && shown.page.total === 0 && !shownFiltered ? <NoSessions createSearch={location.search} /> : null}

          {shown && shown.page.total === 0 && shownFiltered ? (
            <NoMatches filters={shown.filters} onClear={clearFilters} />
          ) : null}

          {shown && shown.page.items.length > 0 ? (
            showTable ? (
              <SessionsTable sessions={shown.page.items} {...collectionProps} />
            ) : (
              <SessionCards sessions={shown.page.items} {...collectionProps} />
            )
          ) : null}
        </section>

        <Outlet context={outletContext} />
      </div>
    </div>
  )
}
