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
        target: 'https://dashboard-combined.vercel.app',
        changeOrigin: true,
        secure: true,
      },
      // Proxy for brand logos (CORS bypass in dev)
      '/brand-logo': {
        target: 'https://search-new.bitbns.com',
        changeOrigin: true,
        secure: true,
        headers: {
          referer: 'https://search-new.bitbns.com/',
          origin: 'https://search-new.bitbns.com',
          'user-agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36',
        },
        rewrite: (p) => p.replace(/^\/brand-logo/, '/buyhatke/wrapper/brandLogo'),
      },
      // Proxy for coupon config API (CORS bypass)
      '/coupon-config': {
        target: 'https://search-new.bitbns.com',
        changeOrigin: true,
        secure: true,
        headers: {
          referer: 'https://search-new.bitbns.com/',
          origin: 'https://search-new.bitbns.com',
          'user-agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36',
        },
        rewrite: (p) => {
          if (/^\/coupon-config\/?$/.test(p)) {
            return '/extension/configs-coupons/prod/ALL_CONFIG_COUPON.json'
          }
          return p.replace(/^\/coupon-config/, '/extension/configs-coupons/prod')
        },
      },
      // Proxy for live sites API (CORS bypass)
      '/live-sites': {
        target: 'https://search-new.bitbns.com',
        changeOrigin: true,
        secure: true,
        headers: {
          referer: 'https://search-new.bitbns.com/',
          origin: 'https://search-new.bitbns.com',
          'user-agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36',
        },
        rewrite: () => '/extension/configs-giftVoucher/prod/liveSitesWeb.json',
      },
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
  },
})
