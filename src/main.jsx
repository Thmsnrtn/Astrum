import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.jsx'

// Polyfill window.storage for environments that don't provide it
if (!window.storage) {
  window.storage = {
    get: async (key) => {
      try {
        const value = localStorage.getItem(key)
        return value ? { value } : null
      } catch { return null }
    },
    set: async (key, value) => {
      try { localStorage.setItem(key, value) } catch {}
    },
    delete: async (key) => {
      try { localStorage.removeItem(key) } catch {}
    },
    // Sync shims — some legacy call sites expect the localStorage interface
    getItem: (key) => {
      try { return localStorage.getItem(key) } catch { return null }
    },
    setItem: (key, value) => {
      try { localStorage.setItem(key, value) } catch {}
    },
  }
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
