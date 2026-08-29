import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { fileURLToPath } from 'url'
import { generateSW } from './scripts/generate-sw.mjs'

// Tauri expects a fixed port in dev mode and correct build output
const TAURI = process.env.TAURI_ENV_PLATFORM !== undefined
// GitHub Pages needs /Astrum/ base path; local dev and Tauri use /
const GH_PAGES = process.env.GITHUB_PAGES === 'true'

const BASE = GH_PAGES ? '/Astrum/' : '/'

export default defineConfig({
  plugins: [react(), {
    name: 'astrum-sw',
    closeBundle() { generateSW(fileURLToPath(new URL('./dist', import.meta.url)), BASE) },
  }],
  base: BASE,
  resolve: {
    alias: {
      // The Emscripten glue isn't in swisseph-wasm's exports map; we need it
      // directly so src/engine/sweph.js can supply its own locateFile (the
      // package's default resolves against location.href, which breaks under
      // a base path like /Astrum/).
      'swisseph-wasm-glue': fileURLToPath(new URL('./node_modules/swisseph-wasm/wasm/swisseph.js', import.meta.url)),
    },
  },
  // Prevent vite from obscuring Rust errors
  clearScreen: false,
  server: {
    port: 3000,
    host: true,
    // Tauri uses a fixed port
    strictPort: TAURI,
  },
  // To access env vars with VITE_ prefix in browser code
  envPrefix: ['VITE_', 'TAURI_ENV_'],
  build: {
    // Tauri supports es2021
    target: TAURI ? ['es2021', 'chrome100', 'safari13'] : 'modules',
    // Don't minify for debug builds
    minify: !process.env.TAURI_ENV_DEBUG ? 'esbuild' : false,
    // Produce sourcemaps for debug builds
    sourcemap: !!process.env.TAURI_ENV_DEBUG,
    outDir: 'dist',
  },
})
