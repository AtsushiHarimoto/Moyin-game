import { useEffect, useRef } from 'react'
import gsap from 'gsap'

/**
 * MouseMeteor - Particle trail effect that follows the mouse cursor.
 * Light mode: pink sakura circles.
 * Dark mode: purple hearts.
 *
 * Uses GSAP for animations (replaces anime.js from Vue version).
 */

const COLORS = ['#cd5c79', '#f69fae', '#ffffff']
const PURPLE_COLORS = ['#a855f7', '#d8b4fe', '#c084fc', '#e9d5ff']

export default function MouseMeteor() {
  const isActiveRef = useRef(true)

  useEffect(() => {
    isActiveRef.current = true

    // Inject global styles for the particles
    const styleEl = document.createElement('style')
    styleEl.textContent = `
      .meteor-particle {
        position: fixed;
        width: 8px;
        height: 8px;
        border-radius: 50%;
        pointer-events: none;
        z-index: 99999;
        transform: translate(-50%, -50%);
        box-shadow: 0 0 8px currentColor;
      }
      .meteor-particle.is-heart {
        width: 10px;
        height: 10px;
        border-radius: 0;
        transform: translate(-50%, -50%) rotate(-45deg);
      }
      .meteor-particle.is-heart::before,
      .meteor-particle.is-heart::after {
        content: "";
        position: absolute;
        width: 10px;
        height: 10px;
        background-color: var(--heart-color);
        border-radius: 50%;
        box-shadow: 0 0 8px var(--heart-color);
      }
      .meteor-particle.is-heart::before {
        top: -5px;
        left: 0;
      }
      .meteor-particle.is-heart::after {
        left: 5px;
        top: 0;
      }
    `
    document.head.appendChild(styleEl)

    function handleMouseMove(e: MouseEvent) {
      if (!isActiveRef.current) return

      const isDark =
        document.documentElement.getAttribute('data-theme') === 'dark'

      const el = document.createElement('div')
      el.classList.add('meteor-particle')
      document.body.appendChild(el)

      const x = e.clientX
      const y = e.clientY
      const offset = isDark ? -10 : 0
      el.style.left = `${x + offset}px`
      el.style.top = `${y + offset}px`

      if (isDark) {
        // Dark mode: purple hearts
        const heartColor =
          PURPLE_COLORS[Math.floor(Math.random() * PURPLE_COLORS.length)] ?? '#a855f7'
        el.classList.add('is-heart')
        el.style.setProperty('--heart-color', heartColor)
        el.style.backgroundColor = heartColor
        el.style.boxShadow = `0 0 8px ${heartColor}`
      } else {
        // Light mode: sakura circles
        const color = COLORS[Math.floor(Math.random() * COLORS.length)] ?? '#cd5c79'
        el.style.background = color
        el.style.color = color
      }

      // GSAP animation (replaces anime.js)
      const randX = Math.random() * 50 - 25
      const randY = Math.random() * 50 - 25
      const duration = 0.6 + Math.random() * 0.4

      gsap.to(el, {
        x: randX,
        y: randY,
        scale: 0,
        opacity: 0,
        duration,
        ease: 'expo.out',
        onComplete: () => {
          if (el.parentNode) {
            el.parentNode.removeChild(el)
          }
        },
      })
    }

    window.addEventListener('mousemove', handleMouseMove)

    return () => {
      isActiveRef.current = false
      window.removeEventListener('mousemove', handleMouseMove)
      if (styleEl.parentNode) {
        styleEl.parentNode.removeChild(styleEl)
      }
      // Clean up any leftover particles
      document
        .querySelectorAll('.meteor-particle')
        .forEach((el) => el.remove())
    }
  }, [])

  // This component renders nothing visible on its own;
  // particles are appended to document.body
  return null
}
