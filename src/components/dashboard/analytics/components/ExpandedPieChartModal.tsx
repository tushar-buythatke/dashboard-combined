import React from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Activity, Target, Zap, X } from 'lucide-react';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from 'recharts';
import { cn } from '@/lib/utils';
import { formatIsAvgValue, getIsAvgLabel, getIsAvgTotalLabel } from '@/lib/formatters';

// Pie chart colors - softer, lighter tones
export const PIE_COLORS = [
    '#818cf8', // indigo-400 - deeper, more vibrant
    '#34d399', // emerald-400 - richer green
    '#fbbf24', // amber-400 - more golden
    '#f87171', // red-400 - stronger, more confident
    '#a78bfa', // violet-400 - more royal purple
    '#22d3ee', // cyan-400 - more vivid blue
    '#f472b6', // pink-400 - more saturated
    '#2dd4bf', // teal-400 - richer aqua
];

// Professional Pie Tooltip
export const PieTooltip = ({ active, payload, totalValue, isAvgEventType = 0 }: any) => {
    if (active && payload && payload.length) {
        const data = payload[0].payload;
        const percentage = ((data.value / totalValue) * 100).toFixed(1);
        return (
            <div className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-sm rounded-lg shadow-lg border border-slate-200/60 dark:border-slate-700/60 px-4 py-3 min-w-[140px]">
                <div className="flex items-center gap-2.5 mb-1">
                    <div
                        className="w-2.5 h-2.5 rounded-sm flex-shrink-0"
                        style={{ backgroundColor: payload[0]?.fill || '#6366f1' }}
                    />
                    <span className="font-medium text-sm text-slate-900 dark:text-slate-100 truncate">
                        {data.name}
                    </span>
                </div>
                <div className="space-y-0.5">
                    <div className="flex justify-between items-center">
                        <span className="text-xs text-slate-600 dark:text-slate-400">Value</span>
                        <span className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                            {formatIsAvgValue(data.value, isAvgEventType)}
                        </span>
                    </div>
                    <div className="flex justify-between items-center">
                        <span className="text-xs text-slate-600 dark:text-slate-400">Share</span>
                        <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                            {percentage}%
                        </span>
                    </div>
                </div>
            </div>
        );
    }
    return null;
};

export interface ExpandedPieData {
    type: 'platform' | 'pos' | 'source' | 'status' | 'cacheStatus';
    title: string;
    data: any[];
}

interface ExpandedPieChartModalProps {
    open: boolean;
    onClose: () => void;
    pieData: ExpandedPieData | null;
    isAvgEventType?: number; // 0=count, 1=time(ms), 2=rupees
}

export function ExpandedPieChartModal({ open, onClose, pieData, isAvgEventType = 0 }: ExpandedPieChartModalProps) {
    if (!pieData || !pieData.data?.length) return null;

    const metricType = pieData.data.find((d: any) => d?.metricType)?.metricType || 'count';
    const isCount = metricType === 'count' && isAvgEventType === 0;

    // Get label based on isAvgEventType or metricType
    const getMetricLabel = () => {
        if (isAvgEventType === 2) return 'Amount (₹)';
        if (isAvgEventType === 1) return 'Avg Delay (ms)';
        if (isCount) return 'Count';
        if (metricType === 'avgDelay') return isAvgEventType === 2 ? 'Avg Amount (₹)' : 'Avg Delay (ms)';
        if (metricType === 'medianDelay') return 'Median Delay (ms)';
        if (metricType === 'modeDelay') return 'Mode Delay (ms)';
        return 'Value';
    };

    const formatValue = (v: any) => {
        const n = Number(v);
        if (!Number.isFinite(n)) return '0';
        return formatIsAvgValue(n, isAvgEventType);
    };

    const formatTotalLabel = () => {
        if (isAvgEventType === 2) return 'Total (₹)';
        if (isAvgEventType === 1) return 'Total (ms)';
        return 'Total Entries';
    };

    const total = pieData.data.reduce((acc: number, item: any) => acc + item.value, 0);
    const sortedData = [...pieData.data].sort((a, b) => b.value - a.value);

    // Show only the most relevant segments (top N), group the rest
    const MAX_SEGMENTS = 10;
    const primarySegments = sortedData.slice(0, MAX_SEGMENTS);
    const otherSegmentsTotal = sortedData
        .slice(MAX_SEGMENTS)
        .reduce((acc: number, item: any) => acc + item.value, 0);

    const displayData = otherSegmentsTotal > 0
        ? [...primarySegments, { name: 'Other categories', value: otherSegmentsTotal, isOther: true }]
        : primarySegments;

    return (
        <Dialog open={open} onOpenChange={onClose}>
            <DialogContent
                showCloseButton={false}
                className="w-full max-w-[96vw] sm:max-w-full md:w-[96vw] lg:w-[94vw] sm:max-w-7xl max-h-[90vh] overflow-hidden p-0 bg-white dark:bg-slate-900"
            >
                {/* Premium Header with Close Button */}
                <div className="relative px-4 sm:px-6 py-4 bg-gradient-to-r from-purple-600 via-violet-600 to-fuchsia-600 text-white">
                    <div className="flex items-center gap-3 sm:gap-4">
                        <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
                            {pieData.type === 'platform' && <Activity className="h-5 w-5 sm:h-6 sm:w-6 text-white" />}
                            {pieData.type === 'pos' && <Target className="h-5 w-5 sm:h-6 sm:w-6 text-white" />}
                            {pieData.type === 'source' && <Zap className="h-5 w-5 sm:h-6 sm:w-6 text-white" />}
                            {pieData.type === 'status' && <Activity className="h-5 w-5 sm:h-6 sm:w-6 text-white" />}
                            {pieData.type === 'cacheStatus' && <Zap className="h-5 w-5 sm:h-6 sm:w-6 text-white" />}
                        </div>
                        <div className="flex-1 min-w-0">
                            <h2 className="text-lg sm:text-xl font-bold truncate">{pieData.title} Distribution</h2>
                            <p className="text-purple-100 text-xs sm:text-sm truncate">
                                {sortedData.length} categories • {formatValue(total)} total
                            </p>
                            <div className="mt-2">
                                <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-semibold bg-white/15 text-white">
                                    {getMetricLabel()}
                                </span>
                            </div>
                        </div>
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={onClose}
                            className="ml-auto h-10 w-10 sm:h-8 sm:w-8 rounded-full bg-white/10 hover:bg-white/20 text-white touch-manipulation flex-shrink-0"
                            aria-label="Close modal"
                        >
                            <X className="h-5 w-5 sm:h-4 sm:w-4" />
                        </Button>
                    </div>
                </div>

                {/* Main Content - Scrollable */}
                <div className="p-4 sm:p-6 md:p-8 max-h-[calc(90vh-100px)] overflow-y-auto">
                    {/* From md and up, use a 12-column grid so chart and
                        breakdown can share space without clipping */}
                    <div className="grid grid-cols-1 md:grid-cols-12 gap-6 lg:gap-10 items-stretch">
                        {/* Enhanced Pie Chart Section */}
                        <div className="md:col-span-7 lg:col-span-7 bg-white dark:bg-slate-800/50 rounded-2xl border border-purple-200/50 dark:border-purple-500/30 p-8 shadow-lg shadow-purple-500/10">
                            <div className="h-[360px] md:h-[420px] w-full">
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie
                                            data={displayData}
                                            cx="50%"
                                            cy="50%"
                                            startAngle={0}
                                            endAngle={360}
                                            innerRadius={90}
                                            outerRadius={170}
                                            paddingAngle={2}
                                            dataKey="value"
                                            strokeWidth={2}
                                            stroke="#fff"
                                            label={false}
                                            labelLine={false}
                                            isAnimationActive={false}
                                            animationDuration={0}
                                        >
                                            {displayData.map((_: any, index: number) => (
                                                <Cell
                                                    key={`cell-${index}`}
                                                    fill={PIE_COLORS[index % PIE_COLORS.length]}
                                                    className="drop-shadow-lg"
                                                />
                                            ))}
                                        </Pie>
                                        <Tooltip content={<PieTooltip totalValue={total} isAvgEventType={isAvgEventType} />} />
                                    </PieChart>
                                </ResponsiveContainer>
                            </div>

                            {/* Chart Summary Stats */}
                            <div className="mt-4 grid grid-cols-2 gap-4">
                                <div className="text-center p-3 bg-gradient-to-br from-purple-50 to-violet-50 dark:from-purple-500/10 dark:to-violet-500/10 rounded-xl">
                                    <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">{sortedData.length}</div>
                                    <div className="text-xs text-muted-foreground">Categories</div>
                                </div>
                                <div className="text-center p-3 bg-gradient-to-br from-pink-50 to-fuchsia-50 dark:from-pink-500/10 dark:to-fuchsia-500/10 rounded-xl">
                                    <div className="text-2xl font-bold text-pink-600 dark:text-pink-400">{formatValue(total)}</div>
                                    <div className="text-xs text-muted-foreground">{formatTotalLabel()}</div>
                                </div>
                            </div>
                        </div>

                        {/* Enhanced Data Table */}
                        <div className="md:col-span-5 lg:col-span-5 bg-white dark:bg-slate-800/50 rounded-2xl border border-purple-200/50 dark:border-purple-500/30 overflow-hidden shadow-lg shadow-purple-500/10">
                        <div className="px-6 py-4 bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-500/10 dark:to-pink-500/10 border-b border-purple-200/50 dark:border-purple-500/30">
                            <h3 className="font-semibold text-foreground">Detailed Breakdown</h3>
                            <p className="text-xs text-muted-foreground">Sorted by highest value</p>
                        </div>

                        <div className="max-h-[300px] sm:max-h-[420px] overflow-y-auto">
                            <div className="space-y-0">
                                {displayData.map((item: any, index: number) => {
                                    const percentage = total > 0 ? ((item.value / total) * 100) : 0;

                                    return (
                                        <div
                                            key={item.name}
                                            className="flex items-center gap-4 p-4 border-b border-gray-100 dark:border-gray-700/50 hover:bg-gradient-to-r hover:from-purple-50/50 hover:to-pink-50/50 dark:hover:from-purple-500/5 dark:hover:to-pink-500/5 transition-all duration-200"
                                        >
                                            {/* Color + Name */}
                                            <div className="flex items-center gap-3 flex-1 min-w-0">
                                                <div
                                                    className={cn(
                                                        "w-3 h-3 rounded-full flex-shrink-0 border-2 border-white dark:border-gray-800",
                                                        item.isOther && "opacity-70"
                                                    )}
                                                    style={{ backgroundColor: PIE_COLORS[index % PIE_COLORS.length] }}
                                                />
                                                <div className="flex-1 min-w-0">
                                                    <div className="font-medium text-sm text-foreground truncate">
                                                        {item.name}
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Progress Bar */}
                                            <div className="hidden sm:flex flex-1 items-center">
                                                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                                                    <div
                                                        className="h-2 rounded-full"
                                                        style={{
                                                            width: `${Math.max(percentage, total > 0 ? 2 : 0)}%`,
                                                            background: PIE_COLORS[index % PIE_COLORS.length]
                                                        }}
                                                    />
                                                </div>
                                            </div>

                                            {/* Values */}
                                            <div className="text-right flex-shrink-0 min-w-[88px] sm:min-w-[104px]">
                                                <div className="font-semibold text-sm text-foreground">{formatValue(item.value)}</div>
                                                <div className="text-xs font-medium text-purple-600 dark:text-purple-400">
                                                    {percentage.toFixed(1)}%
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </DialogContent>
        </Dialog>
    );
}