import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig(({ mode }) => {
    // Load env file based on `mode` in the current working directory.
    // Set the third parameter to '' to load all env regardless of the `VITE_` prefix.
    process.env = { ...process.env, ...loadEnv(mode, process.cwd(), '') };

    return {
        plugins: [react()],
        server: {
            port: parseInt(process.env.PORT) || 6173,
            // No proxy needed - we make direct API calls to the backend
            // Configure VITE_BACKEND_URL in .env or .env.local
        },
    }
})
