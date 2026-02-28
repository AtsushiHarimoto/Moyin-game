/**
 * VnReplayPage - Replay a saved session or slot.
 * Reuses VnStagePage logic but forces replay=1 in search params.
 */
import { useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'

export default function VnReplayPage() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()

  useEffect(() => {
    const params = new URLSearchParams(searchParams)
    if (!params.has('replay')) params.set('replay', '1')
    navigate(`/vn-stage?${params.toString()}`, { replace: true })
  }, [searchParams, navigate])

  return null
}
