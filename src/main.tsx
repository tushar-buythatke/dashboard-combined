import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import * as Sentry from '@sentry/react'

import './index.css'
import App from './App'
import { ThemeProvider } from './components/theme/theme-provider'

Sentry.init({
  dsn: 'https://6ba835eda84a48f7848f351aaea6f4d3@sentry.buyhatke.com/1',
  tracesSampleRate: 0.01,
  beforeBreadcrumb(breadcrumb) {
    if (breadcrumb.category === 'console' && (breadcrumb.level === 'log' || breadcrumb.level === 'info' || breadcrumb.level === 'debug')) {
      return null
    }
    return breadcrumb
  },
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Sentry.ErrorBoundary fallback={<p>Something went wrong.</p>}>
      <ThemeProvider>
        <App />
      </ThemeProvider>
    </Sentry.ErrorBoundary>
  </StrictMode>,
)
