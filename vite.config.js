import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      workbox: {
        globPatterns: ['**/*.{css,html,svg,png,woff2}'],
        navigateFallback: 'index.html',
        navigateFallbackDenylist: [/^\/api/],
        // Precache only critical JS chunks, lazy-load the rest at runtime
        globIgnores: ['**/exceljs*', '**/jspdf*', '**/html2canvas*'],
        runtimeCaching: [
          {
            urlPattern: /\.js$/,
            handler: 'StaleWhileRevalidate',
            options: { cacheName: 'js-chunks', expiration: { maxEntries: 100, maxAgeSeconds: 7 * 24 * 60 * 60 } },
          },
        ],
        clientsClaim: true,
        skipWaiting: true,
        cleanupOutdatedCaches: true,
      },
      manifest: {
        name: 'Eventi Mikai',
        short_name: 'Eventi',
        description: 'Gestione eventi Mikai',
        start_url: '/Mikai-Eventi/',
        scope: '/Mikai-Eventi/',
        display: 'standalone',
        background_color: '#ffffff',
        theme_color: '#3296dc',
        icons: [
          { src: 'icons/icon-192.svg', sizes: '192x192', type: 'image/svg+xml' },
          { src: 'icons/icon-512.svg', sizes: '512x512', type: 'image/svg+xml' },
          { src: 'icons/icon-512-maskable.svg', sizes: '512x512', type: 'image/svg+xml', purpose: 'maskable' },
        ],
      },
    }),
  ],
  base: '/Mikai-Eventi/',
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          'vendor-supabase': ['@supabase/supabase-js'],
          'vendor-recharts': ['recharts'],
          'vendor-datefns': ['date-fns'],
          'vendor-zustand': ['zustand'],
        }
      }
    }
  }
})
