import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { GoogleOAuthProvider } from '@react-oauth/google'
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClient } from './queryClient'
import './index.css'
import App from './App.jsx'
import { DarkModeProvider } from './hooks/useDarkMode'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <GoogleOAuthProvider clientId={import.meta.env.VITE_GOOGLE_CLIENT_ID}>
        <DarkModeProvider>
          <App />
        </DarkModeProvider>
      </GoogleOAuthProvider>
    </QueryClientProvider>
  </StrictMode>,
)
