import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  base: '/',
  plugins: [
    {
      name: 'fix-mime-types',
      configureServer(server) {
        server.middlewares.use((req, res, next) => {
          if (req.url) {
            const cleanUrl = req.url.split('?')[0];
            if (/\.(js|mjs|ts|tsx|jsx)$/i.test(cleanUrl)) {
              res.setHeader('Content-Type', 'text/javascript');
            }
          }
          next();
        });
      },
    },
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: [
        'favicon.ico',
        'favicon.svg',
        'favicon.png',
        'favicon-16x16.png',
        'favicon-32x32.png',
        'favicon-48x48.png',
        'apple-touch-icon.png',
        'android-chrome-192x192.png',
        'android-chrome-512x512.png',
        'logo.png',
        'logo.webp',
      ],
      manifest: {
        name: 'Thingor – Personal Inventory',
        short_name: 'Thingor',
        description: 'Thingor - Tartsd nyilván a tulajdonodban lévő tárgyakat, hol vannak, mennyit érnek és mi tartozik hozzájuk.',
        start_url: '/',
        scope: '/',
        display: 'standalone',
        orientation: 'any',
        background_color: '#303943',
        theme_color: '#2563EB',
        categories: ['utilities', 'productivity', 'lifestyle'],
        icons: [
          {
            src: '/android-chrome-192x192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any'
          },
          {
            src: '/android-chrome-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any'
          },
          {
            src: '/logo.webp',
            sizes: '1024x1008',
            type: 'image/webp',
            purpose: 'any'
          },
          {
            src: '/logo.png',
            sizes: '1024x1008',
            type: 'image/png',
            purpose: 'any'
          },
          {
            src: '/apple-touch-icon.png',
            sizes: '180x180',
            type: 'image/png',
            purpose: 'any'
          }
        ],
      },
      workbox: {
        maximumFileSizeToCacheInBytes: 4 * 1024 * 1024,
        globPatterns: ['**/*.{js,css,html,ico,png,svg,webmanifest}'],
        navigateFallback: '/index.html',
        navigateFallbackDenylist: [/^\/api/, /^https:\/\/.*\.supabase\.co/, /^https:\/\/media\.thingor\.com/, /^https:\/\/images\.weserv\.nl/],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-cache',
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60 * 60 * 24 * 365
              },
              cacheableResponse: {
                statuses: [0, 200]
              }
            }
          },
          {
            urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'gstatic-fonts-cache',
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60 * 60 * 24 * 365
              },
              cacheableResponse: {
                statuses: [0, 200]
              }
            }
          },
          {
            // NetworkOnly for Supabase API and Auth to ensure real-time security and zero data caching
            urlPattern: /^https:\/\/.*\.supabase\.co\/.*/i,
            handler: 'NetworkOnly'
          }
        ]
      }
    })
  ],
})
