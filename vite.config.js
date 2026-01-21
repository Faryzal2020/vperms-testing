import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
    plugins: [react()],
    server: {
        port: 5173,
        // No proxy needed - we make direct API calls to the backend
        // Configure VITE_BACKEND_URL in .env or .env.local
    },
})
