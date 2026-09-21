/// <reference types="vitest" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({ 
      registerType: 'autoUpdate',
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
        ],
        share_target: {
          action: '/',
          method: 'GET',
          params: {
            title: 'title',
            text: 'text',
            url: 'url'
          }
        },
        shortcuts: [
          {
            name: 'Quick Add Expense',
            short_name: 'Add Expense',
            description: 'Quickly record a new expense',
            url: '/?action=add-expense',
            icons: [
              {
                src: '/icon.png',
                sizes: '192x192',
                type: 'image/png'
              }
            ]
          },
          {
            name: "View Today's Total",
            short_name: 'Today',
            description: "Check today's expenses and budget",
            url: '/?action=today',
            icons: [
              {
                src: '/icon.png',
                sizes: '192x192',
                type: 'image/png'
              }
            ]
          },
          {
            name: 'Scan / Upload Receipt',
            short_name: 'Scan',
            description: 'Scan or upload a receipt to log expense',
            url: '/?action=scan-receipt',
            icons: [
              {
                src: '/icon.png',
                sizes: '192x192',
                type: 'image/png'
              }
            ]
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
    fileParallelism: false
  }
})
