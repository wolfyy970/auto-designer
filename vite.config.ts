import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig(({ mode }) => {
  // Load ALL env vars (empty prefix = no filter)
  const env = loadEnv(mode, process.cwd(), '');
  const lmStudioUrl = env.VITE_LMSTUDIO_URL || 'http://localhost:1234';
  const openRouterKey = env.OPENROUTER_API_KEY || env.VITE_OPENROUTER_API_KEY || '';

  return {
    plugins: [react(), tailwindcss()],
    server: {
      proxy: {
        '/lmstudio-api': {
          target: lmStudioUrl,
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/lmstudio-api/, ''),
        },
        '/openrouter-api': {
          target: 'https://openrouter.ai',
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/openrouter-api/, ''),
          headers: {
            'Authorization': `Bearer ${openRouterKey}`,
            'HTTP-Referer': 'http://localhost:5173',
          },
        },
      },
    },
    build: {
      rollupOptions: {
        output: {
          manualChunks: {
            'react-flow': ['@xyflow/react'],
            'router': ['react-router-dom'],
          },
        },
      },
    },
  };
})
