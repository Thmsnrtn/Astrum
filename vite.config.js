import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Tauri expects a fixed port in dev mode and correct build output
const TAURI = process.env.TAURI_ENV_PLATFORM !== undefined

export default defineConfig({
  plugins: [react()],
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
