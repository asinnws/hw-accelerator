import { Navigate, Route, Routes, useLocation } from 'react-router'
import { CreateSessionRoute } from '../features/sessions/create/CreateSessionRoute'
import { SessionDetailsRoute } from '../features/sessions/details/SessionDetailsRoute'
import { SessionsWorkspace } from '../features/sessions/list/SessionsWorkspace'
import { AppShell } from './AppShell'
import { NotFound } from './NotFound'

function RedirectToSessions() {
  const { search } = useLocation()
  return <Navigate to={{ pathname: '/sessions', search }} replace />
}

export function AppRoutes() {
  return (
    <Routes>
      <Route element={<AppShell />}>
        <Route index element={<RedirectToSessions />} />
        <Route path="sessions" element={<SessionsWorkspace />}>
          <Route path="new" element={<CreateSessionRoute />} />
          <Route path=":sessionId" element={<SessionDetailsRoute />} />
        </Route>
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  )
}
