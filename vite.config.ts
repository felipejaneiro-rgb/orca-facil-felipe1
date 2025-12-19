
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Configuração simplificada para máxima performance e compatibilidade
export default defineConfig({
  plugins: [
    react()
  ],
  server: {
    hmr: {
      overlay: false
    }
  }
})
