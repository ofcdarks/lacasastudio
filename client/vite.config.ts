import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api/framecut/serve-video': {
        target: 'http://localhost:3000',
        changeOrigin: true,
        timeout: 0, // No timeout for video streaming
      },
      '/api/framecut/serve-frame': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
      '/api/framecut/download-file': {
        target: 'http://localhost:3000',
        changeOrigin: true,
        timeout: 0,
      },
      '/api': 'http://localhost:3000',
      '/uploads': 'http://localhost:3000',
    }
  }
})
