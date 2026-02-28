import { useMemo } from 'react'

interface StageBackgroundProps {
  bgUrl?: string
}

export function StageBackground({ bgUrl = '' }: StageBackgroundProps) {
  const backgroundStyle = useMemo(
    () => ({
      backgroundImage: bgUrl ? `url(${bgUrl})` : 'none',
      backgroundSize: 'cover' as const,
      backgroundPosition: 'center' as const,
      backgroundRepeat: 'no-repeat' as const,
    }),
    [bgUrl],
  )

  return (
    <div
      className={`absolute inset-0 z-0 bg-[#1a1a1a] ${!bgUrl ? 'bg-gradient-to-br from-[#2c3e50] to-black' : ''}`}
      style={backgroundStyle}
      data-testid="stage-bg"
    >
      {!bgUrl && (
        <div
          className="h-full w-full opacity-10"
          style={{
            backgroundImage: 'radial-gradient(#fff 1px, transparent 1px)',
            backgroundSize: '20px 20px',
          }}
        />
      )}
    </div>
  )
}
