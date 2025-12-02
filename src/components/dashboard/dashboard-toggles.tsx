"use client"

import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { ThemeToggle } from "@/components/theme/theme-toggle"

type Props = {
  showStatusBar: boolean
  setShowStatusBar: (v: boolean) => void
  showRealtime: boolean
  setShowRealtime: (v: boolean) => void
  showAlerts: boolean
  setShowAlerts: (v: boolean) => void
}

export function DashboardToggles({
  showStatusBar,
  setShowStatusBar,
  showRealtime,
  setShowRealtime,
  showAlerts,
  setShowAlerts,
}: Props) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 items-center">
      <div className="flex items-center gap-2">
        <Switch id="statusbar" checked={showStatusBar} onCheckedChange={setShowStatusBar} />
        <Label htmlFor="statusbar">Status Bar</Label>
      </div>
      <div className="flex items-center gap-2">
        <Switch id="realtime" checked={showRealtime} onCheckedChange={setShowRealtime} />
        <Label htmlFor="realtime">Real-time Metrics</Label>
      </div>
      <div className="flex items-center gap-2">
        <Switch id="alerts" checked={showAlerts} onCheckedChange={setShowAlerts} />
        <Label htmlFor="alerts">Alerts</Label>
      </div>
      <div className="col-span-2 md:col-span-1 md:justify-self-end md:justify-self-start">
        <ThemeToggle />
      </div>
    </div>
  )
}
