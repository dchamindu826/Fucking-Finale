import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  base: '/', // 🔥 මෙන්න මේ පේළිය අලුතෙන් දැම්මා 🔥
  plugins: [
    react(),
    tailwindcss(),
  ],
  build: {
    sourcemap: false, 
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