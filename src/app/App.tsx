import { BrowserRouter } from 'react-router'
import { AppRoutes } from './AppRoutes'
import { RootErrorBoundary } from './RootErrorBoundary'

export function App() {
  return (
    <RootErrorBoundary>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </RootErrorBoundary>
  )
}
