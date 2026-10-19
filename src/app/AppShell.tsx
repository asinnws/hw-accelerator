import { NavLink, Outlet } from 'react-router'

export function AppShell() {
  return (
    <>
      <a className="skip-link" href="#sessions-heading">
        Skip to sessions
      </a>
      <header className="top-bar">
        <span className="top-bar__brand" translate="no">
          Courtside
        </span>
        <nav aria-label="Primary">
          <NavLink to="/sessions" className="top-bar__link">
            Sessions
          </NavLink>
        </nav>
      </header>
      <main id="main" className="page">
        <Outlet />
      </main>
    </>
  )
}
