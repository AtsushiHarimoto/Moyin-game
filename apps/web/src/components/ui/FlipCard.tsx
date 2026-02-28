import { useState } from 'react'
import { cn } from '@/lib/cn'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface FlipCardStats {
  favorability: number
  connection: number
}

interface FlipCardProps {
  title?: string
  image?: string
  description?: string
  stats?: FlipCardStats
  className?: string
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function FlipCard({
  title = 'Character Name',
  image = '/img/girl.png',
  description = 'A mysterious and lovely character waiting to be known...',
  stats = { favorability: 50, connection: 30 },
  className,
}: FlipCardProps) {
  const [isFlipped, setIsFlipped] = useState(false)

  return (
    <div
      className={cn('m-5 cursor-pointer', className)}
      style={{
        width: 280,
        height: 420,
        perspective: 1000,
        backgroundColor: 'transparent',
      }}
      onMouseEnter={() => setIsFlipped(true)}
      onMouseLeave={() => setIsFlipped(false)}
    >
      <div
        className="relative h-full w-full text-center"
        style={{
          transition: 'transform 0.8s cubic-bezier(0.4, 0, 0.2, 1)',
          transformStyle: 'preserve-3d',
          transform: isFlipped ? 'rotateY(180deg)' : 'none',
        }}
      >
        {/* Front face */}
        <div
          className="absolute inset-0 flex flex-col overflow-hidden rounded-[15px] border"
          style={{
            backfaceVisibility: 'hidden',
            background: 'linear-gradient(135deg, #fff0f5 0%, #fff 100%)',
            boxShadow: '0 10px 30px rgba(255, 105, 180, 0.3)',
            borderColor: 'rgba(255, 255, 255, 0.8)',
          }}
        >
          {/* Decorative border */}
          <div
            className="pointer-events-none absolute inset-[10px] z-[2] rounded-xl border"
            style={{
              borderColor: 'rgba(255, 215, 0, 0.5)',
              boxShadow: '0 0 15px rgba(255, 105, 180, 0.2)',
            }}
          />

          {/* Corner hearts */}
          {[
            { pos: 'top-1.5 left-2', rotate: '-45deg' },
            { pos: 'top-1.5 right-2', rotate: '45deg' },
            { pos: 'bottom-1.5 left-2', rotate: '-135deg' },
            { pos: 'bottom-1.5 right-2', rotate: '135deg' },
          ].map(({ pos, rotate }) => (
            <div
              key={`${pos}-${rotate}`}
              className={`absolute z-[3] text-xl ${pos}`}
              style={{ color: '#ff9a9e', transform: `rotate(${rotate})` }}
            >
              &#x2764;
            </div>
          ))}

          {/* Character image */}
          <div className="relative flex-1 w-full overflow-hidden">
            <img
              src={image}
              alt={title}
              className="h-full w-full object-cover transition-transform duration-800"
              style={{ transform: isFlipped ? undefined : 'scale(1)' }}
            />
          </div>

          {/* Title bar */}
          <div className="z-[2] flex h-[60px] flex-col items-center justify-center bg-white">
            <h2
              className="m-0 font-bold"
              style={{
                fontFamily: 'var(--ui-font-main)',
                fontSize: 'var(--ui-font-2xl)',
                color: '#d147a3',
                textShadow: '2px 2px 0px white, 0 0 5px rgba(209, 71, 163, 0.2)',
              }}
            >
              {title}
            </h2>
          </div>
        </div>

        {/* Back face */}
        <div
          className="absolute inset-0 flex flex-col items-center justify-center overflow-hidden rounded-[15px] border p-[30px]"
          style={{
            backfaceVisibility: 'hidden',
            transform: 'rotateY(180deg)',
            backgroundColor: '#fff',
            boxShadow: '0 10px 30px rgba(255, 105, 180, 0.3)',
            borderColor: 'rgba(255, 255, 255, 0.8)',
          }}
        >
          {/* Dot pattern */}
          <div
            className="absolute inset-0 opacity-10"
            style={{
              backgroundImage: 'radial-gradient(#d147a3 1px, transparent 1px)',
              backgroundSize: '20px 20px',
            }}
          />

          <div className="relative z-[5] w-full">
            <h3
              className="mb-2.5"
              style={{
                fontFamily: 'var(--ui-font-main)',
                color: '#a62a48',
                fontSize: 'var(--ui-font-xl)',
              }}
            >
              {title}
            </h3>

            <div
              className="mx-auto mb-5 h-0.5 w-1/2"
              style={{ background: 'linear-gradient(90deg, transparent, #ff9a9e, transparent)' }}
            />

            {/* Stats */}
            <div className="mb-5 w-full">
              {[
                { label: '好感度', value: stats.favorability },
                { label: '羈絆', value: stats.connection },
              ].map(({ label, value }) => (
                <div key={label} className="mb-2.5 flex items-center text-sm text-gray-600">
                  <span className="mr-2.5 w-[50px] text-right font-bold">{label}</span>
                  <div className="mr-2.5 flex-1 overflow-hidden rounded-[10px] bg-gray-200" style={{ height: 8 }}>
                    <div
                      className="h-full rounded-[10px]"
                      style={{
                        width: `${value}%`,
                        background: 'linear-gradient(90deg, #ff9a9e, #ff6a88)',
                      }}
                    />
                  </div>
                  <span className="text-xs font-bold" style={{ color: '#d147a3' }}>
                    {value}%
                  </span>
                </div>
              ))}
            </div>

            <p
              className="border-t border-dashed pt-[15px] text-left text-sm leading-relaxed text-gray-500"
              style={{ borderColor: '#ffd1dc' }}
            >
              {description}
            </p>
          </div>
        </div>

        {/* Shine effect */}
        <div
          className="pointer-events-none absolute inset-y-0 z-10"
          style={{
            width: '50%',
            left: isFlipped ? '200%' : '-100%',
            background: 'linear-gradient(to right, rgba(255,255,255,0) 0%, rgba(255,255,255,0.8) 50%, rgba(255,255,255,0) 100%)',
            transform: 'skewX(-25deg)',
            transition: isFlipped ? 'left 0.6s ease-in-out 0.1s' : 'left 0s',
          }}
        />
      </div>
    </div>
  )
}
