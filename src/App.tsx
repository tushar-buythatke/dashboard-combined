import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import AnalyticsPage from '@/pages/Analytics'
import { ThemeProvider } from '@/components/theme/theme-provider'
import { CursorGlow, CursorRipple } from '@/components/ui/animated-background'

function App() {
  return (
    <ThemeProvider>
      <Router>
        {/* Global cursor effects */}
        <CursorGlow />
        <CursorRipple />
        
        <Routes>
          <Route path="/analytics" element={<AnalyticsPage />} />
          <Route path="/" element={<Navigate to="/analytics" replace />} />
          <Route path="*" element={<Navigate to="/analytics" replace />} />
        </Routes>
      </Router>
    </ThemeProvider>
  )
}

export default App