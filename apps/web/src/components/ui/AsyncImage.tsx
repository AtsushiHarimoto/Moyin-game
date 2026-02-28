import { useCallback, useState } from 'react'
import { cn } from '@/lib/cn'

interface AsyncImageProps {
  src: string
  alt?: string
  className?: string
  placeholderClassName?: string
  onLoad?: () => void
  onError?: () => void
}

export default function AsyncImage({
  src,
  alt = '',
  className,
  placeholderClassName,
  onLoad,
  onError,
}: AsyncImageProps) {
  const [loaded, setLoaded] = useState(false)
  const [errored, setErrored] = useState(false)

  const handleLoad = useCallback(() => {
    setLoaded(true)
    onLoad?.()
  }, [onLoad])

  const handleError = useCallback(() => {
    setErrored(true)
    onError?.()
  }, [onError])

  if (errored) {
    return (
      <div
        className={cn(
          'flex items-center justify-center text-sm',
          placeholderClassName,
        )}
        style={{ color: 'var(--ui-muted)' }}
      >
        Failed to load
      </div>
    )
  }

  return (
    <div className="relative">
      {!loaded && (
        <div
          className={cn(
            'flex items-center justify-center text-sm',
            placeholderClassName,
          )}
          style={{ color: 'var(--ui-muted)' }}
        >
          Loading...
        </div>
      )}
      <img
        src={src}
        alt={alt}
        className={cn(
          'transition-opacity duration-300',
          loaded ? 'opacity-100' : 'opacity-0',
          className,
        )}
        onLoad={handleLoad}
        onError={handleError}
      />
    </div>
  )
}
