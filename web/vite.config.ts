import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'


// https://vite.dev/config/
export default defineConfig({
  base: process.env.VITE_BASE_PATH ?? '/',
  plugins: [
    tailwindcss(),
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['siga.png', 'iconsiga.png'],
      manifest: {
        name: 'SIGAweb',
        short_name: 'SIGA',
        description: 'Sistema Integral de Gestión Administrativa',
        lang: 'es-MX',
        start_url: process.env.VITE_BASE_PATH ?? '/',
        scope: process.env.VITE_BASE_PATH ?? '/',
        theme_color: '#008f43',
        background_color: '#ffffff',
        display: 'standalone',
        icons: [
          {
            src: 'siga.png',
            sizes: '460x460',
            type: 'image/png',
          },
          {
            src: 'iconsiga.png',
            sizes: '937x937',
            type: 'image/png',
          },
        ],
      },
      workbox: {
        navigateFallbackDenylist: [/^\/api\//],
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff,woff2}'],
        runtimeCaching: [
          {
            urlPattern: ({ url }) => url.pathname.includes('/api/'),
            handler: 'NetworkOnly',
          },
        ],
      },
    }),
  ],
  server: {
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:3005',
        changeOrigin: true,
        secure: false,
      }
    }
  }
})
