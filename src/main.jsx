import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App'

// Dopo un deploy una scheda aperta può chiedere un chunk lazy che non esiste più:
// ricarichiamo una volta per prendere la versione nuova (flag anti-loop).
window.addEventListener('vite:preloadError', (event) => {
  try {
    if (sessionStorage.getItem('chunk-reload')) return
    sessionStorage.setItem('chunk-reload', '1')
  } catch { return } // senza storage non possiamo evitare un loop di reload
  event.preventDefault()
  window.location.reload()
})
window.addEventListener('load', () => {
  setTimeout(() => { try { sessionStorage.removeItem('chunk-reload') } catch { /* ignore */ } }, 10000)
})

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
