import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
// Netlify serves the app from the domain root, so the default base is enough.
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    proxy: {
      '/github-oauth/device/code': {
        target: 'https://github.com',
        changeOrigin: true,
        rewrite: () => '/login/device/code',
      },
      '/github-oauth/access_token': {
        target: 'https://github.com',
        changeOrigin: true,
        rewrite: () => '/login/oauth/access_token',
      },
    },
  },
  resolve: {
    // All overlays must share Radix's layer registry and focus stack.
    dedupe: ['react', 'react-dom', '@radix-ui/react-dismissable-layer', '@radix-ui/react-focus-scope'],
    alias: {
      '@': '/src',
    },
  },
})
