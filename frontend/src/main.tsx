import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import { Toaster } from 'sonner'
import App from './App'
import './index.css'

// Configure TanStack Query client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 10000),
      staleTime: 5 * 60 * 1000, // 5 minutes
      gcTime: 10 * 60 * 1000, // 10 minutes
      refetchOnWindowFocus: false,
      refetchOnReconnect: true,
    },
    mutations: {
      retry: 1,
      retryDelay: 1000,
    },
  },
})

// Type declaration for global loader function
declare global {
  interface Window {
    __hideInitialLoader: () => void
  }
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <App />
        <Toaster
          position="top-right"
          expand={false}
          richColors
          closeButton
          toastOptions={{
            style: {
              background: 'rgba(15, 15, 26, 0.95)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              backdropFilter: 'blur(12px)',
              color: '#f8fafc',
              fontFamily: 'Inter, system-ui, sans-serif',
            },
            className: 'sonner-toast',
            duration: 4000,
          }}
          theme="dark"
        />
      </BrowserRouter>
      {import.meta.env.VITE_ENABLE_DEVTOOLS === 'true' && (
        <ReactQueryDevtools initialIsOpen={false} buttonPosition="bottom-left" />
      )}
    </QueryClientProvider>
  </React.StrictMode>,
)

// Hide the initial HTML loading screen once React has mounted
if (typeof window.__hideInitialLoader === 'function') {
  window.__hideInitialLoader()
}
