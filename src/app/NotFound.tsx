import { Link } from 'react-router'
import { useDocumentTitle } from '../shared/useDocumentTitle'

export function NotFound() {
  useDocumentTitle('Page not found')
  return (
    <div className="page-header">
      <h1 className="page-title">Page not found</h1>
      <p className="page-description">
        This address doesn't match a page. <Link to="/sessions">Go to Training sessions</Link>.
      </p>
    </div>
  )
}
