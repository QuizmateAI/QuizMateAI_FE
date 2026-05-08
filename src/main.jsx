import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClient } from './lib/queryClient'
import './index.css'
import App from './App.jsx'
import { DarkModeProvider } from './hooks/useDarkMode'
import { i18nReady, preloadLanguage } from './i18n'
import { RuntimeRecoveryScreen } from '@/components/system/RuntimeRecoveryBoundary'
import { installRuntimeRecoveryListeners, tryScheduleRuntimeRecovery } from '@/lib/runtimeRecovery'
// IMPORTANT: import api so its module-level configureRefresh wires up before the
// token bootstrap below tries to call it.
import './api/api'
import { bootstrap as bootstrapTokenStorage } from '@/utils/tokenStorage'

installRuntimeRecoveryListeners()

async function bootstrap() {
  const rootElement = document.getElementById('root')

  if (!rootElement) {
    throw new Error('Missing root element')
  }

  const root = createRoot(rootElement)

  try {
    // i18n + access-token recovery in parallel. Token bootstrap calls /auth/refresh
    // (browser sends the httpOnly refresh cookie) and either restores the in-memory
    // access token or resolves with no auth — components render in their logged-out
    // state in the latter case.
    await Promise.all([i18nReady, bootstrapTokenStorage()])

    root.render(
      <StrictMode>
        <QueryClientProvider client={queryClient}>
          <DarkModeProvider>
            <App />
          </DarkModeProvider>
        </QueryClientProvider>
      </StrictMode>,
    )

    // Sau khi app đã render với namespace của route hiện tại, warm phần còn lại
    // trong nền để các lần navigate sau không phải chờ load i18n (gate không block).
    const warmCurrentLanguage = () => {
      const currentLang = typeof window !== 'undefined'
        ? (window.localStorage.getItem('app_language') || 'vi')
        : 'vi'
      void preloadLanguage(currentLang)
    }

    if (typeof window !== 'undefined' && typeof window.requestIdleCallback === 'function') {
      window.requestIdleCallback(warmCurrentLanguage, { timeout: 2000 })
    } else {
      setTimeout(warmCurrentLanguage, 500)
    }
  } catch (error) {
    const isReloading = tryScheduleRuntimeRecovery(error)

    root.render(
      <RuntimeRecoveryScreen
        error={error}
        isReloading={isReloading}
        onReload={() => window.location.reload()}
      />,
    )
  }
}

bootstrap()
