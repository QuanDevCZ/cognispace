import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    // Installable app + offline cache. autoUpdate is safe: the focus timer stores an end
    // timestamp, so a reload after an update doesn't lose a running session.
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: 'auto',
      includeAssets: ['icon.svg', 'favicon.ico', 'apple-touch-icon-180x180.png'],
      manifest: {
        name: 'Cognispace',
        short_name: 'Cognispace',
        description: 'Plan the day, protect your focus, map what you understand.',
        start_url: './',
        scope: './',
        display: 'standalone',
        background_color: '#060709',
        theme_color: '#060709',
        icons: [
          { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png' },
          { src: 'maskable-icon-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,woff,woff2,svg,png,ico}'],
        maximumFileSizeToCacheInBytes: 4 * 1024 * 1024,
        navigateFallback: 'index.html',
      },
    }),
  ],
  base: './',
  server: { port: 5199, strictPort: false },
  build: { chunkSizeWarningLimit: 1600 },
});
