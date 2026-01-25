import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  base: './', 
  build: {
    // Build directly to a sibling folder that serves as the "production" app
    outDir: '../smart_map_app',
    emptyOutDir: true,
  }
})
