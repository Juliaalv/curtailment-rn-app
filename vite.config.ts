import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // Subcaminho do GitHub Pages: https://<usuario>.github.io/curtailment-rn-app/
  base: process.env.GITHUB_PAGES ? '/curtailment-rn-app/' : '/',
})
