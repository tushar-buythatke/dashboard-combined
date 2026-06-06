import { useState } from 'react';
import { useAccentTheme } from '@/contexts/AccentThemeContext';
import { useChartColors } from '@/lib/chartTheme';
import { cn } from '@/lib/utils';
import type { PanelConfig, AnalyticsDataResponse } from '@/types/analytics';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
    ResponsiveContainer,
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    PieChart,
    Pie,
    Cell,
    Sector,
} from 'recharts';
import { GlassTooltip } from '@/components/ui/GlassTooltip';

interface SeparatePanelProps {
    panel: PanelConfig;
    data: AnalyticsDataResponse | null;
}

// ─── Premium active-shape renderer ───────────────────────────────────────────
const renderActiveShape = (props: any, surfaceColor: string) => {
    const {
        cx, cy, innerRadius, outerRadius, startAngle, endAngle,
        fill,
    } = props;
    return (
        <g>
            {/* Slightly enlarged active slice with drop-shadow */}
            <Sector
                cx={cx}
                cy={cy}
                innerRadius={innerRadius}
                outerRadius={outerRadius + 8}
                startAngle={startAngle}
                endAngle={endAngle}
                fill={fill}
                stroke={surfaceColor}
                strokeWidth={2}
                style={{ filter: `drop-shadow(0 4px 12px ${fill}88)` }}
            />
        </g>
    );
};

// ─── Premium mini donut ───────────────────────────────────────────────────────
interface MiniDonutProps {
    pieData: any[];
    palette: string[];
    surfaceColor: string;
    title: string;
    chartId: string;
}

function MiniDonut({ pieData, palette, surfaceColor, title, chartId }: MiniDonutProps) {
    const [activeIndex, setActiveIndex] = useState<number | null>(null);

    const total = pieData.reduce((s: number, d: any) => s + (d.value ?? 0), 0);
    const activeItem = activeIndex !== null ? pieData[activeIndex] : null;
    const activePct = activeItem && total > 0
        ? ((activeItem.value / total) * 100).toFixed(1)
        : null;

    return (
        <div className="flex flex-col items-center justify-start h-full bg-slate-50/20 dark:bg-slate-950/10 rounded-2xl p-3 border border-slate-100/50 dark:border-indigo-500/5">
            <h4 className="text-[10px] font-extrabold mb-2 text-slate-500 dark:text-slate-400 uppercase tracking-widest">
                {title} Distribution
            </h4>

            {/* Chart + center overlay */}
            <div className="relative w-full flex-1 min-h-[130px]">
                <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                        <defs>
                            {palette.map((color, i) => (
                                <radialGradient key={`rg-${chartId}-${i}`} id={`rg-${chartId}-${i}`} cx="50%" cy="50%" r="50%">
                                    <stop offset="0%" stopColor={color} stopOpacity={0.9} />
                                    <stop offset="100%" stopColor={color} stopOpacity={1} />
                                </radialGradient>
                            ))}
                        </defs>
                        <Pie
                            data={pieData}
                            cx="50%"
                            cy="50%"
                            innerRadius="62%"
                            outerRadius="90%"
                            paddingAngle={2}
                            dataKey="value"
                            activeShape={(props: any) => renderActiveShape(props, surfaceColor)}
                            onMouseEnter={(_: any, index: number) => setActiveIndex(index)}
                            onMouseLeave={() => setActiveIndex(null)}
                            isAnimationActive={true}
                            animationDuration={600}
                            animationEasing="ease-out"
                        >
                            {pieData.map((_entry: any, index: number) => (
                                <Cell
                                    key={`cell-${chartId}-${index}`}
                                    fill={palette[index % palette.length]}
                                    stroke={surfaceColor}
                                    strokeWidth={2}
                                    opacity={activeIndex !== null && activeIndex !== index ? 0.55 : 1}
                                    style={{ transition: 'opacity 0.2s ease' }}
                                />
                            ))}
                        </Pie>
                        <Tooltip
                            content={<GlassTooltip />}
                            wrapperStyle={{ pointerEvents: 'none' }}
                        />
                    </PieChart>
                </ResponsiveContainer>

                {/* Center text overlay */}
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none select-none">
                    {activeItem ? (
                        <>
                            <span className="text-[8px] font-semibold uppercase tracking-[0.15em] text-slate-400 dark:text-slate-500 leading-none mb-0.5 max-w-[60px] truncate text-center">
                                {activeItem.name}
                            </span>
                            <span className="text-[16px] font-bold tabular-nums leading-none text-slate-800 dark:text-slate-100">
                                {activeItem.value?.toLocaleString?.() ?? activeItem.value}
                            </span>
                            <span className="text-[9px] font-medium text-slate-400 dark:text-slate-500 mt-0.5">
                                {activePct}%
                            </span>
                        </>
                    ) : (
                        <>
                            <span className="text-[8px] font-semibold uppercase tracking-[0.15em] text-slate-400 dark:text-slate-500 leading-none mb-0.5">
                                TOTAL
                            </span>
                            <span className="text-[16px] font-bold tabular-nums leading-none text-slate-800 dark:text-slate-100">
                                {total.toLocaleString()}
                            </span>
                        </>
                    )}
                </div>
            </div>

            {/* Legend mini-bars */}
            <div className="w-full mt-2 space-y-1 max-h-[90px] overflow-y-auto pr-0.5">
                {pieData.map((item: any, index: number) => {
                    const pct = total > 0 ? (item.value / total) * 100 : 0;
                    const color = palette[index % palette.length];
                    const isHovered = activeIndex === index;
                    return (
                        <div
                            key={`leg-${chartId}-${index}`}
                            className="flex items-center gap-1.5 group/row cursor-default transition-all duration-150"
                            style={{ opacity: activeIndex !== null && !isHovered ? 0.5 : 1 }}
                            onMouseEnter={() => setActiveIndex(index)}
                            onMouseLeave={() => setActiveIndex(null)}
                        >
                            <span
                                className="h-2 w-2 rounded-full flex-shrink-0"
                                style={{ background: color }}
                            />
                            <span className="text-[9px] font-medium text-slate-600 dark:text-slate-300 truncate flex-1 min-w-0">
                                {item.name}
                            </span>
                            <span className="text-[9px] font-bold tabular-nums text-slate-700 dark:text-slate-200 flex-shrink-0">
                                {item.value?.toLocaleString?.() ?? item.value}
                            </span>
                            <span className="text-[8px] text-slate-400 dark:text-slate-500 flex-shrink-0 w-7 text-right">
                                {pct.toFixed(0)}%
                            </span>
                            {/* Mini bar */}
                            <div className="w-[56px] flex-shrink-0 h-1 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                                <div
                                    className="h-full rounded-full transition-all duration-300"
                                    style={{
                                        width: `${Math.min(pct, 100)}%`,
                                        background: color,
                                    }}
                                />
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

// ─── Main component ───────────────────────────────────────────────────────────
export function SeparatePanel({ panel, data }: SeparatePanelProps) {
    const { t: themeClasses } = useAccentTheme();
    const colors = useChartColors();

    if (!data) return <div className="h-64 flex items-center justify-center">Loading data...</div>;

    const { graphData, pieChartData } = data;
    const event = panel.events[0];
    const gradId = `line-grad-sep-${event?.eventId ?? 'e'}`;

    return (
        <Card className={cn("h-full flex flex-col border-slate-200/60 dark:border-indigo-500/20 overflow-hidden relative group backdrop-blur-xl shadow-[0_8px_30px_rgba(0,0,0,0.12)] dark:shadow-[0_15px_50px_rgba(0,0,0,0.5)]", themeClasses.cardBg)}>
            {/* Thematic Accent Bar */}
            <div className={cn("absolute top-0 left-0 right-0 h-1.5 transition-all duration-500 z-30", themeClasses.headerGradient)} />

            <CardHeader className="pb-2 relative z-10">
                <CardTitle className="text-lg flex items-center gap-3">
                    <div
                        className="w-4 h-4 rounded-full shadow-[0_0_10px_rgba(0,0,0,0.1)] ring-2 ring-white/20"
                        style={{ backgroundColor: event?.color ?? colors.accentPrimary }}
                    />
                    <span className="font-bold tracking-tight text-slate-800 dark:text-slate-100">{event?.eventName}</span>
                </CardTitle>
            </CardHeader>

            <CardContent className="flex-1 flex flex-col gap-4 relative z-10">
                {/* ── Line Graph (premium treatment) ── */}
                {panel.visualizations.lineGraph.enabled && (
                    <div className="h-48 sm:h-56 md:h-64 w-full bg-slate-50/30 dark:bg-slate-950/20 rounded-2xl p-2 border border-slate-100 dark:border-indigo-500/10">
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={graphData}>
                                <defs>
                                    <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="0%" stopColor={event?.color ?? colors.accentPrimary} stopOpacity={0.30} />
                                        <stop offset="100%" stopColor={event?.color ?? colors.accentPrimary} stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid
                                    vertical={false}
                                    strokeDasharray="4 4"
                                    stroke={colors.grid}
                                />
                                <XAxis
                                    dataKey="timestamp"
                                    tickFormatter={(val) => new Date(val).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    fontSize={11}
                                    axisLine={false}
                                    tickLine={false}
                                    tick={{ fill: colors.axis, fontSize: 11 }}
                                />
                                <YAxis
                                    fontSize={11}
                                    label={{ value: panel.visualizations.lineGraph.yAxisLabel, angle: -90, position: 'insideLeft', fontSize: 10, offset: 10 }}
                                    axisLine={false}
                                    tickLine={false}
                                    tick={{ fill: colors.axis, fontSize: 11 }}
                                />
                                <Tooltip
                                    content={<GlassTooltip labelFormatter={(val) => new Date(Number(val)).toLocaleString()} />}
                                    cursor={{ stroke: colors.grid, strokeWidth: 1, strokeDasharray: '4 4' }}
                                />
                                <Line
                                    type="monotone"
                                    dataKey={event?.eventId}
                                    stroke={event?.color ?? colors.accentPrimary}
                                    strokeWidth={2.5}
                                    dot={false}
                                    activeDot={{ r: 6, strokeWidth: 2, stroke: '#fff', fill: event?.color ?? colors.accentPrimary }}
                                />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                )}

                {/* ── Pie Charts ── */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 flex-1 min-h-[200px]">
                    {panel.visualizations.pieCharts.map((pieConfig, idx) => {
                        if (!pieConfig.enabled) return null;

                        const pieData: any[] = pieChartData[pieConfig.type] || [];
                        const title = pieConfig.type.charAt(0).toUpperCase() + pieConfig.type.slice(1);

                        return (
                            <MiniDonut
                                key={idx}
                                pieData={pieData}
                                palette={colors.palette}
                                surfaceColor={colors.surface}
                                title={title}
                                chartId={`sep-${idx}`}
                            />
                        );
                    })}
                </div>
            </CardContent>
        </Card>
    );
}
