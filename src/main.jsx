import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.jsx'
import { initSweph } from './engine/sweph.js'
import { initDurable, rawGet, rawSet, removeKey } from './lib/storage.js'

// Swiss Ephemeris loads in the background (~13 MB WASM+data, SW-cached after
// first visit). Render is never blocked: the app boots on the Meeus engine
// and upgrades to arc-second precision the moment the module is ready.
initSweph()

// window.storage is the legacy interface many call sites use. Route it through
// the storage layer so every write also mirrors to the durable IndexedDB store.
if (!window.storage) {
  window.storage = {
    get: async (key) => { const v = rawGet(key); return v != null ? { value: v } : null },
    set: async (key, value) => { rawSet(key, value) },
    delete: async (key) => { removeKey(key) },
    // Sync shims — some legacy call sites expect the localStorage interface
    getItem: (key) => rawGet(key),
    setItem: (key, value) => rawSet(key, value),
  }
}

// Reconcile localStorage with the durable IndexedDB mirror before first read —
// restores the practice record if iOS evicted localStorage under pressure.
// Best-effort: any failure just boots on plain localStorage.
initDurable().catch(() => {}).finally(() => {
  createRoot(document.getElementById('root')).render(
    <StrictMode>
      <App />
    </StrictMode>,
  )
})
