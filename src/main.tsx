import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './app/styles/index.css'
import App from './app/App'

if (import.meta.env.DEV && import.meta.env.VITE_REACT_SCAN === 'true') {
  const { scan } = await import('react-scan')

  scan({
    enabled: true,
    showToolbar: true,
    log: false,
    animationSpeed: 'fast',
  })
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
