import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': {
        target: 'http://backend:3000',
        changeOrigin: true,
      }
    },
    watch: {
      // Use polling in Docker environments for more reliable file watching
      usePolling: true,
      interval: 1000,
    },
    hmr: {
      // Make sure HMR works across network
      host: '0.0.0.0',
    },
    port: 5173,
    open: true
  }
}) 