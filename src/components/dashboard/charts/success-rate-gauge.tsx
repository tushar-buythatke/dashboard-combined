"use client"

import { RadialBar, RadialBarChart, PolarAngleAxis, ResponsiveContainer } from "recharts"
import { useMemo } from "react"
import { useChartColors } from "@/lib/chartTheme"

export default function SuccessRateGauge({ value = 0.91 }: { value?: number }) {
  const colors = useChartColors()
  const pct = Math.round(value * 100)

  // Two arcs: filled (success) + remainder track
  const gaugeData = useMemo(() => [
    { name: "Success", value: pct },
  ], [pct])

  // Pick vivid accent from palette[0] (purple by default, theme-reactive)
  const fillColor = colors.accentPrimary

  return (
    <div className="relative h-[320px] flex flex-col items-center justify-center">
      {/* Faint track ring */}
      <div
        className="absolute inset-0 pointer-events-none"
        aria-hidden="true"
      />

      <ResponsiveContainer width="100%" height="100%">
        <RadialBarChart
          innerRadius="62%"
          outerRadius="90%"
          data={gaugeData}
          startAngle={225}
          endAngle={-45}
        >
          <PolarAngleAxis type="number" domain={[0, 100]} tick={false} />
          {/* Track — faint grey ring */}
          <RadialBar
            dataKey="value"
            cornerRadius={10}
            background={{ fill: colors.grid }}
            fill={fillColor}
            style={{
              filter: `drop-shadow(0 0 8px ${fillColor}66)`,
            }}
          />
        </RadialBarChart>
      </ResponsiveContainer>

      {/* Center overlay */}
      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none select-none">
        <span
          className="text-[10px] font-semibold uppercase tracking-[0.18em] mb-1"
          style={{ color: colors.axis }}
        >
          SUCCESS
        </span>
        <span
          className="text-[36px] font-bold tabular-nums leading-none"
          style={{ color: "var(--foreground, currentColor)" }}
        >
          {pct}%
        </span>
        <span
          className="text-[11px] mt-1 font-medium"
          style={{ color: colors.axis }}
        >
          Rate
        </span>
      </div>
    </div>
  )
}
