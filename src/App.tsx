import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import AnalyticsPage from '@/pages/Analytics'
import AuthLogin from '@/pages/AuthLogin'
import AdminPanel from '@/pages/AdminPanel'
import RequestAccess from '@/pages/RequestAccess'
import { ThemeProvider } from '@/components/theme/theme-provider'
import { CursorGlow, CursorRipple } from '@/components/ui/animated-background'
import { Toaster } from 'sonner'
import { AnalyticsAuthProvider, useAnalyticsAuth } from '@/contexts/AnalyticsAuthContext'
import { OrganizationProvider } from '@/contexts/OrganizationContext'

// Protected route wrapper using context
function PrivateRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAnalyticsAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="h-8 w-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  return <>{children}</>
}

function App() {
  return (
    <AnalyticsAuthProvider>
      <OrganizationProvider>
        <ThemeProvider>
          <Router>
            {/* Global cursor effects */}
            <CursorGlow />
            <CursorRipple />

            <Routes>
              <Route path="/login" element={<AuthLogin />} />
              <Route path="/admin" element={
                <PrivateRoute>
                  <AdminPanel />
                </PrivateRoute>
              } />
              <Route path="/request-access" element={
                <PrivateRoute>
                  <RequestAccess />
                </PrivateRoute>
              } />
              <Route path="/analytics" element={
                <PrivateRoute>
                  <AnalyticsPage />
                </PrivateRoute>
              } />
              <Route path="/" element={<Navigate to="/analytics" replace />} />
              <Route path="*" element={<Navigate to="/analytics" replace />} />
            </Routes>
            <Toaster position="bottom-right" richColors />
          </Router>
        </ThemeProvider>
      </OrganizationProvider>
    </AnalyticsAuthProvider>
  )
}

export default App