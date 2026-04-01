import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClient } from './queryClient'
import './index.css'
import App from './App.jsx'
import { DarkModeProvider } from './hooks/useDarkMode'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <DarkModeProvider>
        <App />
      </DarkModeProvider>
    </QueryClientProvider>
  </StrictMode>,
)
