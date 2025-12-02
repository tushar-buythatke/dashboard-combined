"use client";

import useSWR from "swr";
import { ArrowUpRight, ArrowDownRight, MinusIcon } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Area, AreaChart, Line, LineChart } from "recharts";
import { type ChartConfig, ChartContainer } from "@/components/ui/chart";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

type GlobalStat = {
  date: string;
  platform: number;
  total_alerts_set: number;
  total_push_success: number;
  total_push_errors: number;
  total_email_success: number;
  total_email_errors: number;
  success_rate: number;
  avg_delay_hours: number;
};

const chartConfig = {
  alerts: {
    label: "Alerts",
    color: "hsl(var(--chart-1))",
  },
  successRate: {
    label: "Success Rate",
    color: "#2563eb",
  },
} satisfies ChartConfig;

export default function GlobalStats() {
  const lookbackDays = 14;
  const endDate = new Date();
  const startDate = new Date(endDate);
  startDate.setDate(startDate.getDate() - (lookbackDays - 1));

  const startDateStr = startDate.toISOString().split("T")[0];
  const endDateStr = endDate.toISOString().split("T")[0];
  const swrKey = `/pa-dasher-api/stats/global?startDate=${startDateStr}&endDate=${endDateStr}`;

  const { data, isLoading } = useSWR<{ data: { global_stats: GlobalStat[] } }>(
    swrKey,
    fetcher,
    {
      refreshInterval: 300_000,
      revalidateOnFocus: false,
      dedupingInterval: 120_000,
    }
  );

  const stats = data?.data?.global_stats || [];

  type DailyRollup = {
    date: string;
    totalAlerts: number;
    totalSuccess: number;
    totalErrors: number;
    pushSuccess: number;
    emailSuccess: number;
    pushErrors: number;
    emailErrors: number;
    delaySum: number;
    delayCount: number;
  };

  const aggregatedByDate = stats.reduce<Map<string, DailyRollup>>((map, stat) => {
    const key = stat.date;
    const entry = map.get(key) ?? {
      date: key,
      totalAlerts: 0,
      totalSuccess: 0,
      totalErrors: 0,
      pushSuccess: 0,
      emailSuccess: 0,
      pushErrors: 0,
      emailErrors: 0,
      delaySum: 0,
      delayCount: 0,
    };

    entry.totalAlerts += stat.total_alerts_set || 0;
    const pushSuccess = stat.total_push_success || 0;
    const emailSuccess = stat.total_email_success || 0;
    const pushErrors = stat.total_push_errors || 0;
    const emailErrors = stat.total_email_errors || 0;

    entry.pushSuccess += pushSuccess;
    entry.emailSuccess += emailSuccess;
    entry.pushErrors += pushErrors;
    entry.emailErrors += emailErrors;

    entry.totalSuccess += pushSuccess + emailSuccess;
    entry.totalErrors += pushErrors + emailErrors;

    if (stat.avg_delay_hours != null) {
      entry.delaySum += parseFloat(String(stat.avg_delay_hours || 0));
      entry.delayCount += 1;
    }

    map.set(key, entry);
    return map;
  }, new Map());

  const dailyAggregates = Array.from(aggregatedByDate.values())
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .map((entry) => {
      const attempts = entry.totalSuccess + entry.totalErrors;
      const avgDelay = entry.delayCount > 0 ? entry.delaySum / entry.delayCount : 0;
      return {
        ...entry,
        attempts,
        avgDelay,
        successRate: attempts > 0 ? (entry.totalSuccess / attempts) * 100 : 0,
        pushSuccess: entry.pushSuccess,
        emailSuccess: entry.emailSuccess,
        pushErrors: entry.pushErrors,
        emailErrors: entry.emailErrors,
      };
    });

  const availableDays = dailyAggregates.length;
  const windowSize = availableDays >= 2 ? Math.min(7, Math.max(1, Math.floor(availableDays / 2))) : Math.min(1, availableDays);
  const currentWindow = dailyAggregates.slice(0, windowSize);
  const previousWindow = dailyAggregates.slice(windowSize, windowSize * 2);

  const rollupWindow = (window: typeof dailyAggregates) => {
    const totals = window.reduce(
      (acc, day) => {
        acc.totalAlerts += day.totalAlerts;
        acc.totalSuccess += day.totalSuccess;
        acc.totalErrors += day.totalErrors;
        acc.pushSuccess += day.pushSuccess;
        acc.emailSuccess += day.emailSuccess;
        acc.pushErrors += day.pushErrors;
        acc.emailErrors += day.emailErrors;
        acc.delaySum += day.delaySum;
        acc.delayCount += day.delayCount;
        return acc;
      },
      {
        totalAlerts: 0,
        totalSuccess: 0,
        totalErrors: 0,
        pushSuccess: 0,
        emailSuccess: 0,
        pushErrors: 0,
        emailErrors: 0,
        delaySum: 0,
        delayCount: 0,
      }
    );

    const attempts = totals.totalSuccess + totals.totalErrors;
    const avgDelay = totals.delayCount > 0 ? totals.delaySum / totals.delayCount : 0;

    return {
      totalAlerts: totals.totalAlerts,
      totalSuccess: totals.totalSuccess,
      totalErrors: totals.totalErrors,
      attempts,
      successRate: attempts > 0 ? (totals.totalSuccess / attempts) * 100 : 0,
      avgDelay,
      pushSuccess: totals.pushSuccess,
      emailSuccess: totals.emailSuccess,
      pushErrors: totals.pushErrors,
      emailErrors: totals.emailErrors,
    };
  };

  const currentTotals = rollupWindow(currentWindow);
  const previousTotals = rollupWindow(previousWindow);

  const formatDelta = (
    current: number,
    previous: number,
    { invert = false }: { invert?: boolean } = {}
  ) => {
    if (previous <= 0) return null;
    const rawDelta = ((current - previous) / previous) * 100;
    if (!Number.isFinite(rawDelta)) return null;
    const effectiveDelta = invert ? -rawDelta : rawDelta;
    const trend = effectiveDelta > 0 ? "up" : effectiveDelta < 0 ? "down" : "flat";
    return {
      raw: rawDelta,
      effective: effectiveDelta,
      trend,
      label: `${effectiveDelta >= 0 ? "+" : ""}${effectiveDelta.toFixed(1)}%`,
    };
  };

  const alertsDelta = formatDelta(currentTotals.totalAlerts, previousTotals.totalAlerts);
  const successRateDelta = formatDelta(currentTotals.successRate, previousTotals.successRate);
  const errorsDelta = formatDelta(currentTotals.totalErrors, previousTotals.totalErrors, { invert: true });
  const delayDelta = formatDelta(currentTotals.avgDelay, previousTotals.avgDelay, { invert: true });

  const totalSuccess = currentTotals.totalSuccess;
  const totalErrors = currentTotals.totalErrors;
  const totalAttempts = currentTotals.attempts;
  const avgDelay = currentTotals.avgDelay;
  const successRate = currentTotals.successRate;
  const pushErrorsTotal = currentTotals.pushErrors;
  const emailErrorsTotal = currentTotals.emailErrors;

  const chartData = currentWindow.map((day) => ({
    date: new Date(day.date).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
    alerts: day.totalAlerts,
    successRate: day.successRate,
  }));

  const comparisonWindow = Math.max(windowSize, 1);
  const comparisonLabel = previousWindow.length
    ? `vs previous ${comparisonWindow} day${comparisonWindow === 1 ? "" : "s"}`
    : "vs previous period";

  const renderDelta = (
    delta: ReturnType<typeof formatDelta>,
    fallback: string,
    positiveTone: "green" | "emerald" | "primary" = "green",
  ) => {
    if (!delta) {
      return (
        <span className="flex items-center gap-1 text-xs text-muted-foreground">
          <MinusIcon className="h-3 w-3" />
          <span>0.0%</span>
          <span>{fallback}</span>
        </span>
      );
    }

    const Icon =
      delta.trend === "down" ? ArrowDownRight : delta.trend === "up" ? ArrowUpRight : MinusIcon;
    const toneClass =
      delta.trend === "flat"
        ? "text-muted-foreground"
        : delta.trend === "down"
          ? positiveTone === "green" ? "text-red-500" : "text-amber-500"
          : positiveTone === "green" ? "text-green-500" : "text-blue-500";

    return (
      <span className="flex items-center gap-1 text-xs">
        <Icon className={`w-3 h-3 ${toneClass}`} />
        <span className={`${toneClass}`}>{delta.label}</span>
        <span className="text-muted-foreground">{comparisonLabel}</span>
      </span>
    );
  };

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {/* Total Alerts Card with Mini Chart */}
      <Card>
        <CardHeader className="pb-2">
          <CardDescription>Total Alerts</CardDescription>
          <CardTitle className="text-3xl font-bold">
            {isLoading ? "..." : currentTotals.totalAlerts.toLocaleString()}
          </CardTitle>
          {renderDelta(alertsDelta, comparisonLabel)}
        </CardHeader>
        <CardContent className="pb-2">
          <ChartContainer config={chartConfig} className="h-[60px] w-full">
            <AreaChart
              data={chartData}
              margin={{ top: 5, right: 0, left: 0, bottom: 0 }}
            >
              <Area
                dataKey="alerts"
                fill="var(--color-alerts)"
                fillOpacity={0.2}
                stroke="var(--color-alerts)"
                strokeWidth={2}
                type="monotone"
              />
            </AreaChart>
          </ChartContainer>
        </CardContent>
      </Card>

      {/* Success Rate Card with Mini Chart */}
      <Card>
        <CardHeader className="pb-2">
          <CardDescription>Success Rate</CardDescription>
          <CardTitle className="text-3xl font-bold text-green-600">
            {isLoading ? "..." : `${successRate.toFixed(1)}%`}
          </CardTitle>
          {renderDelta(successRateDelta, comparisonLabel)}
        </CardHeader>
        <CardContent className="pb-2">
          <ChartContainer config={chartConfig} className="h-[60px] w-full">
            <LineChart
              data={chartData}
              margin={{ top: 5, right: 0, left: 0, bottom: 0 }}
            >
              <Line
                type="monotone"
                dataKey="successRate"
                stroke="var(--color-successRate)"
                strokeWidth={2.5}
                strokeOpacity={0.85}
                connectNulls
                strokeLinecap="round"
                strokeLinejoin="round"
                dot={{ r: 2.5, strokeWidth: 0, fill: "var(--color-successRate)" }}
                activeDot={{ r: 4, strokeWidth: 0, fill: "var(--color-successRate)" }}
              />
            </LineChart>
          </ChartContainer>
        </CardContent>
      </Card>

      {/* Total Errors Card */}
      <Card>
        <CardHeader className="pb-2">
          <CardDescription>Total Errors</CardDescription>
          <CardTitle className="text-3xl font-bold text-red-600">
            {isLoading ? "..." : totalErrors.toLocaleString()}
          </CardTitle>
          {renderDelta(errorsDelta, comparisonLabel, "green")}
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between text-sm">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-orange-500" />
                <span className="text-muted-foreground">Push Errors</span>
              </div>
              <div className="font-mono font-bold">
                {pushErrorsTotal.toLocaleString()}
              </div>
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-purple-500" />
                <span className="text-muted-foreground">Email Errors</span>
              </div>
              <div className="font-mono font-bold">
                {emailErrorsTotal.toLocaleString()}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Average Delay Card */}
      <Card>
        <CardHeader className="pb-2">
          <CardDescription>Avg Delay</CardDescription>
          <CardTitle className="text-3xl font-bold text-orange-600">
            {isLoading ? "..." : avgDelay < 1 ? `${Math.round(avgDelay * 60)}m` : `${avgDelay.toFixed(1)}h`}
          </CardTitle>
          {renderDelta(delayDelta, comparisonLabel, "green")}
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Total Success</span>
              <span className="font-mono font-semibold text-green-600">
                {totalSuccess.toLocaleString()}
              </span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Attempts</span>
              <span className="font-mono font-semibold">
                {totalAttempts.toLocaleString()}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
