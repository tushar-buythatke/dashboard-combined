import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Eye, EyeOff, LogOut, User, Sparkles, BarChart3, ArrowRight } from "lucide-react"

import { DynamicStatusBar } from "@/components/dashboard/dynamic-status-bar"
import { CriticalAlertsPanel } from "@/components/dashboard/critical-alerts"
import { RealtimeMetrics } from "@/components/dashboard/realtime-metrics"
import { DashboardToggles } from "@/components/dashboard/dashboard-toggles"
import AnalyticsPanel from "@/components/analytics/AnalyticsPanel"
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import GlobalStats from "@/components/dashboard/global-stats"
import POSStatsGrid from "@/components/dashboard/pos-stats-grid"
import ErrorTrends from "@/components/dashboard/error-trends"
import { EventVolumeChart } from "@/components/dashboard/event-volume-chart"
import { NotificationTrends } from "@/components/dashboard/notification-trends"
import { Button } from "@/components/ui/button"
import { Link } from "react-router-dom"
import { useAuth } from "@/contexts/AuthContext"

export default function DashboardPage() {
  const { user, logout } = useAuth()
  const [showStatusBar, setShowStatusBar] = useState(true)
  const [showRealtime, setShowRealtime] = useState(true)
  const [showAlerts, setShowAlerts] = useState(true)
  const [showGlobalStats, setShowGlobalStats] = useState(true)
  const [showErrorTrends, setShowErrorTrends] = useState(true)
  const [showEventVolume, setShowEventVolume] = useState(true)
  const [showPOSGrid, setShowPOSGrid] = useState(true)
  const [showNotificationTrends, setShowNotificationTrends] = useState(true)
  const [showAnalytics, setShowAnalytics] = useState(false)

  const handleLogout = async () => {
    await logout()
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900/20 to-slate-900 p-4 md:p-6">
      {/* Background ambient elements (CSS-only for better performance) */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none hidden md:block">
        <div className="absolute top-1/4 right-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-1/4 left-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl animate-pulse" />
      </div>

      <main className="container mx-auto max-w-7xl space-y-6 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <Card className="border-white/10 bg-white/5 backdrop-blur-xl overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-r from-purple-500/10 via-transparent to-pink-500/10" />
            <CardHeader className="relative">
              <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div>
                  <div className="flex items-center gap-3 mb-2">
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ type: "spring", stiffness: 200 }}
                      className="h-12 w-12 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center shadow-lg shadow-purple-500/25"
                    >
                      <BarChart3 className="h-6 w-6 text-white" />
                    </motion.div>
                    <div>
                      <CardTitle className="text-3xl font-bold text-white">PA-Dasher Analytics</CardTitle>
                      <CardDescription className="mt-1 text-white/60">
                        Real-time monitoring and analytics dashboard for your POS systems
                      </CardDescription>
                    </div>
                  </div>
                </div>
                <div className="flex flex-col gap-3 md:flex-row md:items-center md:gap-4">
                  <DashboardToggles
                    showStatusBar={showStatusBar}
                    setShowStatusBar={(value) => setShowStatusBar(Boolean(value))}
                    showRealtime={showRealtime}
                    setShowRealtime={(value) => setShowRealtime(Boolean(value))}
                    showAlerts={showAlerts}
                    setShowAlerts={(value) => setShowAlerts(Boolean(value))}
                  />
                  <div className="flex gap-2 items-center">
                    <Button asChild variant="glow" className="whitespace-nowrap gap-2">
                      <Link to="/analytics">
                        <Sparkles className="h-4 w-4" />
                        Go to Analytics
                        <ArrowRight className="h-4 w-4" />
                      </Link>
                    </Button>
                    <div className="flex items-center gap-2 px-4 py-2 bg-white/5 rounded-lg border border-white/10">
                      <User className="h-4 w-4 text-purple-400" />
                      <span className="text-sm font-medium text-white">{user?.userName || 'User'}</span>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleLogout}
                      className="gap-2 border-red-500/30 text-red-400 hover:bg-red-500/10 hover:text-red-300 hover:border-red-500/50"
                    >
                      <LogOut className="h-4 w-4" />
                      Logout
                    </Button>
                  </div>
                </div>
              </div>
            </CardHeader>
          </Card>
        </motion.div>

        <AnimatePresence>
          {showStatusBar && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.3 }}
            >
              <DynamicStatusBar enableSounds={false} />
            </motion.div>
          )}
        </AnimatePresence>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="space-y-4"
        >
          <SectionToggle
            title="Real-Time Monitoring"
            visible={showRealtime || showAlerts}
            onToggle={() => {
              const nextVisible = !(showRealtime || showAlerts)
              setShowRealtime(nextVisible)
              setShowAlerts(nextVisible)
            }}
          />

          <AnimatePresence>
            {(showRealtime || showAlerts) && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="grid gap-6 lg:grid-cols-2"
              >
                {showRealtime && (
                  <div className="lg:col-span-2">
                    <RealtimeMetrics />
                  </div>
                )}
                {showAlerts && (
                  <div className="lg:col-span-2">
                    <CriticalAlertsPanel />
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="space-y-4"
        >
          <SectionToggle
            title="Global Statistics"
            visible={showGlobalStats}
            onToggle={() => setShowGlobalStats((value) => !value)}
          />
          <AnimatePresence>
            {showGlobalStats && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
              >
                <GlobalStats />
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="space-y-4"
        >
          <SectionToggle
            title="Error Trends & Analysis"
            visible={showErrorTrends}
            onToggle={() => setShowErrorTrends((value) => !value)}
          />
          <AnimatePresence>
            {showErrorTrends && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
              >
                <ErrorTrends />
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="space-y-4"
        >
          <SectionToggle
            title="Notification Performance"
            visible={showNotificationTrends}
            onToggle={() => setShowNotificationTrends((value) => !value)}
          />
          <AnimatePresence>
            {showNotificationTrends && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
              >
                <NotificationTrends />
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="space-y-4"
        >
          <SectionToggle
            title="Event Volume Trends"
            visible={showEventVolume}
            onToggle={() => setShowEventVolume((value) => !value)}
          />
          <AnimatePresence>
            {showEventVolume && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
              >
                <EventVolumeChart />
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="space-y-4"
        >
          <SectionToggle
            title="POS Systems Overview"
            visible={showPOSGrid}
            onToggle={() => setShowPOSGrid((value) => !value)}
          />
          <AnimatePresence>
            {showPOSGrid && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
              >
                <POSStatsGrid />
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
          className="space-y-4"
        >
          <SectionToggle
            title="Advanced Analytics & Reports"
            visible={showAnalytics}
            onToggle={() => setShowAnalytics((value) => !value)}
          />
          <AnimatePresence>
            {showAnalytics && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
              >
                <AnalyticsPanel />
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </main>
    </div>
  )
}

function SectionToggle({
  title,
  visible,
  onToggle,
}: {
  title: string
  visible: boolean
  onToggle: () => void
}) {
  return (
    <Card className="border-white/10 bg-white/5 backdrop-blur-xl overflow-hidden border-l-4 border-l-purple-500">
      <CardHeader className="py-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold text-white flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-purple-400" />
            {title}
          </CardTitle>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={onToggle} 
            className="gap-2 text-white/70 hover:text-white hover:bg-white/10"
          >
            {visible ? (
              <>
                <Eye className="h-4 w-4" />
                Hide
              </>
            ) : (
              <>
                <EyeOff className="h-4 w-4" />
                Show
              </>
            )}
          </Button>
        </div>
      </CardHeader>
    </Card>
  )
}
