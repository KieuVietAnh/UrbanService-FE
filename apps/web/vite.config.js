import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
  ],
  resolve: {
    alias: {
      '@urbanmind/shared-api': path.resolve(__dirname, '../../packages/shared-api/src'),
      '@urbanmind/shared-types': path.resolve(__dirname, '../../packages/shared-types/src'),
      '@urbanmind/shared-ui': path.resolve(__dirname, '../../packages/shared-ui/src'),
    },
  },
  server: {
    fs: {
      allow: [
        path.resolve(__dirname, '../../'),
        path.resolve(__dirname, '../../packages/shared-api'),
        path.resolve(__dirname, '../../packages/shared-types'),
        path.resolve(__dirname, '../../packages/shared-ui'),
        path.resolve(__dirname),
      ],
    },
  },
})
