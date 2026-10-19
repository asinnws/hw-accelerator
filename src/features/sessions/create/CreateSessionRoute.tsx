import { useNavigate } from 'react-router'
import { useDocumentTitle } from '../../../shared/useDocumentTitle'
import { useWorkspace } from '../list/workspaceContext'
import { CreateSessionForm } from './CreateSessionForm'

export function CreateSessionRoute() {
  const { filtersSearch, onCreated } = useWorkspace()
  const navigate = useNavigate()
  useDocumentTitle('Create session')

  return (
    <CreateSessionForm
      onClose={() => navigate({ pathname: '/sessions', search: filtersSearch })}
      onCreated={onCreated}
    />
  )
}
