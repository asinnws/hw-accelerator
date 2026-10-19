import { useNavigate, useParams } from 'react-router'
import { useDocumentTitle } from '../../../shared/useDocumentTitle'
import { useWorkspace } from '../list/workspaceContext'
import { Panel, PanelBody, PanelFooter, PanelHeader } from '../ui/Panel'
import { StateMessage } from '../ui/StateMessage'
import { StatusBadge } from '../ui/StatusBadge'
import { SessionDetailsView } from './SessionDetailsView'
import { useSessionDetails } from './useSessionDetails'

export function SessionDetailsRoute() {
  const { sessionId = '' } = useParams()
  // Keyed so switching sessions starts from a clean loading state.
  return <SessionDetailsPanel key={sessionId} sessionId={sessionId} />
}

function SessionDetailsPanel({ sessionId }: { sessionId: string }) {
  const { filtersSearch } = useWorkspace()
  const navigate = useNavigate()
  const details = useSessionDetails(sessionId)
  const close = () => navigate({ pathname: '/sessions', search: filtersSearch })

  useDocumentTitle(details.status === 'success' ? details.data.title : 'Session details')

  const backButton = (
    <button type="button" className="button button--secondary" onClick={close}>
      Back to sessions
    </button>
  )

  return (
    <Panel onClose={close}>
      <PanelHeader
        eyebrow="Session details"
        title={details.status === 'success' ? details.data.title : 'Session details'}
        closeLabel="Close session details"
      >
        {details.status === 'success' ? <StatusBadge status={details.data.status} /> : null}
      </PanelHeader>
      <PanelBody>
        {details.status === 'loading' ? (
          <p className="panel__loading" role="status">
            Loading session…
          </p>
        ) : null}
        {details.status === 'error' && details.error.code === 'SESSION_NOT_FOUND' ? (
          <StateMessage role="alert" title="This session no longer exists" actions={backButton}>
            <p>It may have been removed. Return to the list to choose another session.</p>
          </StateMessage>
        ) : null}
        {details.status === 'error' && details.error.code !== 'SESSION_NOT_FOUND' ? (
          <StateMessage
            role="alert"
            title="Session details couldn't be loaded"
            actions={
              <>
                <button type="button" className="button button--primary" onClick={details.retry}>
                  Try again
                </button>
                {backButton}
              </>
            }
          >
            <p>{details.error.message}</p>
          </StateMessage>
        ) : null}
        {details.status === 'success' ? <SessionDetailsView session={details.data} /> : null}
      </PanelBody>
      {details.status === 'success' ? <PanelFooter>{backButton}</PanelFooter> : null}
    </Panel>
  )
}
