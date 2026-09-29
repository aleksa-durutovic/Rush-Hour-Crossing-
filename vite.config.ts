import { defineConfig } from 'vite'

// Development only: the page calls /api on the Vite origin and Vite forwards it to the local API server.
export default defineConfig({
  server: {
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:8787',
        changeOrigin: true,
      },
    },
  },
})
