import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
  ],
  build: {
    sourcemap: false, // 🔥 මේකෙන් තමයි public source code පේන එක සම්පූර්ණයෙන්ම නවත්තන්නේ
    rollupOptions: {
        output: {
            manualChunks: undefined,
        },
    },
  },
  server: {
    host: '0.0.0.0', 
    port: 5173,
    strictPort: true, 
    allowedHosts: [
      'imacampus.online', 
      'www.imacampus.online', 
      'localhost'
    ]
  }
})