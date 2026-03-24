import path from "path"
import { fileURLToPath } from "url"
import react from "@vitejs/plugin-react"
import eslint from "vite-plugin-eslint"
import { compression } from "vite-plugin-compression2"
import { defineConfig } from "vitest/config"

const __dirname = path.dirname(fileURLToPath(import.meta.url))

export default defineConfig({
  plugins: [
    react(),
    eslint({
      cache: false,
      include: ['./src/**/*.js', './src/**/*.jsx'],
      exclude: ['/node_modules/'],
      failOnError: false,
      failOnWarning: false,
      emitWarning: true,
      emitError: true,
    }),
    compression({
      algorithms: ['gzip', 'brotliCompress'],
      exclude: [/\.(br)$/, /\.(gz)$/],
      threshold: 1024,
    }),
  ],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.js'],
    // Đảm bảo Vitest xử lý tốt các tệp JSX
    include: ['src/**/*.{test,spec}.{js,jsx}'],
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
    dedupe: ['react', 'react-dom', 'react-router', 'react-router-dom'],
  },
  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      'react/jsx-runtime',
      'react/jsx-dev-runtime',
      'react-router',
      'react-router-dom',
    ],
  },
  build: {
    // Enable minification with terser for better compression
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true,   // Remove console.log in production
        drop_debugger: true,
      },
    },
    // Code splitting configuration
    rollupOptions: {
      output: {
        manualChunks: {
          // Vendor chunks - split large dependencies
          'vendor-router': ['react-router-dom'],
          'vendor-i18n': ['i18next', 'react-i18next'],
          'vendor-ui': [
            '@radix-ui/react-dialog',
            '@radix-ui/react-dropdown-menu',
            '@radix-ui/react-checkbox',
            '@radix-ui/react-label',
            '@radix-ui/react-slot',
            'class-variance-authority',
            'clsx',
            'tailwind-merge',
          ],
        },
      },
    },
    // Increase chunk size warning limit
    chunkSizeWarningLimit: 500,
    // Enable source maps for debugging (disable in production if not needed)
    sourcemap: false,
    // CSS code splitting
    cssCodeSplit: true,
  },
  server: {
    allowedHosts: [
      'nondetonating-jules-energetically.ngrok-free.dev'
    ],
    headers: {
      'Cross-Origin-Opener-Policy': 'same-origin-allow-popups',
      'Cross-Origin-Embedder-Policy': 'unsafe-none',
    },
    proxy: {
      '/api': {
        target: 'http://localhost:8080',
        changeOrigin: true,
      },
    },
  },
})
