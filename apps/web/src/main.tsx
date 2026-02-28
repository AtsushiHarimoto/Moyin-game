import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'

// Initialize i18n (side-effect import - must be before App)
import '@/lib/i18n'

// Global styles (Tailwind v4 + theme variables + global CSS)
import '@/assets/styles/globals.css'

import App from './App'

// Apply saved theme to <html> before first paint
const savedTheme = localStorage.getItem('user-theme') || 'sakura'
document.documentElement.setAttribute('data-theme', savedTheme)

const rootEl = document.getElementById('root')
if (!rootEl) {
  throw new Error('Root element #root not found in the DOM')
}

createRoot(rootEl).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
