"use client"

import { Line, LineChart, XAxis, YAxis, CartesianGrid, ResponsiveContainer } from "recharts"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"

const demoSeries = Array.from({ length: 24 }).map((_, i) => ({
  hour: `${i}:00`,
  posA: Math.max(0, Math.sin(i / 3) * 10 + 8),
  posB: Math.max(0, Math.cos(i / 4) * 12 + 10),
  posC: Math.max(0, Math.sin(i / 5 + 1) * 8 + 6),
}))

export default function ErrorRateChart() {
  return (
    <ChartContainer
      config={{
        posA: { label: "POS A", color: "hsl(var(--chart-1))" },
        posB: { label: "POS B", color: "hsl(var(--chart-2))" },
        posC: { label: "POS C", color: "hsl(var(--chart-3))" },
      }}
      className="h-[320px]"
    >
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={demoSeries} margin={{ left: 8, right: 8, top: 8, bottom: 8 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="hour" />
          <YAxis unit="%" />
          <ChartTooltip content={<ChartTooltipContent />} />
          <Line type="monotone" dataKey="posA" stroke="var(--color-posA)" dot={false} />
          <Line type="monotone" dataKey="posB" stroke="var(--color-posB)" dot={false} />
          <Line type="monotone" dataKey="posC" stroke="var(--color-posC)" dot={false} />
        </LineChart>
      </ResponsiveContainer>
    </ChartContainer>
  )
}
