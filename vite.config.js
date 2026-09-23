import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Served from a custom domain (led-gr.online) at the ROOT, so base is '/'.
// If you ever go back to the github.io sub-path, set base to '/girlsHackathon/'.
export default defineConfig({
  base: '/',
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
