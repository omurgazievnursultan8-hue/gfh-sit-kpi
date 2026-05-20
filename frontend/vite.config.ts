import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  define: {
    global: 'globalThis',
  },
  resolve: {
    alias: { '@': path.resolve(__dirname, './src') },
  },
  server: {
    port: Number(process.env.FRONTEND_PORT) || 5173,
    proxy: {
      '/api': { target: `http://localhost:${process.env.BACKEND_PORT || 8080}`, changeOrigin: true },
      '/ws': { target: `ws://localhost:${process.env.BACKEND_PORT || 8080}`, ws: true },
    },
  },
})
