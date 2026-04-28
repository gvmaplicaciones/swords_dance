import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import basicSsl from '@vitejs/plugin-basic-ssl'

export default defineConfig({
  plugins: [
    basicSsl(),
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'swordsdance-logo.png'],
      workbox: {
        maximumFileSizeToCacheInBytes: 4 * 1024 * 1024, // 4 MiB
      },
      manifest: {
        name: 'SwordsDance',
        short_name: 'SwordsDance',
        description: 'Asistente de batalla para Pokémon Champions',
        theme_color: '#0a1628',
        background_color: '#0a1628',
        display: 'standalone',
        orientation: 'portrait',
        icons: [
          { src: 'swordsdance-logo.png', sizes: '192x192', type: 'image/png' },
          { src: 'swordsdance-logo.png', sizes: '512x512', type: 'image/png' },
        ],
      },
    }),
  ],
})
