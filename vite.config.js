import path from "path"
import { fileURLToPath } from "url"
import react from "@vitejs/plugin-react"
import eslint from "vite-plugin-eslint"
import { compression } from "vite-plugin-compression2"
import { loadEnv } from "vite"
import { defineConfig } from "vitest/config"

const __dirname = path.dirname(fileURLToPath(import.meta.url))

function resolveProxyTarget(env) {
  const explicitTarget = env.VITE_DEV_PROXY_TARGET?.trim()
  if (explicitTarget) {
    return explicitTarget
  }

  const configuredApiBaseUrl = env.VITE_API_BASE_URL?.trim()
  if (!configuredApiBaseUrl) {
    return undefined
  }

  try {
    return new URL(configuredApiBaseUrl).origin
  } catch {
    return undefined
  }
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, __dirname, '')
  const proxyTarget = resolveProxyTarget(env)

  return {
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
      // Dam bao Vitest xu ly tot cac tep JSX
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
          drop_console: true,
          drop_debugger: true,
        },
      },
      rollupOptions: {
        output: {
          manualChunks: {
            'vendor-router': ['react-router-dom'],
            'vendor-i18n': ['i18next', 'react-i18next'],
            'vendor-auth': ['@react-oauth/google'],
            'vendor-flashcard': ['react-quizlet-flashcard'],
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
      chunkSizeWarningLimit: 500,
      sourcemap: false,
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
      proxy: proxyTarget ? {
        '/api': {
          target: proxyTarget,
          changeOrigin: true,
        },
        '/ws-quiz': {
          target: proxyTarget,
          changeOrigin: true,
          ws: true,
        },
      } : undefined,
    },
  }
})
