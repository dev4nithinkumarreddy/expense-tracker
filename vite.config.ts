import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({ 
      registerType: 'autoUpdate',
      manifest: {
        name: 'Expense Tracker',
        short_name: 'Expenses',
        description: 'Personal minimal expense tracker',
        theme_color: '#09090b',
        background_color: '#09090b',
        display: 'standalone'
      }
    })
  ],
})
