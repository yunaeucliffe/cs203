import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  server: {
    proxy: { '/api': 'http://localhost:8081' },
  },
  plugins: [
    react(),
    tailwindcss(),
  ],
})
