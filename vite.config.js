import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Repo is served from GitHub Pages at https://<user>.github.io/girlsHackathon/
// so assets must resolve under that sub-path. When you point a custom domain at
// the repo (served from the domain root), change base back to '/'.
export default defineConfig({
  base: '/girlsHackathon/',
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom', 'react-router-dom', 'framer-motion'],
          ethers: ['ethers'],
        },
      },
    },
  },
})
