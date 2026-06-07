"use client";

import useSWR from "swr";
import { ArrowUpRight, ArrowDownRight, MinusIcon, Bell, CheckCircle, XCircle, Clock } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Area, AreaChart, Line, LineChart, ResponsiveContainer } from "recharts";
import { type ChartConfig, ChartContainer } from "@/components/ui/chart";
import { useCountUp } from "@/hooks/useCountUp";
import { useInView } from "@/hooks/useInView";
import { useChartColors } from "@/lib/chartTheme";

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

// ─── Individual premium stat card ────────────────────────────────────────────
interface PremiumStatCardProps {
  title: string;
  /** Raw numeric target for count-up */
  value: number;
  /** Formatted display string (used when count-up doesn't apply, e.g. "2.3h") */
  formattedValue?: string;
  /** Use count-up animation on the big number */
  useCountUpAnim?: boolean;
  /** Decimal places for count-up */
  decimals?: number;
  delta: ReturnType<typeof formatDeltaUtil> | null;
  comparisonLabel: string;
  positiveTone?: "green" | "emerald" | "primary";
  icon: React.ReactNode;
  iconGradient: string;
  numberColor: string;
  sparkline?: React.ReactNode;
  children?: React.ReactNode;
  isLoading?: boolean;
}

// Utility – identical to original formatDelta, extracted so it's usable as a type.
function formatDeltaUtil(
  current: number,
  previous: number,
  { invert = false }: { invert?: boolean } = {}
) {
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
}

function TrendPill({
  delta,
  comparisonLabel,
  positiveTone = "green",
}: {
  delta: ReturnType<typeof formatDeltaUtil> | null;
  comparisonLabel: string;
  positiveTone?: "green" | "emerald" | "primary";
}) {
  if (!delta) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] bg-muted/60 text-muted-foreground">
        <MinusIcon className="h-3 w-3" />
        <span>0.0%</span>
        <span className="hidden sm:inline opacity-70">{comparisonLabel}</span>
      </span>
    );
  }
  const Icon =
    delta.trend === "down" ? ArrowDownRight : delta.trend === "up" ? ArrowUpRight : MinusIcon;
  const pillClass =
    delta.trend === "flat"
      ? "bg-muted/60 text-muted-foreground"
      : delta.trend === "up"
        ? positiveTone === "green"
          ? "bg-emerald-500/12 text-emerald-600 dark:text-emerald-400"
          : "bg-blue-500/12 text-blue-600 dark:text-blue-400"
        : positiveTone === "green"
          ? "bg-red-500/12 text-red-600 dark:text-red-400"
          : "bg-amber-500/12 text-amber-600 dark:text-amber-400";
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium ${pillClass}`}>
      <Icon className="h-3 w-3" />
      <span>{delta.label}</span>
      <span className="hidden sm:inline opacity-70">{comparisonLabel}</span>
    </span>
  );
}

function PremiumStatCard({
  title,
  value,
  formattedValue,
  useCountUpAnim = true,
  decimals = 0,
  delta,
  comparisonLabel,
  positiveTone = "green",
  icon,
  iconGradient,
  numberColor,
  sparkline,
  children,
  isLoading = false,
}: PremiumStatCardProps) {
  const { ref, inView } = useInView<HTMLDivElement>();
  const { formatted } = useCountUp(value, { start: inView && !isLoading, decimals });

  return (
    <div
      ref={ref}
      className="group relative rounded-2xl overflow-hidden transition-all duration-[280ms]"
      style={{
        background: "linear-gradient(145deg, var(--dash-card-bg) 0%, var(--accent-surface) 100%)",
        border: "0.5px solid hsl(var(--accent-primary) / 0.12)",
        boxShadow: "var(--dash-card-shadow)",
        transition: "transform 280ms var(--ease-spring), box-shadow 280ms var(--ease-spring), border-color 280ms ease",
      }}
      onMouseEnter={(e) => {
        const el = e.currentTarget;
        el.style.transform = "translateY(-3px)";
        el.style.boxShadow = "var(--dash-card-shadow-hover)";
        el.style.borderColor = "hsl(var(--accent-primary) / 0.32)";
      }}
      onMouseLeave={(e) => {
        const el = e.currentTarget;
        el.style.transform = "";
        el.style.boxShadow = "var(--dash-card-shadow)";
        el.style.borderColor = "hsl(var(--accent-primary) / 0.12)";
      }}
    >
      {/* Card body */}
      <div className="p-4 pb-3">
        {/* Top row: icon left, sparkline right */}
        <div className="flex items-start justify-between mb-3">
          {/* Icon circle — 44px, accent gradient */}
          <div
            className="flex-shrink-0 flex items-center justify-center rounded-full"
            style={{
              width: 44,
              height: 44,
              background: iconGradient,
              boxShadow: "0 4px 14px hsl(var(--accent-primary) / 0.3)",
            }}
          >
            {icon}
          </div>
          {/* Sparkline slot */}
          {sparkline && (
            <div className="flex-shrink-0" style={{ filter: "drop-shadow(0 0 6px hsl(var(--accent-primary) / 0.3))" }}>
              {sparkline}
            </div>
          )}
        </div>

        {/* Big number */}
        <div className="flex items-end justify-between gap-2">
          <div className="min-w-0">
            {isLoading ? (
              <div className="h-8 w-24 rounded bg-muted/40 animate-pulse" />
            ) : (
              <div
                className="text-[26px] font-bold leading-none tabular-nums"
                style={{ color: numberColor }}
              >
                {useCountUpAnim ? formatted : (formattedValue ?? value.toLocaleString())}
              </div>
            )}
            <div className="text-[11px] text-muted-foreground mt-1 font-medium uppercase tracking-wide">
              {title}
            </div>
          </div>
          {/* Trend pill — bottom right */}
          <div className="flex-shrink-0 pb-0.5">
            <TrendPill delta={delta} comparisonLabel={comparisonLabel} positiveTone={positiveTone} />
          </div>
        </div>
      </div>

      {/* Optional extra content (breakdown rows) */}
      {children && (
        <div className="px-4 pb-4 border-t border-border/30 pt-3">
          {children}
        </div>
      )}
    </div>
  );
}

// ─── Sparkline components ─────────────────────────────────────────────────────
function AlertsSparkline({ data, color }: { data: { alerts: number }[]; color: string }) {
  const uniqueId = "gs-alerts-grad";
  return (
    <div style={{ width: 72, height: 36 }}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 2, right: 0, left: 0, bottom: 2 }}>
          <defs>
            <linearGradient id={uniqueId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={0.3} />
              <stop offset="100%" stopColor={color} stopOpacity={0} />
            </linearGradient>
          </defs>
          <Area
            dataKey="alerts"
            type="monotone"
            stroke={color}
            strokeWidth={1.5}
            fill={`url(#${uniqueId})`}
            dot={false}
            isAnimationActive={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

function SuccessRateSparkline({ data, color }: { data: { successRate: number }[]; color: string }) {
  const uniqueId = "gs-sr-grad";
  return (
    <div style={{ width: 72, height: 36 }}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 2, right: 0, left: 0, bottom: 2 }}>
          <defs>
            <linearGradient id={uniqueId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={0.3} />
              <stop offset="100%" stopColor={color} stopOpacity={0} />
            </linearGradient>
          </defs>
          <Area
            dataKey="successRate"
            type="monotone"
            stroke={color}
            strokeWidth={1.5}
            fill={`url(#${uniqueId})`}
            dot={false}
            isAnimationActive={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────
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

  const chartColors = useChartColors();
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

  const alertsDelta = formatDeltaUtil(currentTotals.totalAlerts, previousTotals.totalAlerts);
  const successRateDelta = formatDeltaUtil(currentTotals.successRate, previousTotals.successRate);
  const errorsDelta = formatDeltaUtil(currentTotals.totalErrors, previousTotals.totalErrors, { invert: true });
  const delayDelta = formatDeltaUtil(currentTotals.avgDelay, previousTotals.avgDelay, { invert: true });

  const totalSuccess = currentTotals.totalSuccess;
  const totalErrors = currentTotals.totalErrors;
  const totalAttempts = currentTotals.attempts;
  const avgDelay = currentTotals.avgDelay;
  const successRate = currentTotals.successRate;
  const pushErrorsTotal = currentTotals.pushErrors;
  const emailErrorsTotal = currentTotals.emailErrors;

  // Chart data for sparklines — oldest → newest so the trend reads left→right
  const chartData = [...currentWindow]
    .reverse()
    .map((day) => ({
      date: new Date(day.date).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      alerts: day.totalAlerts,
      successRate: day.successRate,
    }));

  const comparisonWindow = Math.max(windowSize, 1);
  const comparisonLabel = previousWindow.length
    ? `vs prev ${comparisonWindow}d`
    : "vs prev period";

  // Derived accent colors from chartTheme (theme-aware, no hardcoded hex)
  const alertsColor = chartColors.accentPrimary;
  const successColor = chartColors.palette[1]; // emerald
  const errorsColor = chartColors.palette[3];  // red
  const delayColor = chartColors.palette[2];   // amber

  // Icon gradients using CSS vars so they follow the accent theme
  const accentGradient = "var(--accent-gradient, linear-gradient(135deg, hsl(var(--accent-primary)) 0%, hsl(var(--accent-secondary)) 100%))";

  const avgDelayFormatted = avgDelay < 1
    ? `${Math.round(avgDelay * 60)}m`
    : `${avgDelay.toFixed(1)}h`;

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {/* ── Card 1: Total Alerts ─────────────────────────────────────────── */}
      <PremiumStatCard
        title="Total Alerts"
        value={currentTotals.totalAlerts}
        useCountUpAnim={true}
        delta={alertsDelta}
        comparisonLabel={comparisonLabel}
        positiveTone="green"
        icon={<Bell className="h-5 w-5 text-white" />}
        iconGradient={accentGradient}
        numberColor={alertsColor}
        sparkline={chartData.length > 1 ? <AlertsSparkline data={chartData} color={alertsColor} /> : undefined}
        isLoading={isLoading}
      />

      {/* ── Card 2: Success Rate ─────────────────────────────────────────── */}
      <PremiumStatCard
        title="Success Rate"
        value={successRate}
        formattedValue={`${successRate.toFixed(1)}%`}
        useCountUpAnim={false}
        delta={successRateDelta}
        comparisonLabel={comparisonLabel}
        positiveTone="green"
        icon={<CheckCircle className="h-5 w-5 text-white" />}
        iconGradient={`linear-gradient(135deg, ${successColor} 0%, #0d9488 100%)`}
        numberColor={successColor}
        sparkline={chartData.length > 1 ? <SuccessRateSparkline data={chartData} color={successColor} /> : undefined}
        isLoading={isLoading}
      />

      {/* ── Card 3: Total Errors ─────────────────────────────────────────── */}
      <PremiumStatCard
        title="Total Errors"
        value={totalErrors}
        useCountUpAnim={true}
        delta={errorsDelta}
        comparisonLabel={comparisonLabel}
        positiveTone="green"
        icon={<XCircle className="h-5 w-5 text-white" />}
        iconGradient={`linear-gradient(135deg, ${errorsColor} 0%, #dc2626 100%)`}
        numberColor={errorsColor}
        isLoading={isLoading}
      >
        {/* Existing Push/Email breakdown — preserved */}
        <div className="flex items-center justify-between text-sm">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-orange-500" />
              <span className="text-muted-foreground text-[11px]">Push Errors</span>
            </div>
            <div className="font-mono font-bold text-sm">
              {pushErrorsTotal.toLocaleString()}
            </div>
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-purple-500" />
              <span className="text-muted-foreground text-[11px]">Email Errors</span>
            </div>
            <div className="font-mono font-bold text-sm">
              {emailErrorsTotal.toLocaleString()}
            </div>
          </div>
        </div>
      </PremiumStatCard>

      {/* ── Card 4: Avg Delay ────────────────────────────────────────────── */}
      <PremiumStatCard
        title="Avg Delay"
        value={avgDelay}
        formattedValue={avgDelayFormatted}
        useCountUpAnim={false}
        delta={delayDelta}
        comparisonLabel={comparisonLabel}
        positiveTone="green"
        icon={<Clock className="h-5 w-5 text-white" />}
        iconGradient={`linear-gradient(135deg, ${delayColor} 0%, #d97706 100%)`}
        numberColor={delayColor}
        isLoading={isLoading}
      >
        {/* Existing Success/Attempts breakdown — preserved */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground text-[11px]">Total Success</span>
            <span className="font-mono font-semibold text-emerald-600">
              {totalSuccess.toLocaleString()}
            </span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground text-[11px]">Attempts</span>
            <span className="font-mono font-semibold">
              {totalAttempts.toLocaleString()}
            </span>
          </div>
        </div>
      </PremiumStatCard>
    </div>
  );
}
