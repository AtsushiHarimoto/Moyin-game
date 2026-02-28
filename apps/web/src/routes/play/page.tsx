/**
 * PlayPage - Plays a specific story by storyKey route param.
 * Delegates to VnStagePage by redirecting with the storyKey as a search param.
 */
import { useEffect } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'

export default function PlayPage() {
  const { storyKey } = useParams<{ storyKey: string }>()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()

  useEffect(() => {
    // Redirect to /vn-stage with storyKey and mode params
    const mode = searchParams.get('mode') || 'new'
    const sessionId = searchParams.get('sessionId') || ''
    const params = new URLSearchParams()
    if (storyKey) params.set('storyKey', storyKey)
    params.set('mode', mode)
    if (sessionId) params.set('sessionId', sessionId)
    navigate(`/vn-stage?${params.toString()}`, { replace: true })
  }, [storyKey, searchParams, navigate])

  return null
}
