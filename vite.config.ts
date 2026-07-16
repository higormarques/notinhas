import { fileURLToPath, URL } from 'node:url'

import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  // Só definido em produção pelo workflow de deploy (`.github/workflows/ci.yml`), pra publicar
  // como GitHub Pages de projeto (`https://<user>.github.io/notinhas/`) sem afetar `pnpm dev`/
  // `pnpm build`/`pnpm preview` locais, que continuam servindo da raiz (`/`).
  base: process.env.VITE_BASE_PATH ?? '/',
  plugins: [vue(), tailwindcss()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
})
