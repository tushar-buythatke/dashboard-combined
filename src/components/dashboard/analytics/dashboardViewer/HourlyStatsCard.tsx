import React, { useState, useEffect } from 'react';
import {

    Activity,
    CheckCircle2,
    Flame,
    Hash,
    ChevronLeft,
    ChevronRight,
    ArrowUpRight,
    ArrowDownRight,
    TrendingUp,
    TrendingDown
} from 'lucide-react';
import { useCountUp } from '@/hooks/useCountUp';
import { useInView } from '@/hooks/useInView';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ResponsiveContainer, BarChart, XAxis, YAxis, Tooltip, Bar, Cell, ReferenceLine } from 'recharts';
import { InfoTooltip } from '../components/InfoTooltip';
import type { EventKeyInfo } from './types';
import type { EventConfig } from '@/types/analytics';

interface HourlyStatsCardProps {
    graphData: any[];
    isHourly: boolean;
    eventKeys?: EventKeyInfo[];
    events?: EventConfig[];
}

export const HourlyStatsCard = React.memo(({ graphData, isHourly, eventKeys = [], events = [] }: HourlyStatsCardProps) => {
    const [selectedHour, setSelectedHour] = useState(new Date().getHours());
    const [selectedEventKey, setSelectedEventKey] = useState<string | null>(null);

    // ── hooks must be unconditional — declared before any early return ───────
    const { ref: cardRef, inView: cardInView } = useInView<HTMLDivElement>();
    // Targets are resolved later; placeholders are 0 so count-up is gated by `start`
    // We use a two-pass approach: hooks fire with 0 while data is absent (gated off),
    // then re-fire with real values once the component is visible and data available.
    const [countTargets, setCountTargets] = useState({
        overallTotal: 0, overallSuccessRate: 0,
        selectedTotal: 0, selectedSuccess: 0, selectedFail: 0, selectedSuccessRate: 0,
    });
    const { formatted: fmtOverallTotal } = useCountUp(countTargets.overallTotal, { start: cardInView });
    const { formatted: fmtOverallSuccessRate } = useCountUp(countTargets.overallSuccessRate, { start: cardInView, decimals: 1 });
    const { formatted: fmtSelectedTotal } = useCountUp(countTargets.selectedTotal, { start: cardInView });
    const { formatted: fmtSelectedSuccess } = useCountUp(countTargets.selectedSuccess, { start: cardInView });
    const { formatted: fmtSelectedFail } = useCountUp(countTargets.selectedFail, { start: cardInView });
    const { formatted: fmtSelectedSuccessRate } = useCountUp(countTargets.selectedSuccessRate, { start: cardInView, decimals: 1 });

    if (!isHourly || !graphData || graphData.length === 0) return null;

    const activeEventKey = selectedEventKey;
    const selectedEventInfo = eventKeys.find(ek => ek.eventKey === activeEventKey);
    const isAvgEvent = selectedEventInfo?.isAvgEvent === 1;
    const selectedEventConfig = events.find(e => String(e.eventId) === selectedEventInfo?.eventId);
    const isPriceAlert = selectedEventConfig?.feature === 1;

    const hourlyStats = new Map<number, { total: number; success: number; fail: number; count: number; dates: string[]; avgDelay: number; delayCount: number }>();

    graphData.forEach((item: any) => {
        let hour = 0;
        if (item.timestamp) {
            const recordDate = new Date(item.timestamp);
            hour = recordDate.getHours();
        } else {
            const dateStr = item.date || '';
            const amPmMatch = dateStr.match(/(\d{1,2})\s*(AM|PM)/i);
            if (amPmMatch) {
                hour = parseInt(amPmMatch[1]);
                if (amPmMatch[2].toUpperCase() === 'PM' && hour !== 12) hour += 12;
                if (amPmMatch[2].toUpperCase() === 'AM' && hour === 12) hour = 0;
            } else {
                const timeMatch = dateStr.match(/(\d{1,2}):\d{2}/);
                if (timeMatch) hour = parseInt(timeMatch[1]);
            }
        }
        const existing = hourlyStats.get(hour) || { total: 0, success: 0, fail: 0, count: 0, dates: [], avgDelay: 0, delayCount: 0 };
        let itemTotal = 0, itemSuccess = 0, itemFail = 0, itemDelay = 0;
        if (activeEventKey) {
            itemTotal = item[`${activeEventKey}_count`] || 0;
            itemSuccess = item[`${activeEventKey}_success`] || 0;
            itemFail = item[`${activeEventKey}_fail`] || 0;
            itemDelay = item[`${activeEventKey}_avgDelay`] || 0;
        } else {
            itemTotal = item.count || 0;
            itemSuccess = item.successCount || 0;
            itemFail = item.failCount || 0;
        }
        hourlyStats.set(hour, {
            total: existing.total + itemTotal,
            success: existing.success + itemSuccess,
            fail: existing.fail + itemFail,
            count: existing.count + 1,
            dates: [...existing.dates, item.date || ''],
            avgDelay: existing.avgDelay + itemDelay,
            delayCount: existing.delayCount + (itemDelay > 0 ? 1 : 0)
        });
    });

    const availableHours = Array.from(hourlyStats.keys()).sort((a, b) => a - b);
    let overallTotal = 0, overallSuccess = 0, overallDelay = 0, delayCount = 0;
    if (activeEventKey) {
        graphData.forEach((d: any) => {
            overallTotal += d[`${activeEventKey}_count`] || 0;
            overallSuccess += d[`${activeEventKey}_success`] || 0;
            const delay = d[`${activeEventKey}_avgDelay`] || 0;
            if (delay > 0) {
                overallDelay += delay;
                delayCount++;
            }
        });
    } else {
        overallTotal = graphData.reduce((sum: number, d: any) => sum + (d.count || 0), 0);
        overallSuccess = graphData.reduce((sum: number, d: any) => sum + (d.successCount || 0), 0);
    }
    const overallSuccessRate = overallTotal > 0 ? (overallSuccess / overallTotal) * 100 : 0;
    const overallAvgDelay = delayCount > 0 ? overallDelay / delayCount : 0;

    const formatDelay = (delayValue: number) => {
        if (!delayValue || delayValue <= 0) return '0';
        if (isPriceAlert) {
            if (delayValue >= 60) return `${(delayValue / 60).toFixed(1)}h`;
            return `${delayValue.toFixed(1)}m`;
        } else {
            if (delayValue >= 60) return `${(delayValue / 60).toFixed(1)}m`;
            return `${delayValue.toFixed(1)}s`;
        }
    };

    let peakHour = 0, peakTotal = 0, lowestHour = 0, lowestTotal = Infinity;
    hourlyStats.forEach((stats, hour) => {
        const metric = isAvgEvent ? (stats.delayCount > 0 ? stats.avgDelay / stats.delayCount : 0) : stats.total;
        if (metric > peakTotal) { peakTotal = metric; peakHour = hour; }
        if (metric < lowestTotal && metric > 0) { lowestTotal = metric; lowestHour = hour; }
    });

    // Fall back to the peak hour when the chosen hour has no data.
    const activeHour = availableHours.includes(selectedHour) ? selectedHour : (availableHours.includes(peakHour) ? peakHour : (availableHours[0] ?? selectedHour));
    const selectedStats = hourlyStats.get(activeHour) || { total: 0, success: 0, fail: 0, count: 0, dates: [], avgDelay: 0, delayCount: 0 };
    const selectedAvgDelay = selectedStats.delayCount > 0 ? selectedStats.avgDelay / selectedStats.delayCount : 0;
    const avgPerHour = isAvgEvent ? overallAvgDelay : (overallTotal / Math.max(availableHours.length, 1));
    const selectedMetric = isAvgEvent ? selectedAvgDelay : selectedStats.total;
    const selectedVsAvg = avgPerHour > 0 ? ((selectedMetric - avgPerHour) / avgPerHour) * 100 : 0;
    const selectedSuccessRate = selectedStats.total > 0 ? (selectedStats.success / selectedStats.total) * 100 : 0;
    const avgPerDataPoint = selectedStats.count > 0 ? selectedStats.total / selectedStats.count : 0;

    const midpoint = Math.floor(availableHours.length / 2);
    const firstHalfTotal = availableHours.slice(0, midpoint).reduce((sum, h) => sum + (hourlyStats.get(h)?.total || 0), 0);
    const secondHalfTotal = availableHours.slice(midpoint).reduce((sum, h) => sum + (hourlyStats.get(h)?.total || 0), 0);
    const trendDirection = secondHalfTotal > firstHalfTotal ? 'up' : secondHalfTotal < firstHalfTotal ? 'down' : 'stable';

    const navigateHour = (direction: number) => {
        const currentIndex = availableHours.indexOf(activeHour);
        let newIndex = currentIndex + direction;
        if (newIndex < 0) newIndex = availableHours.length - 1;
        if (newIndex >= availableHours.length) newIndex = 0;
        setSelectedHour(availableHours[newIndex]);
    };

    const formatHour = (h: number) => {
        const period = h >= 12 ? 'PM' : 'AM';
        const hour12 = h % 12 || 12;
        return `${hour12}:00 ${period}`;
    };

    const formatHourShort = (h: number) => {
        const period = h >= 12 ? 'PM' : 'AM';
        const hour12 = h % 12 || 12;
        return `${hour12}${period}`;
    };

    // ── sync computed values to count-up targets ─────────────────────────────
    // eslint-disable-next-line react-hooks/exhaustive-deps
    useEffect(() => {
        setCountTargets({
            overallTotal: isAvgEvent ? 0 : overallTotal,
            overallSuccessRate,
            selectedTotal: isAvgEvent ? 0 : selectedStats.total,
            selectedSuccess: selectedStats.success,
            selectedFail: selectedStats.fail,
            selectedSuccessRate,
        });
    }, [isAvgEvent, overallTotal, overallSuccessRate, selectedStats.total, selectedStats.success, selectedStats.fail, selectedSuccessRate]);

    const eventLabel = selectedEventKey ? eventKeys.find(e => e.eventKey === selectedEventKey)?.eventName : 'All events';
    if (selectedEventKey === null && eventKeys.length > 0 && eventKeys.length <= 3) {
        setTimeout(() => setSelectedEventKey(eventKeys[0].eventKey), 0);
    }
    const kpis = [
        { icon: Activity, label: isAvgEvent ? 'Avg delay' : 'Total events', info: isAvgEvent ? 'Average processing time for events during this period.' : 'Total number of events recorded across all selected filters.', value: isAvgEvent ? formatDelay(overallAvgDelay) : fmtOverallTotal, sub: eventLabel },
        { icon: CheckCircle2, label: 'Success rate', info: 'Percentage of events that completed successfully without errors.', value: `${fmtOverallSuccessRate}%`, sub: `${overallSuccess.toLocaleString()} succeeded`, tone: 'var(--e-mint)' },
        { icon: Flame, label: isAvgEvent ? 'Peak delay hour' : 'Peak hour', info: isAvgEvent ? 'The hour with the highest average processing delay.' : 'The hour with the highest volume of events.', value: formatHourShort(peakHour), sub: isAvgEvent ? formatDelay(peakTotal) : `${Math.round(peakTotal).toLocaleString()} events` },
        { icon: Hash, label: isAvgEvent ? 'Avg delay / hour' : 'Avg / hour', info: isAvgEvent ? 'The historical average delay calculated across all tracked hours.' : 'Average number of events per hour across the selected time range.', value: isAvgEvent ? formatDelay(avgPerHour) : Math.round(avgPerHour).toLocaleString(), sub: `Lowest at ${formatHourShort(lowestHour)}` },
    ];
    const hourStats = [
        { k: isAvgEvent ? 'Avg delay' : 'Events', v: isAvgEvent ? formatDelay(selectedAvgDelay) : fmtSelectedTotal },
        { k: 'Successful', v: fmtSelectedSuccess },
        { k: 'Failed', v: fmtSelectedFail },
        { k: 'Success rate', v: `${fmtSelectedSuccessRate}%` },
    ];

    return (
        <div
            ref={cardRef}
            className="overflow-hidden rounded-[28px]"
            style={{ background: 'var(--e-surface)', boxShadow: 'var(--dash-card-shadow)' }}
        >
            {/* Header */}
            <div className="flex flex-col gap-4 px-5 pt-6 md:px-7 sm:flex-row sm:items-start sm:justify-between">
                <div>
                    <h3 className="text-[22px] md:text-[26px] font-medium leading-tight tracking-[-0.03em]" style={{ fontFamily: 'var(--font-display)', color: 'var(--e-ink)' }}>
                        Hourly insights
                    </h3>
                    <p className="mt-1 text-[13px]" style={{ color: 'var(--e-ink-3)' }}>
                        {availableHours.length} hours tracked · {eventLabel}
                    </p>
                </div>
                {eventKeys.length > 0 && (
                    eventKeys.length <= 3 ? (
                        <div className="flex items-center gap-1 rounded-full p-1" style={{ background: 'var(--e-surface-3)' }}>
                            {eventKeys.map((eventKeyInfo, index) => {
                                const isSelected = selectedEventKey === eventKeyInfo.eventKey || (selectedEventKey === null && index === 0);
                                return (
                                    <button
                                        key={eventKeyInfo.eventKey}
                                        onClick={() => setSelectedEventKey(eventKeyInfo.eventKey)}
                                        className="h-8 rounded-full px-3.5 text-[12px] font-bold transition-colors"
                                        style={isSelected
                                            ? { background: 'var(--e-ink-pill)', color: 'var(--e-canvas)' }
                                            : { color: 'var(--e-ink-2)' }}
                                    >
                                        {eventKeyInfo.eventName}
                                    </button>
                                );
                            })}
                        </div>
                    ) : (
                        <Select value={selectedEventKey || eventKeys[0]?.eventKey || ''} onValueChange={(value) => setSelectedEventKey(value)}>
                            <SelectTrigger className="h-10 w-[220px] text-[13px]">
                                <SelectValue placeholder="Select event" />
                            </SelectTrigger>
                            <SelectContent>
                                {eventKeys.map((eventKeyInfo) => (
                                    <SelectItem key={eventKeyInfo.eventKey} value={eventKeyInfo.eventKey} className="text-[13px]">
                                        {eventKeyInfo.eventName}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    )
                )}
            </div>

            {/* KPI row */}
            <div className="grid grid-cols-2 gap-3 px-5 pt-5 md:grid-cols-4 md:px-7">
                {kpis.map((k) => (
                    <div key={k.label} className="rounded-[20px] px-4 py-3.5" style={{ background: 'var(--e-surface-2)' }}>
                        <div className="flex items-center gap-1.5 text-[12px] font-bold" style={{ color: 'var(--e-ink-3)' }}>
                            <k.icon className="h-3.5 w-3.5" />
                            {k.label}
                            <InfoTooltip content={k.info} />
                        </div>
                        <div className="mt-1.5 text-[28px] font-medium leading-none tracking-[-0.035em] tabular-nums" style={{ fontFamily: 'var(--font-display)', color: k.tone ?? 'var(--e-ink)' }}>
                            {k.value}
                        </div>
                        <div className="mt-1.5 truncate text-[11.5px]" style={{ color: 'var(--e-ink-3)' }}>{k.sub}</div>
                    </div>
                ))}
            </div>

            {/* Distribution + selected hour */}
            <div className="grid grid-cols-1 gap-4 p-5 md:p-7 xl:grid-cols-3">
                <div className="xl:col-span-2">
                    <div className="mb-3 flex items-center justify-between">
                        <p className="text-[15px] font-bold" style={{ color: 'var(--e-ink)' }}>By hour of day</p>
                        <div className="flex items-center gap-3 text-[11.5px]" style={{ color: 'var(--e-ink-3)' }}>
                            <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full" style={{ background: 'hsl(var(--accent-primary))' }} />Selected</span>
                            <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full" style={{ background: 'var(--e-ink-pill)' }} />Peak</span>
                            <span className="hidden sm:inline">Click a bar</span>
                        </div>
                    </div>
                    <div className="h-48 md:h-56">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart
                                data={availableHours.map(hour => {
                                    const stats = hourlyStats.get(hour);
                                    const hourAvgDelay = stats && stats.delayCount > 0 ? stats.avgDelay / stats.delayCount : 0;
                                    return {
                                        hour,
                                        label: formatHourShort(hour),
                                        total: stats?.total || 0,
                                        success: stats?.success || 0,
                                        fail: stats?.fail || 0,
                                        avgDelay: hourAvgDelay,
                                    };
                                })}
                                margin={{ top: 8, right: 8, left: -18, bottom: 0 }}
                                barCategoryGap="18%"
                                onClick={(data: any) => {
                                    if (data?.activePayload?.[0]?.payload?.hour !== undefined) {
                                        setSelectedHour(data.activePayload[0].payload.hour);
                                    }
                                }}
                            >
                                <XAxis
                                    dataKey="label"
                                    tickLine={false}
                                    axisLine={false}
                                    interval={availableHours.length > 18 ? 2 : availableHours.length > 12 ? 1 : 0}
                                />
                                <YAxis
                                    tickLine={false}
                                    axisLine={false}
                                    tickFormatter={(v) => {
                                        if (isAvgEvent) {
                                            if (isPriceAlert) return v >= 60 ? `${(v / 60).toFixed(0)}h` : `${v.toFixed(0)}m`;
                                            return v >= 60 ? `${(v / 60).toFixed(0)}m` : `${v.toFixed(0)}s`;
                                        }
                                        return v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v;
                                    }}
                                />
                                <Tooltip
                                    active={typeof window !== 'undefined' && window.innerWidth >= 768 ? undefined : false}
                                    formatter={(value: number, name: string) => {
                                        if (isAvgEvent && name === 'avgDelay') return [formatDelay(value), 'Avg delay'];
                                        return [value.toLocaleString(), name === 'total' ? 'Events' : name === 'success' ? 'Success' : 'Failed'];
                                    }}
                                    labelFormatter={(label) => `${label}`}
                                />
                                <Bar
                                    dataKey={isAvgEvent ? "avgDelay" : "total"}
                                    radius={[10, 10, 10, 10]}
                                    maxBarSize={44}
                                    cursor="pointer"
                                    onClick={(data: any) => {
                                        if (data && data.hour !== undefined) setSelectedHour(data.hour);
                                    }}
                                >
                                    {availableHours.map((hour, index) => (
                                        <Cell
                                            key={`cell-${index}`}
                                            fill={hour === activeHour ? 'hsl(var(--accent-primary))' : hour === peakHour ? 'var(--e-ink-pill)' : 'hsl(var(--accent-primary) / 0.22)'}
                                            style={{ cursor: 'pointer', transition: 'fill 0.2s' }}
                                        />
                                    ))}
                                </Bar>
                                <ReferenceLine
                                    y={isAvgEvent ? overallAvgDelay : avgPerHour}
                                    stroke="var(--chart-avg)"
                                    strokeDasharray="4 4"
                                    strokeWidth={1.5}
                                />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                <div className="flex flex-col rounded-[24px] p-5" style={{ background: 'var(--e-ink-pill)', color: 'var(--e-canvas)' }}>
                    <div className="flex items-center justify-between">
                        <button onClick={() => navigateHour(-1)} aria-label="Previous hour" className="flex h-9 w-9 items-center justify-center rounded-full" style={{ background: 'color-mix(in srgb, var(--e-canvas) 12%, transparent)' }}>
                            <ChevronLeft className="h-4 w-4" />
                        </button>
                        <div className="text-center">
                            <div className="text-[30px] font-medium leading-none tracking-[-0.035em]" style={{ fontFamily: 'var(--font-display)' }}>{formatHour(activeHour)}</div>
                            <div className="mt-1 text-[11px] opacity-60">{activeHour === peakHour ? 'Peak hour' : 'Selected hour'}</div>
                        </div>
                        <button onClick={() => navigateHour(1)} aria-label="Next hour" className="flex h-9 w-9 items-center justify-center rounded-full" style={{ background: 'color-mix(in srgb, var(--e-canvas) 12%, transparent)' }}>
                            <ChevronRight className="h-4 w-4" />
                        </button>
                    </div>
                    <div className="mt-4 flex justify-center">
                        <span className="inline-flex items-center gap-1 rounded-full px-3 py-1 text-[12px] font-bold" style={{ background: selectedVsAvg >= 0 ? 'hsl(var(--accent-primary))' : 'color-mix(in srgb, var(--e-canvas) 14%, transparent)', color: selectedVsAvg >= 0 ? '#fff' : 'var(--e-canvas)' }}>
                            {selectedVsAvg >= 0 ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
                            {selectedVsAvg >= 0 ? '+' : ''}{selectedVsAvg.toFixed(1)}% vs avg
                        </span>
                    </div>
                    <div className="mt-4 grid grid-cols-2 gap-2">
                        {hourStats.map((x) => (
                            <div key={x.k} className="rounded-[16px] px-3 py-2.5" style={{ background: 'color-mix(in srgb, var(--e-canvas) 8%, transparent)' }}>
                                <div className="text-[11px] opacity-60">{x.k}</div>
                                <div className="text-[20px] font-medium tabular-nums tracking-[-0.03em]" style={{ fontFamily: 'var(--font-display)' }}>{x.v}</div>
                            </div>
                        ))}
                    </div>
                    <div className="mt-auto grid grid-cols-3 gap-2 pt-4 text-center text-[11px]">
                        <div><div className="opacity-55">Samples</div><div className="font-bold">{selectedStats.count}</div></div>
                        <div><div className="opacity-55">Per sample</div><div className="font-bold">{Math.round(avgPerDataPoint).toLocaleString()}</div></div>
                        <div><div className="opacity-55">Of total</div><div className="font-bold">{overallTotal > 0 ? ((selectedStats.total / overallTotal) * 100).toFixed(1) : 0}%</div></div>
                    </div>
                </div>
            </div>

            <div className="flex items-center justify-between gap-2 px-5 pb-5 text-[12px] md:px-7" style={{ color: 'var(--e-ink-3)' }}>
                <span>Peak {formatHourShort(peakHour)} · Lowest {formatHourShort(lowestHour)}</span>
                <span className="flex items-center gap-1 font-bold" style={{ color: trendDirection === 'up' ? 'var(--e-mint)' : trendDirection === 'down' ? 'var(--e-red)' : 'var(--e-ink-2)' }}>
                    {trendDirection === 'up' ? <TrendingUp className="h-3.5 w-3.5" /> : trendDirection === 'down' ? <TrendingDown className="h-3.5 w-3.5" /> : <Activity className="h-3.5 w-3.5" />}
                    {trendDirection === 'up' ? 'Rising through the day' : trendDirection === 'down' ? 'Falling through the day' : 'Flat through the day'}
                </span>
            </div>
        </div>
    );
});
