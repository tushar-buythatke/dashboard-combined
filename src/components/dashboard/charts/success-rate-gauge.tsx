"use client"

import { RadialBar, RadialBarChart, PolarAngleAxis, ResponsiveContainer } from "recharts"
import { useMemo } from "react"

export default function SuccessRateGauge({ value = 0.91 }: { value?: number }) {
  const gaugeData = useMemo(() => [{ name: "Success", value: Math.round(value * 100) }], [value])
  return (
    <div className="h-[320px]">
      <ResponsiveContainer width="100%" height="100%">
        <RadialBarChart innerRadius="70%" outerRadius="100%" data={gaugeData} startAngle={180} endAngle={-180}>
          <PolarAngleAxis type="number" domain={[0, 100]} tick={false} />
          <RadialBar dataKey="value" cornerRadius={8} fill="hsl(var(--chart-1))" />
        </RadialBarChart>
      </ResponsiveContainer>
      <div className="text-center -mt-12 text-xl font-semibold">{Math.round(value * 100)}%</div>
      <p className="text-center text-sm text-muted-foreground mt-1">Success Rate</p>
    </div>
  )
}
