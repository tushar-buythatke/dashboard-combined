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
      // Proxy for coupon config API (CORS bypass)
      '/coupon-config': {
        target: 'https://search-new.bitbns.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/coupon-config/, '/extension/configs-coupons/prod'),
        secure: true,
      },
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
  },
})
