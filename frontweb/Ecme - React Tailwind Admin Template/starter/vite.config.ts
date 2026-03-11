import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import dynamicImport from 'vite-plugin-dynamic-import'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')

  return {
    plugins: [react(), dynamicImport()],
    assetsInclude: ['**/*.md'],
    resolve: {
      alias: {
        '@': path.join(__dirname, 'src'),
      },
    },
    server: {
      proxy: {
        '/api': {
          target: env.VITE_BACKEND_URL || 'http://127.0.0.1:8000',
          changeOrigin: true,
          secure: false,
        },
      },
    },
    build: {
      outDir: 'build',
    },
  }
})
