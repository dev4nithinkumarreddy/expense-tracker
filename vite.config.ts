/// <reference types="vitest" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({ 
      registerType: 'prompt',
      strategies: 'injectManifest',
      srcDir: 'src',
      filename: 'sw.ts',
      manifest: {
        name: 'Expense Tracker',
        short_name: 'Expenses',
        description: 'Personal minimal expense tracker',
        theme_color: '#09090b',
        background_color: '#09090b',
        display: 'standalone',
        icons: [
          {
            src: '/icon.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: '/icon.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable'
          }
        ]
      }
    })
  ],
  // @ts-expect-error: vitest adds test to UserConfig
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: './vitest.setup.ts',
  }
})
