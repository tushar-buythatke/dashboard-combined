import React, { useState, useEffect, useCallback } from 'react';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import * as VisuallyHidden from '@radix-ui/react-visually-hidden';
import { Button } from '@/components/ui/button';
import { Activity, Target, Zap, X, PieChart as PieChartIcon } from 'lucide-react';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, Sector } from 'recharts';
import { cn } from '@/lib/utils';
import { formatIsAvgValue } from '@/lib/formatters';
import { getPOSName } from '@/lib/posMapping';
import { PLATFORMS } from '@/services/apiService';
import { useChartZoom } from '@/hooks/useChartZoom';
import { useChartKeyboardNav } from '@/hooks/useAccessibility';
import { ChartZoomControls } from './ChartZoomControls';
import { useAccentTheme } from '@/contexts/AccentThemeContext';
import { useIsMobile } from '@/hooks/use-mobile';
import { useChartColors } from '@/lib/chartTheme';

// ─── Formatters ───────────────────────────────────────────────────────────────
const formatNumber = (num: number | null | undefined) => {
    if (num === null || num === undefined) return '0';
    if (num >= 1_000_000_000) return (num / 1_000_000_000).toFixed(1) + 'B';
    if (num >= 1_000_000) return (num / 1_000_000).toFixed(1) + 'M';
    if (num >= 1_000) return (num / 1_000).toFixed(1) + 'k';
    return Math.floor(num).toString();
};

const formatRupee = (num: number | null | undefined) => {
    if (num === null || num === undefined) return '₹0';
    return `₹${Number(num).toLocaleString()}`;
};

// ─── Vivid palette (kept for export compat) — we now use useChartColors().palette
export const PIE_COLORS = [
    '#6c47ff', '#10b981', '#f59e0b', '#ef4444', '#06b6d4',
    '#a855f7', '#f97316', '#84cc16', '#ec4899', '#3b82f6',
    '#6366f1', '#14b8a6',
];

// ─── Premium glass tooltip ────────────────────────────────────────────────────
export const PieTooltip = ({
    active, payload, totalValue, isAvgEventType = 0, isPosChart = false, isApiEvent = false, siteDetails = []
}: any) => {
    if (!active || !payload?.length) return null;
    const data = payload[0].payload;
    const percentage = ((data.value / totalValue) * 100).toFixed(2);
    const displayName = isPosChart ? getPOSName(data.name, siteDetails, data.originalKey) : data.name;
    const formattedValue = isAvgEventType === 2
        ? (isApiEvent ? `₹${Number(data.value).toLocaleString()}` : Number(data.value).toLocaleString())
        : formatIsAvgValue(data.value, isAvgEventType);
    const color = payload[0]?.fill || '#6c47ff';

    return (
        <div
            className="min-w-[148px] max-w-[240px] rounded-[10px] border-l-[3px] backdrop-blur-xl px-3.5 py-2.5 shadow-[0_8px_32px_rgba(0,0,0,0.35)]"
            style={{ background: 'rgba(15,15,26,0.88)', borderLeftColor: color }}
        >
            <div className="mb-1.5 flex items-center gap-2">
                <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: color }} />
                <span className="truncate text-[12px] font-semibold text-white/90">{displayName}</span>
            </div>
            <div className="space-y-0.5">
                <div className="flex items-baseline justify-between gap-3">
                    <span className="text-[10px] uppercase tracking-wide text-white/50">Value</span>
                    <span className="text-[13px] font-bold tabular-nums text-white">{formattedValue}</span>
                </div>
                <div className="flex items-baseline justify-between gap-3">
                    <span className="text-[10px] uppercase tracking-wide text-white/50">Share</span>
                    <span className="text-[13px] font-bold tabular-nums" style={{ color }}>{percentage}%</span>
                </div>
            </div>
        </div>
    );
};

// ─── Premium active slice shape ───────────────────────────────────────────────
const buildActiveShape = (surfaceColor: string) => (props: any) => {
    const { cx, cy, innerRadius, outerRadius, startAngle, endAngle, fill } = props;
    return (
        <g>
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
                style={{ filter: `drop-shadow(0 4px 16px ${fill}99)` }}
            />
        </g>
    );
};

// ─── Types ────────────────────────────────────────────────────────────────────
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
    isAvgEventType?: number;
    siteDetails?: Array<{ id: number; name: string; image?: string }>;
}

// ─── Main modal ───────────────────────────────────────────────────────────────
export function ExpandedPieChartModal({
    open, onClose, pieData, isAvgEventType = 0, siteDetails = []
}: ExpandedPieChartModalProps) {
    const { t: themeClasses } = useAccentTheme();
    const isMobile = useIsMobile();
    const colors = useChartColors();
    const [isShortViewport, setIsShortViewport] = useState(false);
    // Track which slice is hovered
    const [activeIndex, setActiveIndex] = useState<number | null>(null);
    // Track when modal has "entered" to trigger entrance animation
    const [entered, setEntered] = useState(false);

    useEffect(() => {
        const check = () => {
            if (typeof window === 'undefined') return;
            setIsShortViewport(window.innerHeight < 520);
        };
        check();
        window.addEventListener('resize', check);
        return () => window.removeEventListener('resize', check);
    }, []);

    // Entrance animation trigger
    useEffect(() => {
        if (open) {
            const t = setTimeout(() => setEntered(true), 30);
            return () => clearTimeout(t);
        } else {
            setEntered(false);
        }
    }, [open]);

    const isCompact = isMobile || isShortViewport;
    const [activeType, setActiveType] = useState<'platform' | 'pos' | 'source'>('platform');
    const [minPercentage, setMinPercentage] = useState(0);
    const [topItems, setTopItems] = useState<'5' | '10' | 'all'>('all');

    useEffect(() => {
        if (pieData?.activeType) {
            setActiveType(pieData.activeType);
        }
    }, [pieData?.activeType, open]);

    const {
        zoomLevel, zoomIn, zoomOut, resetZoom, handleWheel,
    } = useChartZoom({ minZoom: 0.5, maxZoom: 3, zoomStep: 0.2 });

    const [searchQuery, setSearchQuery] = useState('');

    useEffect(() => {
        setSearchQuery('');
        setActiveIndex(null);
    }, [activeType]);

    useChartKeyboardNav({
        onNext: zoomIn,
        onPrevious: zoomOut,
        onEscape: onClose,
    });

    const handleMouseEnter = useCallback((_: any, index: number) => setActiveIndex(index), []);
    const handleMouseLeave = useCallback(() => setActiveIndex(null), []);

    if (!pieData || !pieData.distributions) return null;

    const currentData = pieData.distributions[activeType] || [];
    const hasPlatform = (pieData.distributions.platform?.length || 0) > 0;
    const hasPos = (pieData.distributions.pos?.length || 0) > 0;
    const hasSource = (pieData.distributions.source?.length || 0) > 0;

    if (!currentData.length) return null;

    const isCount = isAvgEventType === 0;

    const formatValue = (v: any) => {
        const n = Number(v);
        if (!Number.isFinite(n)) return '0';
        if (isAvgEventType === 2) {
            return pieData.isApiEvent
                ? `₹${n.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}`
                : n.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
        }
        if (isAvgEventType === 0) return Math.floor(n).toLocaleString();
        return formatIsAvgValue(n, isAvgEventType);
    };

    const total = currentData.reduce((acc: number, item: any) => acc + item.value, 0);

    const getPlatformName = (idOrName: string | number): string => {
        const id = typeof idOrName === 'string' ? parseInt(idOrName, 10) : idOrName;
        if (isNaN(id)) return String(idOrName);
        const platform = PLATFORMS.find(p => p.id === id);
        return platform?.name || String(idOrName);
    };

    const mappedData = activeType === 'pos'
        ? currentData.map((item: any) => ({ ...item, name: getPOSName(item.name, siteDetails, item.originalKey) }))
        : activeType === 'platform'
            ? currentData.map((item: any) => ({ ...item, name: getPlatformName(item.name) }))
            : currentData;

    let processedData = [...mappedData].sort((a, b) => b.value - a.value);

    if (minPercentage > 0 && total > 0) {
        processedData = processedData.filter(item => (item.value / total) * 100 >= minPercentage);
    }

    if (topItems !== 'all') {
        processedData = processedData.slice(0, parseInt(topItems));
    }

    const sortedData = processedData;

    const filteredData = sortedData.filter(item =>
        item.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const MAX_SEGMENTS = topItems === 'all' ? 100 : parseInt(topItems);
    const primarySegments = sortedData.slice(0, MAX_SEGMENTS);
    const otherSegmentsTotal = sortedData
        .slice(MAX_SEGMENTS)
        .reduce((acc: number, item: any) => acc + item.value, 0);

    const displayData = otherSegmentsTotal > 0
        ? [...primarySegments, { name: 'Other', value: otherSegmentsTotal, isOther: true }]
        : primarySegments;

    // Use theme-reactive palette
    const palette = colors.palette;

    const navItems = [
        { id: 'platform', label: 'Platform', icon: Activity, count: pieData.distributions.platform?.length || 0, show: hasPlatform },
        { id: 'pos', label: 'POS', icon: Target, count: pieData.distributions.pos?.length || 0, show: hasPos },
        { id: 'source', label: 'Source', icon: Zap, count: pieData.distributions.source?.length || 0, show: hasSource },
    ] as const;

    const activeSlice = activeIndex !== null ? displayData[activeIndex] : null;
    const activePct = activeSlice && total > 0
        ? ((activeSlice.value / total) * 100).toFixed(1)
        : null;

    const activeShape = buildActiveShape(colors.surface);

    // Entrance animation style
    const donutStyle: React.CSSProperties = {
        transform: entered
            ? 'rotate(0deg) scale(1)'
            : 'rotate(-15deg) scale(0.85)',
        opacity: entered ? 1 : 0,
        transition: 'transform 600ms cubic-bezier(0.16,1,0.3,1), opacity 400ms ease',
    };

    return (
        <Dialog
            open={open}
            onOpenChange={(nextOpen) => {
                if (!nextOpen) onClose();
            }}
        >
            <DialogContent
                showCloseButton={false}
                className="w-[100vw] md:w-[98vw] max-w-[1800px] h-[calc(100dvh-64px)] md:h-[92vh] max-h-[calc(100dvh-64px)] md:max-h-[calc(100vh-64px)] overflow-hidden p-0 flex flex-col md:flex-row gap-0 shadow-2xl !top-[calc(50%+32px)] !left-[50%] !translate-x-[-50%] !translate-y-[-50%] rounded-none md:rounded-2xl"
                style={{ backdropFilter: 'blur(20px)', background: 'rgba(10,10,20,0.92)' }}
                aria-describedby={undefined}
            >
                <VisuallyHidden.Root>
                    <DialogTitle>{pieData?.title || 'Distribution Breakdown'}</DialogTitle>
                </VisuallyHidden.Root>

                {/* ── Left Sidebar ── */}
                <div className={cn(
                    "w-full md:w-64 border-b md:border-b-0 md:border-r flex flex-col flex-shrink-0 overflow-hidden max-h-[34dvh] md:max-h-none",
                    "bg-slate-950/80 border-slate-800/60",
                )}>
                    <div className="p-4 border-b border-slate-800/60">
                        <div className="flex items-center gap-2.5 mb-3">
                            <div className={cn("h-7 w-7 rounded-lg bg-gradient-to-br flex items-center justify-center shadow-md", themeClasses.buttonGradient)}>
                                <PieChartIcon className="h-3.5 w-3.5 text-white" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <h2 className="text-xs font-bold text-slate-100 truncate">Distribution</h2>
                                <p className="text-[10px] text-slate-500 truncate leading-tight" title={pieData.title}>{pieData.title}</p>
                            </div>
                        </div>

                        {/* Search */}
                        <div className="relative">
                            <input
                                type="text"
                                placeholder="Search..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full h-8 px-8 text-xs bg-slate-900/80 border border-slate-700/60 rounded-md focus:outline-none focus:ring-1 focus:ring-indigo-500 text-slate-100 placeholder:text-slate-500"
                            />
                            <svg className="absolute left-2.5 top-2.5 h-3 w-3 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                            </svg>
                            {searchQuery && (
                                <button onClick={() => setSearchQuery('')} className="absolute right-2.5 top-2.5">
                                    <X className="h-3 w-3 text-slate-500 hover:text-slate-300" />
                                </button>
                            )}
                        </div>
                    </div>

                    <div className="p-2 md:p-3 space-y-4 overflow-y-auto flex-1 min-h-0">
                        <div className="space-y-1">
                            <div className="mb-2 px-2">
                                <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Metrics</span>
                            </div>
                            {navItems.filter(item => item.show).map((item) => {
                                const Icon = item.icon;
                                const isActive = activeType === item.id;
                                return (
                                    <button
                                        key={item.id}
                                        onClick={() => {
                                            setActiveType(item.id as any);
                                            resetZoom();
                                        }}
                                        className={cn(
                                            "w-full flex items-center gap-2.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-200",
                                            isActive
                                                ? "bg-white/10 text-white ring-1 ring-white/20 shadow-sm"
                                                : "text-slate-400 hover:bg-white/5 hover:text-slate-200"
                                        )}
                                    >
                                        <Icon className={cn("h-3.5 w-3.5", isActive ? "text-indigo-400" : "text-slate-500")} />
                                        <span>{item.label}</span>
                                        <span className={cn(
                                            "ml-auto text-[10px] px-1.5 py-0.5 rounded-full font-bold",
                                            isActive ? "bg-white/10 text-slate-200" : "bg-slate-800/80 text-slate-500"
                                        )}>
                                            {item.count}
                                        </span>
                                    </button>
                                );
                            })}
                        </div>

                        {/* Top Items */}
                        <div className="space-y-2 px-2 pt-2 border-t border-slate-800/60">
                            <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Show Results</span>
                            <div className="flex flex-wrap gap-1.5 mt-1">
                                {(['5', '10', 'all'] as const).map((count) => (
                                    <button
                                        key={count}
                                        onClick={() => setTopItems(count)}
                                        className={cn(
                                            "px-2.5 py-1.5 rounded text-[10px] font-bold uppercase transition-all border",
                                            topItems === count
                                                ? "text-white bg-indigo-600 shadow-md border-indigo-500"
                                                : "text-slate-400 bg-slate-800/80 border-slate-700/60 hover:bg-slate-700/80"
                                        )}
                                    >
                                        {count === 'all' ? 'All' : `Top ${count}`}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Min % Filter */}
                        <div className="space-y-2 px-2 pt-2 border-t border-slate-800/60">
                            <div className="flex justify-between items-center">
                                <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Filter by Min %</span>
                                <span className="text-[10px] font-bold text-slate-400">{minPercentage}%</span>
                            </div>
                            <input
                                type="range"
                                min="0"
                                max="20"
                                step="0.5"
                                value={minPercentage}
                                onChange={(e) => setMinPercentage(parseFloat(e.target.value))}
                                className="w-full h-1 rounded-lg appearance-none cursor-pointer"
                                style={{ accentColor: '#6366f1' }}
                            />
                            <div className="flex justify-between text-[8px] text-slate-500 font-bold uppercase">
                                <span>0%</span>
                                <span>20%</span>
                            </div>
                        </div>
                    </div>

                    <div className="p-4 mt-auto border-t border-slate-800/60 md:block hidden">
                        <Button
                            variant="outline"
                            className="w-full justify-center h-9 text-xs border-slate-700/60 text-slate-300 hover:bg-slate-800/80 hover:text-white"
                            onClick={onClose}
                        >
                            Close View
                        </Button>
                    </div>
                </div>

                {/* ── Main Content ── */}
                <div className="flex-1 flex flex-col min-w-0 h-full min-h-0 overflow-hidden bg-slate-950/70">
                    {/* Header */}
                    <div className="px-4 py-2 md:px-6 md:py-2.5 border-b border-slate-800/60 flex items-center justify-between z-10 min-h-[56px]">
                        <div>
                            <h3 className="text-base font-bold text-slate-100 capitalize">
                                {activeType} Breakdown
                            </h3>
                            <div className="flex items-center gap-2 text-[10px] text-slate-500 mt-0">
                                <span className="font-bold bg-slate-800/80 px-1.5 rounded text-slate-300">
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
                                className="h-7 w-7 md:h-9 md:w-9 hover:bg-slate-800/80 text-slate-400 hover:text-slate-100 rounded-full"
                            >
                                <X className="h-4 w-4 md:h-5 md:w-5" />
                            </Button>
                        </div>
                    </div>

                    {/* Chart Container */}
                    <div
                        className="flex-1 overflow-y-auto p-4 md:p-5 lg:p-6 overscroll-contain"
                        style={{ WebkitOverflowScrolling: 'touch' }}
                    >
                        <div className="grid grid-cols-1 xl:grid-cols-12 gap-4 lg:gap-6 max-w-none mx-auto h-full items-start">

                            {/* ── Donut Chart ── */}
                            <div className="xl:col-span-7 bg-slate-900/60 rounded-2xl border border-slate-800/50 p-4 shadow-sm relative min-h-[260px] sm:min-h-[400px]">
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

                                <div
                                    className="h-[280px] sm:h-[400px] md:h-[calc(100dvh-260px)] w-full flex flex-col items-center justify-center p-2"
                                    onWheel={isCompact ? undefined : handleWheel}
                                    style={isCompact ? { touchAction: 'pan-y' } : undefined}
                                >
                                    {/* Entrance-animated donut */}
                                    <div
                                        style={{
                                            ...donutStyle,
                                            transform: `scale(${zoomLevel}) ${entered ? 'rotate(0deg)' : 'rotate(-15deg)'}`,
                                            transformOrigin: 'center center',
                                            width: '100%',
                                            height: '100%',
                                            display: 'flex',
                                            justifyContent: 'center',
                                            alignItems: 'center',
                                        }}
                                    >
                                        <ResponsiveContainer width="100%" height="100%">
                                            <PieChart>
                                                <Pie
                                                    data={displayData}
                                                    cx="50%"
                                                    cy="50%"
                                                    startAngle={90}
                                                    endAngle={-270}
                                                    innerRadius={isCompact ? "52%" : "58%"}
                                                    outerRadius={isCompact ? "80%" : "88%"}
                                                    paddingAngle={2}
                                                    dataKey="value"
                                                    strokeWidth={2}
                                                    activeShape={activeShape}
                                                    onMouseEnter={handleMouseEnter}
                                                    onMouseLeave={handleMouseLeave}
                                                    isAnimationActive={true}
                                                    animationDuration={700}
                                                    animationEasing="ease-out"
                                                    labelLine={false}
                                                >
                                                    {displayData.map((_: any, index: number) => (
                                                        <Cell
                                                            key={`cell-${index}`}
                                                            fill={palette[index % palette.length]}
                                                            stroke={colors.surface}
                                                            strokeWidth={2}
                                                            opacity={
                                                                activeIndex !== null && activeIndex !== index
                                                                    ? 0.45
                                                                    : 1
                                                            }
                                                            style={{ transition: 'opacity 0.2s ease, filter 0.2s ease' }}
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
                                                            siteDetails={siteDetails}
                                                        />
                                                    }
                                                    wrapperStyle={{ pointerEvents: 'none' }}
                                                />
                                            </PieChart>
                                        </ResponsiveContainer>
                                    </div>

                                    {/* Center text overlay — updates on hover */}
                                    <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none select-none">
                                        {activeSlice ? (
                                            <>
                                                <span
                                                    className="text-[9px] font-semibold uppercase tracking-[0.18em] mb-0.5 max-w-[120px] truncate text-center"
                                                    style={{ color: palette[(activeIndex ?? 0) % palette.length] + 'cc' }}
                                                >
                                                    {activeSlice.name}
                                                </span>
                                                <span
                                                    className="text-[28px] font-bold tabular-nums leading-none"
                                                    style={{ color: palette[(activeIndex ?? 0) % palette.length] }}
                                                >
                                                    {pieData.isApiEvent
                                                        ? formatRupee(activeSlice.value).split('.')[0]
                                                        : formatNumber(activeSlice.value)}
                                                </span>
                                                <span className="text-[11px] font-medium mt-1" style={{ color: colors.axis }}>
                                                    {activePct}%
                                                </span>
                                            </>
                                        ) : (
                                            <>
                                                <span
                                                    className="text-[10px] font-semibold uppercase tracking-[0.2em] mb-1"
                                                    style={{ color: colors.axis }}
                                                >
                                                    TOTAL
                                                </span>
                                                <span className="text-[28px] font-bold tabular-nums leading-none text-slate-100">
                                                    {pieData.isApiEvent
                                                        ? formatRupee(total).split('.')[0]
                                                        : formatNumber(total)}
                                                </span>
                                                <span className="text-[11px] font-medium mt-1" style={{ color: colors.axis }}>
                                                    {isCount ? 'events' : isAvgEventType === 2 ? '₹ total' : 'avg'}
                                                </span>
                                            </>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* ── Legend / Breakdown Table ── */}
                            <div
                                className={cn(
                                    "xl:col-span-5 flex flex-col bg-slate-900/60 rounded-2xl border border-slate-800/50 shadow-sm",
                                    isCompact ? "overflow-visible h-auto max-h-none" : "overflow-hidden h-full max-h-[750px]"
                                )}
                            >
                                <div className="px-5 py-2.5 border-b border-slate-800/50 bg-slate-900/40 flex justify-between items-center">
                                    <h4 className="font-bold text-xs uppercase tracking-wider text-slate-500">
                                        {searchQuery ? `Search Results (${filteredData.length})` : 'Detailed Breakdown'}
                                    </h4>
                                    <span className="text-[10px] font-bold bg-slate-800/80 px-2 py-0.5 rounded-full text-slate-400">
                                        {searchQuery ? filteredData.length : sortedData.length} items
                                    </span>
                                </div>

                                <div
                                    className={cn(isCompact ? "overflow-visible" : "flex-1 overflow-y-auto")}
                                    style={isCompact ? undefined : { WebkitOverflowScrolling: 'touch' }}
                                >
                                    {(searchQuery ? filteredData : sortedData).map((item: any, index: number) => {
                                        const percentage = total > 0 ? ((item.value / total) * 100) : 0;
                                        const originalIndex = sortedData.findIndex((s: any) => s.name === item.name);
                                        const color = palette[originalIndex % palette.length];
                                        const isRowHovered = activeIndex === originalIndex;
                                        return (
                                            <div
                                                key={item.name}
                                                className="flex items-start gap-3 p-3 w-full border-b border-slate-800/40 transition-all duration-150 cursor-default"
                                                style={{
                                                    background: isRowHovered
                                                        ? `${color}14`
                                                        : 'transparent',
                                                }}
                                                onMouseEnter={() => setActiveIndex(originalIndex)}
                                                onMouseLeave={() => setActiveIndex(null)}
                                            >
                                                {/* Color dot */}
                                                <div
                                                    className={cn(
                                                        "w-2.5 h-2.5 rounded-full flex-shrink-0 mt-0.5",
                                                        item.isOther && "opacity-50"
                                                    )}
                                                    style={{ backgroundColor: color }}
                                                />

                                                <div className="flex-1 min-w-0">
                                                    {/* Name + value */}
                                                    <div className="flex justify-between items-baseline mb-1">
                                                        <span className="text-[11px] font-medium truncate pr-2 text-slate-300">{item.name}</span>
                                                        <span className="text-[11px] font-bold tabular-nums text-slate-100 flex-shrink-0">{formatValue(item.value)}</span>
                                                    </div>
                                                    {/* Mini bar + % */}
                                                    <div className="flex items-center gap-2 mt-1">
                                                        <div className="flex-1 h-1.5 bg-slate-800/80 rounded-full overflow-hidden">
                                                            <div
                                                                className="h-full rounded-full transition-all duration-300"
                                                                style={{
                                                                    width: `${percentage}%`,
                                                                    background: `linear-gradient(90deg, ${color}, ${color}bb)`,
                                                                }}
                                                            />
                                                        </div>
                                                        <span className="text-[9px] text-slate-500 w-8 text-right font-medium tabular-nums">
                                                            {percentage.toFixed(1)}%
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                    {(searchQuery ? filteredData : sortedData).length === 0 && (
                                        <div className="p-8 text-center">
                                            <p className="text-xs text-slate-500 italic">No results found for "{searchQuery}"</p>
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
