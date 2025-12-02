"use client"

import { Bar, BarChart, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Legend } from "recharts"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"

const demoData = [
  { pos: "POS A", success: 96, error: 3 },
  { pos: "POS B", success: 89, error: 9 },
  { pos: "POS C", success: 82, error: 15 },
  { pos: "POS D", success: 93, error: 5 },
]

export default function ComparisonChart() {
  return (
    <ChartContainer
      config={{
        success: { label: "Success %", color: "hsl(var(--chart-1))" },
        error: { label: "Error %", color: "hsl(var(--chart-2))" },
      }}
      className="h-[320px]"
    >
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={demoData} margin={{ top: 8, right: 8, left: 8, bottom: 8 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="pos" />
          <YAxis />
          <Legend />
          <ChartTooltip content={<ChartTooltipContent />} />
          <Bar dataKey="success" fill="var(--color-success)" radius={[4, 4, 0, 0]} />
          <Bar dataKey="error" fill="var(--color-error)" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </ChartContainer>
  )
}
