import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'

export default defineConfig(({ mode }) => ({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@moyin/shared': path.resolve(__dirname, '../../packages/shared/src'),
      '@moyin/vn-engine': path.resolve(__dirname, '../../packages/vn-engine/src'),
      '@moyin/llm-sdk': path.resolve(__dirname, '../../packages/llm-sdk/src'),
    },
  },
  server: {
    port: 8001,
    open: false,
    proxy: {
      '/health': {
        target: 'http://127.0.0.1:9009',
        changeOrigin: true,
      },
      '/api': {
        target: 'http://127.0.0.1:9009',
        changeOrigin: true,
        rewrite: (p) => p.replace(/^\/api/, ''),
      },
      '/open-api': {
        target: 'http://127.0.0.1:9009',
        changeOrigin: true,
        rewrite: (p) => p.replace(/^\/open-api/, ''),
      },
    },
  },
  define: mode === 'test' ? {} : {
    'process.env.NODE_ENV': JSON.stringify('production'),
  },
  build: {
    target: 'es2022',
    sourcemap: true,
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-react': ['react', 'react-dom'],
          'vendor-3d': ['three', '@react-three/fiber', '@react-three/drei'],
          'vendor-2d': ['pixi.js'],
        },
      },
    },
  },
  publicDir: 'public',
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/__tests__/setup.ts'],
    exclude: ['e2e/**', 'node_modules/**', 'dist/**'],
    passWithNoTests: true,
  },
}))
