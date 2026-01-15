import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Activity, Target, Zap, X, PieChart as PieChartIcon, Check } from 'lucide-react';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from 'recharts';
import { cn } from '@/lib/utils';
import { formatIsAvgValue } from '@/lib/formatters';
import { getPOSName } from '@/lib/posMapping';
import { useChartZoom } from '@/hooks/useChartZoom';
import { useChartKeyboardNav } from '@/hooks/useAccessibility';
import { ChartZoomControls } from './ChartZoomControls';

// Professional Pie Tooltip
// Professional Pie Tooltip
const formatNumber = (num: number | null | undefined) => {
    if (num === null || num === undefined) return '0';
    if (num >= 1000000000) return (num / 1000000000).toFixed(1) + 'B';
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'k';
    return Math.floor(num).toString();
};

const formatRupee = (num: number | null | undefined) => {
    if (num === null || num === undefined) return '₹0';
    return `₹${Number(num).toLocaleString()}`;
};

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
export const PieTooltip = ({ active, payload, totalValue, isAvgEventType = 0, isPosChart = false, isApiEvent = false }: any) => {
    if (active && payload && payload.length) {
        const data = payload[0].payload;
        const percentage = ((data.value / totalValue) * 100).toFixed(2);
        // Apply POS mapping if this is a POS chart
        const displayName = isPosChart ? getPOSName(data.name) : data.name;

        // Format value logic
        const formattedValue = isAvgEventType === 2
            ? (isApiEvent ? `₹${Number(data.value).toLocaleString()}` : Number(data.value).toLocaleString())
            : formatIsAvgValue(data.value, isAvgEventType);

        return (
            <div className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-sm rounded-lg shadow-lg border border-slate-200/60 dark:border-slate-700/60 px-4 py-3 min-w-[140px]">
                <div className="flex items-center gap-2.5 mb-1">
                    <div
                        className="w-2.5 h-2.5 rounded-sm flex-shrink-0"
                        style={{ backgroundColor: payload[0]?.fill || '#6366f1' }}
                    />
                    <span className="font-medium text-sm text-slate-900 dark:text-slate-100 truncate">
                        {displayName}
                    </span>
                </div>
                <div className="space-y-0.5">
                    <div className="flex justify-between items-center">
                        <span className="text-xs text-slate-600 dark:text-slate-400">Value</span>
                        <span className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                            {formattedValue}
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
    activeType: 'platform' | 'pos' | 'source';
    title: string;
    distributions: {
        platform: any[];
        pos: any[];
        source: any[];
    };
    isApiEvent?: boolean;
}

interface ExpandedPieChartModalProps {
    open: boolean;
    onClose: () => void;
    pieData: ExpandedPieData | null;
    isAvgEventType?: number; // 0=count, 1=time(ms), 2=rupees
}

export function ExpandedPieChartModal({ open, onClose, pieData, isAvgEventType = 0 }: ExpandedPieChartModalProps) {
    // Local state to manage the currently selected distribution type within the modal
    const [activeType, setActiveType] = useState<'platform' | 'pos' | 'source'>('platform');
    const [minPercentage, setMinPercentage] = useState(0);
    const [topItems, setTopItems] = useState<'5' | '10' | 'all'>('10');

    // Sync local state with prop when modal opens
    useEffect(() => {
        if (pieData?.activeType) {
            setActiveType(pieData.activeType);
        }
    }, [pieData?.activeType, open]);

    // Initialize zoom functionality
    const {
        zoomLevel,
        zoomIn,
        zoomOut,
        resetZoom,
        handleWheel,
    } = useChartZoom({ minZoom: 0.5, maxZoom: 3, zoomStep: 0.2 });

    const [searchQuery, setSearchQuery] = useState('');

    // Reset search when active type changes
    useEffect(() => {
        setSearchQuery('');
    }, [activeType]);

    // Keyboard navigation support
    useChartKeyboardNav({
        onNext: zoomIn,      // Right/Down arrow -> Zoom In
        onPrevious: zoomOut, // Left/Up arrow -> Zoom Out
        onEscape: onClose,   // Escape -> Close modal
    });

    if (!pieData || !pieData.distributions) return null;

    // Get the data based on active type
    const currentData = pieData.distributions[activeType] || [];

    // Check available distributions for sidebar
    const hasPlatform = (pieData.distributions.platform?.length || 0) > 0;
    const hasPos = (pieData.distributions.pos?.length || 0) > 0;
    const hasSource = (pieData.distributions.source?.length || 0) > 0;

    if (!currentData.length) return null;

    const metricType = currentData.find((d: any) => d?.metricType)?.metricType || 'count';
    const isCount = metricType === 'count' && isAvgEventType === 0;

    const formatValue = (v: any) => {
        const n = Number(v);
        if (!Number.isFinite(n)) return '0';

        // Only show Rupee symbol if isAvgEventType === 2 AND (isApiEvent is true)
        if (isAvgEventType === 2) {
            return pieData.isApiEvent
                ? `₹${n.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ",")}`
                : n.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
        }

        // For specific AvgEventType 0 (which is Count), always floor
        if (isAvgEventType === 0) {
            return Math.floor(n).toLocaleString();
        }

        return formatIsAvgValue(n, isAvgEventType);
    };

    const total = currentData.reduce((acc: number, item: any) => acc + item.value, 0);

    // Apply POS mapping if this is a POS chart
    const mappedData = activeType === 'pos'
        ? currentData.map((item: any) => ({
            ...item,
            name: getPOSName(item.name)
        }))
        : currentData;

    let processedData = [...mappedData].sort((a, b) => b.value - a.value);

    // Filter by Min Percentage
    if (minPercentage > 0 && total > 0) {
        processedData = processedData.filter(item => (item.value / total) * 100 >= minPercentage);
    }

    // Top Items Toggle
    if (topItems !== 'all') {
        processedData = processedData.slice(0, parseInt(topItems));
    }

    const sortedData = processedData;

    // Filter by search query
    const filteredData = sortedData.filter(item =>
        item.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    // Show only the most relevant segments (top N), group the rest
    const MAX_SEGMENTS = topItems === 'all' ? 100 : parseInt(topItems);
    const primarySegments = sortedData.slice(0, MAX_SEGMENTS);
    const otherSegmentsTotal = sortedData
        .slice(MAX_SEGMENTS)
        .reduce((acc: number, item: any) => acc + item.value, 0);

    const displayData = otherSegmentsTotal > 0
        ? [...primarySegments, { name: 'Other', value: otherSegmentsTotal, isOther: true }]
        : primarySegments;

    const navItems = [
        { id: 'platform', label: 'Platform', icon: Activity, count: pieData.distributions.platform?.length || 0, show: hasPlatform },
        { id: 'pos', label: 'POS', icon: Target, count: pieData.distributions.pos?.length || 0, show: hasPos },
        { id: 'source', label: 'Source', icon: Zap, count: pieData.distributions.source?.length || 0, show: hasSource },
    ] as const;

    // Direct label rendering for pie chart
    const renderCustomizedLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent, name, value }: any) => {
        const RADIAN = Math.PI / 180;
        const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
        const x = cx + radius * Math.cos(-midAngle * RADIAN);
        const y = cy + radius * Math.sin(-midAngle * RADIAN);

        // Only show label if slice is large enough
        if (percent < 0.05) return null;

        return (
            <text
                x={x}
                y={y}
                fill="white"
                textAnchor="middle"
                dominantBaseline="central"
                className="text-[10px] font-bold drop-shadow-[0_1px_1px_rgba(0,0,0,0.8)]"
            >
                {`${name} (${formatNumber(value)}) - ${(percent * 100).toFixed(2)}%`}
            </text>
        );
    };

    return (
        <Dialog open={open} onOpenChange={onClose}>
            <DialogContent
                showCloseButton={true}
                className="w-[98vw] max-w-[1800px] h-[92vh] overflow-hidden p-0 bg-white dark:bg-slate-950 flex flex-col md:flex-row gap-0 shadow-2xl"
            >
                {/* Left Sidebar - Navigation */}
                <div className="w-full md:w-64 bg-slate-50 dark:bg-slate-900 border-b md:border-b-0 md:border-r border-slate-200 dark:border-slate-800 flex flex-col flex-shrink-0">
                    <div className="p-4 border-b border-slate-200 dark:border-slate-800">
                        <div className="flex items-center gap-2.5 mb-3">
                            <div className="h-7 w-7 rounded-lg bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center shadow-md">
                                <PieChartIcon className="h-3.5 w-3.5 text-white" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <h2 className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate">Distribution</h2>
                                <p className="text-[10px] text-muted-foreground truncate leading-tight" title={pieData.title}>{pieData.title}</p>
                            </div>
                        </div>

                        {/* Search Input */}
                        <div className="relative">
                            <input
                                type="text"
                                placeholder="Search..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full h-8 px-8 text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md focus:outline-none focus:ring-1 focus:ring-purple-500"
                            />
                            <svg className="absolute left-2.5 top-2.5 h-3 w-3 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                            </svg>
                            {searchQuery && (
                                <button
                                    onClick={() => setSearchQuery('')}
                                    className="absolute right-2.5 top-2.5"
                                >
                                    <X className="h-3 w-3 text-slate-400 hover:text-slate-600" />
                                </button>
                            )}
                        </div>
                    </div>

                    <div className="p-2 md:p-3 space-y-4 overflow-y-auto">
                        <div className="space-y-1">
                            <div className="mb-2 px-2">
                                <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Metrics</span>
                            </div>
                            {navItems.filter(item => item.show).map((item) => {
                                const Icon = item.icon;
                                const isActive = activeType === item.id;
                                return (
                                    <button
                                        key={item.id}
                                        onClick={() => {
                                            setActiveType(item.id as any);
                                            resetZoom(); // Reset zoom when switching charts
                                        }}
                                        className={cn(
                                            "w-full flex items-center gap-2.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-200",
                                            isActive
                                                ? "bg-white dark:bg-slate-800 text-purple-600 dark:text-purple-400 shadow-sm ring-1 ring-purple-200 dark:ring-purple-500/30"
                                                : "text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/50 hover:text-slate-900 dark:hover:text-slate-200"
                                        )}
                                    >
                                        <Icon className={cn("h-3.5 w-3.5", isActive ? "text-purple-500" : "text-slate-400")} />
                                        <span>{item.label}</span>
                                        <span className={cn(
                                            "ml-auto text-[10px] px-1.5 py-0.5 rounded-full font-bold",
                                            isActive ? "bg-purple-100 dark:bg-purple-500/20 text-purple-700 dark:text-purple-300" : "bg-slate-100 dark:bg-slate-800 text-slate-500"
                                        )}>
                                            {item.count}
                                        </span>
                                    </button>
                                );
                            })}
                        </div>

                        {/* Top Items Toggle */}
                        <div className="space-y-2 px-2 pt-2 border-t border-slate-200 dark:border-slate-800">
                            <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Show Results</span>
                            <div className="flex flex-wrap gap-1.5 mt-1">
                                {(['5', '10', 'all'] as const).map((count) => (
                                    <button
                                        key={count}
                                        onClick={() => setTopItems(count)}
                                        className={cn(
                                            "px-2 py-1 rounded text-[10px] font-bold uppercase transition-all",
                                            topItems === count
                                                ? "bg-purple-600 text-white shadow-sm"
                                                : "bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
                                        )}
                                    >
                                        {count === 'all' ? 'All' : `Top ${count}`}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Minimum % Filter */}
                        <div className="space-y-2 px-2 pt-2 border-t border-slate-200 dark:border-slate-800">
                            <div className="flex justify-between items-center">
                                <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Filter by Min %</span>
                                <span className="text-[10px] font-bold text-purple-600 dark:text-purple-400">{minPercentage}%</span>
                            </div>
                            <input
                                type="range"
                                min="0"
                                max="20"
                                step="0.5"
                                value={minPercentage}
                                onChange={(e) => setMinPercentage(parseFloat(e.target.value))}
                                className="w-full h-1 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-purple-600"
                            />
                            <div className="flex justify-between text-[8px] text-slate-400 font-bold uppercase">
                                <span>0%</span>
                                <span>20%</span>
                            </div>
                        </div>
                    </div>

                    <div className="p-4 mt-auto border-t border-slate-200 dark:border-slate-800 md:block hidden">
                        <Button variant="outline" className="w-full justify-center h-9 text-xs" onClick={onClose}>
                            Close View
                        </Button>
                    </div>
                </div>

                {/* Main Content Area */}
                <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden bg-white dark:bg-slate-950">
                    {/* Header for Mobile/Desktop */}
                    <div className="px-4 py-2 md:px-6 md:py-2.5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-white dark:bg-slate-950 z-10 min-h-[56px]">
                        <div>
                            <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 capitalize">
                                {activeType} Breakdown
                            </h3>
                            <div className="flex items-center gap-2 text-[10px] text-muted-foreground mt-0">
                                <span className="font-bold bg-slate-100 dark:bg-slate-800 px-1.5 rounded text-slate-700 dark:text-slate-300">
                                    {formatValue(total)}
                                </span>
                                <span>total • {sortedData.length} categories</span>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={onClose}
                                className="h-9 w-9 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full"
                            >
                                <X className="h-5 w-5" />
                            </Button>
                        </div>
                    </div>

                    {/* Chart Container */}
                    <div className="flex-1 overflow-y-auto p-4 md:p-5 lg:p-6 bg-slate-50/30 dark:bg-slate-900/10">
                        <div className="grid grid-cols-1 xl:grid-cols-12 gap-4 lg:gap-6 max-w-none mx-auto h-full items-start">

                            {/* Chart Section */}
                            <div className="xl:col-span-7 bg-white dark:bg-slate-900/50 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 shadow-sm relative min-h-[400px]">
                                {/* Zoom Controls */}
                                <div className="absolute top-4 right-4 z-10">
                                    <ChartZoomControls
                                        zoomLevel={zoomLevel}
                                        onZoomIn={zoomIn}
                                        onZoomOut={zoomOut}
                                        onReset={resetZoom}
                                        minZoom={0.5}
                                        maxZoom={3}
                                    />
                                </div>

                                <div className="h-[400px] md:h-[650px] w-full flex flex-col items-center justify-center p-2" onWheel={handleWheel}>
                                    <div
                                        style={{
                                            transform: `scale(${zoomLevel})`,
                                            transformOrigin: "center center",
                                            transition: "transform 0.15s ease-out",
                                            width: "100%",
                                            height: "100%",
                                            display: 'flex',
                                            justifyContent: 'center',
                                            alignItems: 'center'
                                        }}
                                    >
                                        <ResponsiveContainer width="100%" height="100%">
                                            <PieChart>
                                                <Pie
                                                    data={displayData}
                                                    cx="50%"
                                                    cy="50%"
                                                    startAngle={0}
                                                    endAngle={360}
                                                    innerRadius={150}
                                                    outerRadius={250}
                                                    paddingAngle={2}
                                                    dataKey="value"
                                                    strokeWidth={2}
                                                    stroke="#fff"
                                                    label={renderCustomizedLabel}
                                                    labelLine={false}
                                                    isAnimationActive={false}
                                                >
                                                    {displayData.map((_: any, index: number) => (
                                                        <Cell
                                                            key={`cell-${index}`}
                                                            fill={PIE_COLORS[index % PIE_COLORS.length]}
                                                            className="drop-shadow-sm stroke-slate-50 dark:stroke-slate-900"
                                                        />
                                                    ))}
                                                </Pie>
                                                <Tooltip
                                                    content={
                                                        <PieTooltip
                                                            totalValue={total}
                                                            isAvgEventType={isAvgEventType}
                                                            isPosChart={activeType === 'pos'}
                                                            isApiEvent={pieData.isApiEvent}
                                                        />
                                                    }
                                                />
                                            </PieChart>
                                        </ResponsiveContainer>
                                    </div>
                                    {/* Central Stats Overlay */}
                                    <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                                        <span className="text-[12px] font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] mb-1">
                                            TOTAL
                                        </span>
                                        <span className="text-5xl font-black text-slate-900 dark:text-white tabular-nums tracking-tighter">
                                            {pieData.isApiEvent ? formatRupee(total).split('.')[0] : formatNumber(total)}
                                        </span>
                                        <div className="h-1 w-12 bg-purple-500/50 rounded-full mt-4" />
                                    </div>
                                </div>
                            </div>

                            {/* Data Table Section */}
                            <div className="xl:col-span-5 flex flex-col bg-white dark:bg-slate-900/50 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden h-full max-h-[750px]">
                                <div className="px-5 py-2.5 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 flex justify-between items-center">
                                    <h4 className="font-bold text-xs uppercase tracking-wider text-slate-500">
                                        {searchQuery ? `Search Results (${filteredData.length})` : 'Detailed Breakdown'}
                                    </h4>
                                    <span className="text-[10px] font-bold bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-full">
                                        {searchQuery ? filteredData.length : sortedData.length} items
                                    </span>
                                </div>
                                <div className="flex-1 overflow-y-auto">
                                    {(searchQuery ? filteredData : sortedData).map((item: any, index: number) => {
                                        const percentage = total > 0 ? ((item.value / total) * 100) : 0;
                                        // Find original index for color consistency
                                        const originalIndex = sortedData.findIndex(s => s.name === item.name);
                                        return (
                                            <div
                                                key={item.name}
                                                className="flex items-center gap-3 p-3 w-full border-b border-slate-100 dark:border-slate-800/50 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                                            >
                                                <div
                                                    className={cn(
                                                        "w-2.5 h-2.5 rounded-full flex-shrink-0",
                                                        item.isOther && "opacity-50"
                                                    )}
                                                    style={{ backgroundColor: PIE_COLORS[originalIndex % PIE_COLORS.length] }}
                                                />
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex justify-between items-baseline mb-1">
                                                        <span className="text-[11px] font-medium truncate pr-2 text-slate-700 dark:text-slate-200">{item.name}</span>
                                                        <span className="text-[11px] font-semibold text-slate-900 dark:text-slate-100">{formatValue(item.value)}</span>
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <div className="flex-1 h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                                                            <div
                                                                className="h-full rounded-full"
                                                                style={{
                                                                    width: `${percentage}%`,
                                                                    backgroundColor: PIE_COLORS[originalIndex % PIE_COLORS.length]
                                                                }}
                                                            />
                                                        </div>
                                                        <span className="text-[9px] text-muted-foreground w-8 text-right font-medium">{percentage.toFixed(1)}%</span>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                    {(searchQuery ? filteredData : sortedData).length === 0 && (
                                        <div className="p-8 text-center">
                                            <p className="text-xs text-muted-foreground italic">No results found for "{searchQuery}"</p>
                                        </div>
                                    )}
                                </div>
                            </div>

                        </div>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}