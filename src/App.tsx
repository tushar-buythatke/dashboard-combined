import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from '@/contexts/AuthContext'
import LoginPage from '@/pages/Login'
import AnalyticsPage from '@/pages/Analytics'
import { ProtectedRoute } from '@/components/ProtectedRoute'
import { ThemeProvider } from '@/components/theme/theme-provider'
import { CursorGlow, CursorRipple } from '@/components/ui/animated-background'

function App() {
  return (
    <ThemeProvider>
      <Router>
        <AuthProvider>
          {/* Global cursor effects */}
          <CursorGlow />
          <CursorRipple />
          
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route 
              path="/analytics" 
              element={
                <ProtectedRoute>
                  <AnalyticsPage />
                </ProtectedRoute>
              } 
            />
            <Route path="/" element={<Navigate to="/analytics" replace />} />
            <Route path="*" element={<Navigate to="/analytics" replace />} />
          </Routes>
        </AuthProvider>
      </Router>
    </ThemeProvider>
  )
}

export default App