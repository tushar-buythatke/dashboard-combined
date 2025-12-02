"use client";

import { useMemo, useState } from "react";
import useSWR from "swr";
import { Line, LineChart, XAxis, YAxis, CartesianGrid } from "recharts";
import { Calendar as CalendarIcon, RefreshCw } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { type ChartConfig, ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { type DateRange } from "react-day-picker";
import { format } from "date-fns";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

type TrendErrors = {
  android?: number | null;
  chrome?: number | null;
  email?: number | null;
  total?: number | null;
};

type TrendPoint = {
  date: string;
  errors: TrendErrors;
  error_rate?: string | number | null;
};

type TrendData = Record<string, TrendPoint[]>;

type TrendResponse = {
  data?: {
    trends: TrendData;
  };
};

type AggregatedTrendPoint = {
  date: string;
  fullDate: string;
  android: number;
  chrome: number;
  email: number;
  total: number;
};

const chartConfig = {
  android: {
    label: "Android Errors",
    color: "var(--chart-error-android)",
  },
  chrome: {
    label: "Extension Errors",
    color: "var(--chart-error-chrome)",
  },
  email: {
    label: "Email Errors",
    color: "var(--chart-error-email)",
  },
} satisfies ChartConfig;

const SERIES_STYLES: Record<string, { colorVar: string; strokeWidth: number; dotRadius: number; strokeDasharray?: string }> = {
  android: { colorVar: "var(--chart-error-android)", strokeWidth: 3, dotRadius: 5 },
  chrome: { colorVar: "var(--chart-error-chrome)", strokeWidth: 2.5, dotRadius: 4 },
  email: { colorVar: "var(--chart-error-email)", strokeWidth: 3, dotRadius: 5, strokeDasharray: "6 3" },
};

export default function ErrorTrends() {
  const [days, setDays] = useState("7");
  const [selectedPOS, setSelectedPOS] = useState<string>("all");
  const initialRange = useMemo(() => {
    const to = new Date();
    const from = new Date();
    from.setDate(from.getDate() - 7);
    return { from, to } as DateRange;
  }, []);
  const [dateRange, setDateRange] = useState<DateRange>(initialRange);

  const handleRangeSelect = (range?: DateRange) => {
    if (!range) {
      setDateRange({ from: undefined, to: undefined });
      return;
    }
    const { from, to } = range;
    if (from && to && from > to) {
      setDateRange({ from: to, to: from });
    } else {
      setDateRange({ from, to });
    }
  };

  const startDate = dateRange?.from ? format(dateRange.from, "yyyy-MM-dd") : undefined;
  const endDate = dateRange?.to ? format(dateRange.to, "yyyy-MM-dd") : undefined;

  const query = new URLSearchParams({ days });
  if (selectedPOS !== "all") query.set("pos", selectedPOS);
  if (startDate && endDate) {
    query.set("startDate", startDate);
    query.set("endDate", endDate);
  }

  const swrKey = `/pa-dasher-api/errors/trends?${query.toString()}`;

  const { data, isLoading, mutate, isValidating } = useSWR<TrendResponse>(
    swrKey,
    fetcher,
    {
      refreshInterval: 300_000,
      revalidateOnFocus: false,
      dedupingInterval: 120_000,
    }
  );

  const trends = data?.data?.trends ?? {};

  // Aggregate data by date
  const chartData: AggregatedTrendPoint[] = Object.entries(trends)
    .flatMap(([, posPoints]) => posPoints)
    .reduce<AggregatedTrendPoint[]>((acc, point) => {
      const isoDate = point.date;
      const displayDate = format(new Date(point.date), "MMM d");
      const existing = acc.find((entry) => entry.fullDate === isoDate);
      const android = Number(point.errors.android ?? 0);
      const chrome = Number(point.errors.chrome ?? 0);
      const email = Number(point.errors.email ?? 0);
      const total = Number(point.errors.total ?? android + chrome + email);

      if (existing) {
        existing.android += android;
        existing.chrome += chrome;
        existing.email += email;
        existing.total += total;
      } else {
        acc.push({
          date: displayDate,
          fullDate: isoDate,
          android,
          chrome,
          email,
          total,
        });
      }
      return acc;
    }, [])
    .sort((a, b) => new Date(a.fullDate).getTime() - new Date(b.fullDate).getTime());

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Error Trends & Analysis</CardTitle>
            <CardDescription>
              Track error patterns across platforms and POS systems over time
            </CardDescription>
          </div>
          <Button
            variant="outline"
            className="gap-2"
            onClick={() => mutate()}
            disabled={isValidating || !startDate || !endDate}
          >
            <RefreshCw className="w-4 h-4" />
            {isValidating ? "Fetching..." : "Fetch Data"}
          </Button>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 pt-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="time-range" className="text-xs">
              <CalendarIcon className="w-3 h-3 inline mr-1" />
              Time Range
            </Label>
            <Select value={days} onValueChange={setDays}>
              <SelectTrigger id="time-range">
                <SelectValue placeholder="Select range" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7">Last 7 days</SelectItem>
                <SelectItem value="14">Last 14 days</SelectItem>
                <SelectItem value="30">Last 30 days</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div className="flex flex-col gap-2">
            <Label className="text-xs flex items-center gap-1">
              <CalendarIcon className="w-3 h-3" />
              Date Range
            </Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  id="trend-date-range"
                  variant="outline"
                  className={cn(
                    "justify-start text-left font-normal",
                    (!dateRange?.from || !dateRange?.to) && "text-muted-foreground"
                  )}
                >
                  {dateRange?.from && dateRange?.to
                    ? `${format(dateRange.from, "dd MMM yyyy")} - ${format(dateRange.to, "dd MMM yyyy")}`
                    : "Pick a range"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="p-0" align="start">
                <Calendar
                  mode="range"
                  selected={dateRange}
                  onSelect={handleRangeSelect}
                  numberOfMonths={1}
                  defaultMonth={dateRange?.from ?? dateRange?.to ?? new Date()}
                />
              </PopoverContent>
            </Popover>
          </div>
          
          <div className="flex flex-col gap-2">
            <Label htmlFor="pos-filter" className="text-xs">POS Filter</Label>
            <Select value={selectedPOS} onValueChange={setSelectedPOS}>
              <SelectTrigger id="pos-filter">
                <SelectValue placeholder="Select POS" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All POS</SelectItem>
                <SelectItem value="2">Flipkart (POS 2)</SelectItem>
                <SelectItem value="63">Amazon (POS 63)</SelectItem>
                <SelectItem value="111">Myntra (POS 111)</SelectItem>
                <SelectItem value="2191">Ajio (POS 2191)</SelectItem>
                <SelectItem value="7376">Meesho (POS 7376)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center py-16 text-muted-foreground">
            <div className="text-center space-y-2">
              <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="text-sm">Loading error trends...</p>
            </div>
          </div>
        ) : chartData.length === 0 ? (
          <div className="flex items-center justify-center py-16 text-muted-foreground">
            <p className="text-sm">No trend data available</p>
          </div>
        ) : (
          <ChartContainer config={chartConfig} className="h-[460px] w-full">
            <LineChart data={chartData} margin={{ left: 20, right: 20, top: 10, bottom: 10 }}>
              <CartesianGrid stroke="hsl(var(--border))" strokeDasharray="4 4" vertical={false} />
              <XAxis
                dataKey="fullDate"
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                tickFormatter={(value) => format(new Date(value), "MMM d")}
              />
              <YAxis
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                tickFormatter={(value) => {
                  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
                  if (value >= 1_000) return `${(value / 1_000).toFixed(1)}K`;
                  return value.toString();
                }}
              />
              <ChartTooltip
                cursor={{ stroke: 'hsl(var(--border))', strokeDasharray: '4 4' }}
                content={
                  <ChartTooltipContent
                    indicator="line"
                    labelFormatter={(value) => format(new Date(value as string), 'dd MMM yyyy')}
                  />
                }
              />
              {Object.entries(SERIES_STYLES).map(([key, { colorVar, strokeWidth, dotRadius, strokeDasharray }]) => (
                <Line
                  key={key}
                  type="monotone"
                  dataKey={key}
                  strokeWidth={strokeWidth}
                  stroke={colorVar}
                  strokeDasharray={strokeDasharray}
                  dot={{
                    r: dotRadius + 1,
                    stroke: colorVar,
                    strokeWidth: 1.5,
                    fill: 'var(--background)',
                  }}
                  activeDot={{
                    r: dotRadius + 3,
                    stroke: colorVar,
                    strokeWidth: 2,
                    fill: 'var(--background)',
                  }}
                />
              ))}
            </LineChart>
          </ChartContainer>
        )}
      </CardContent>
    </Card>
  );
}
