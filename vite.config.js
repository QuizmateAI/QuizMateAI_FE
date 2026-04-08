import path from "path"
import { fileURLToPath } from "url"
import react from "@vitejs/plugin-react"
import eslint from "vite-plugin-eslint"
import { compression } from "vite-plugin-compression2"
import { loadEnv } from "vite"
import { defineConfig } from "vitest/config"

const __dirname = path.dirname(fileURLToPath(import.meta.url))

const manualChunkPackages = {
  'vendor-router': ['react-router-dom'],
  'vendor-query': ['@tanstack/react-query'],
  'vendor-i18n': ['i18next', 'react-i18next'],
  'vendor-auth': ['@react-oauth/google'],
  'vendor-flashcard': ['react-quizlet-flashcard'],
  'vendor-charts': ['recharts'],
  'vendor-http': ['axios'],
  'vendor-ws': ['@stomp/stompjs', 'sockjs-client'],
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
}

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
      minWorkers: 1,
      maxWorkers: 1,
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
        'recharts',
        'lucide-react',
        '@radix-ui/react-checkbox',
        '@radix-ui/react-dialog',
        '@radix-ui/react-dropdown-menu',
        '@radix-ui/react-label',
        '@radix-ui/react-slot',
        'class-variance-authority',
        'clsx',
        'tailwind-merge',
      ],
    },
    build: {
      target: 'es2020',
      minify: 'terser',
      terserOptions: {
        compress: {
          drop_console: true,
          drop_debugger: true,
          passes: 2,
          pure_getters: true,
          unsafe_math: true,
        },
        mangle: {
          safari10: true,
        },
        format: {
          comments: false,
        },
      },
      rollupOptions: {
        output: {
          manualChunks(id) {
            const normalizedId = id.replace(/\\/g, '/')
            const localeMatch = normalizedId.match(/\/src\/i18n\/locales\/(en|vi)\/([^/]+)\.json$/)

            if (localeMatch) {
              return `i18n-${localeMatch[1]}-${localeMatch[2]}`
            }

            for (const [chunkName, packages] of Object.entries(manualChunkPackages)) {
              if (packages.some((pkg) => normalizedId.includes(`/node_modules/${pkg}/`))) {
                return chunkName
              }
            }

            return undefined
          },
        },
      },
      chunkSizeWarningLimit: 500,
      sourcemap: false,
      cssCodeSplit: true,
      assetsInlineLimit: 4096,
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
