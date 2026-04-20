import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
  ],
  server: {
    host: '0.0.0.0', 
    port: 5173,
    strictPort: true, 
    allowedHosts: [
      'imacampus.online', 
      'www.imacampus.online', 
      'localhost'
    ],
    // 🔥 මෙන්න මේ කෑල්ලෙන් තමයි Live Reload (HMR) එක HTTPS හරහා යවන්නේ
    hmr: {
        clientPort: 443,
    }
  }
})