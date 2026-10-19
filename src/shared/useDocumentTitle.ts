import { useEffect } from 'react'

const APP_NAME = 'Courtside'

export function useDocumentTitle(title: string | null) {
  useEffect(() => {
    if (title !== null) document.title = `${title} · ${APP_NAME}`
  }, [title])
}
