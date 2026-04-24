import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClient } from './queryClient'
import './index.css'
import App from './App.jsx'
import { DarkModeProvider } from './hooks/useDarkMode'
import { i18nReady } from './i18n'
import { RuntimeRecoveryScreen } from '@/Components/system/RuntimeRecoveryBoundary'
import { installRuntimeRecoveryListeners, tryScheduleRuntimeRecovery } from '@/lib/runtimeRecovery'

installRuntimeRecoveryListeners()

async function bootstrap() {
  const rootElement = document.getElementById('root')

  if (!rootElement) {
    throw new Error('Missing root element')
  }

  const root = createRoot(rootElement)

  try {
    await i18nReady

    root.render(
      <StrictMode>
        <QueryClientProvider client={queryClient}>
          <DarkModeProvider>
            <App />
          </DarkModeProvider>
        </QueryClientProvider>
      </StrictMode>,
    )
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
