import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  // Sem source maps no build: eles expõem o código-fonte quando publicados.
  build: { sourcemap: false },
})
