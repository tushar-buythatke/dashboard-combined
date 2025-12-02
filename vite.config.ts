import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'https://ext1.buyhatke.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, '/feature-tracking/dashboard'),
        secure: false
      },
      '/pos-api': {
        target: 'https://search-new.bitbns.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/pos-api/, '/buyhatkeAdDashboard/ads'),
        secure: false
      },
    },
  },
})
