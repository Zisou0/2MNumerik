import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    host: '0.0.0.0', // Makes the dev server accessible from outside
    allowedHosts: ['6a76-105-102-7-60.ngrok-free.app'], // ⬅️ Add your ngrok domain here
  },
})
