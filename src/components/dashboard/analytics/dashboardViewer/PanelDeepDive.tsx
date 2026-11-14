import { useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Activity, ArrowDownRight, ArrowUpRight, Crown, Flame, Grid3x3, HeartPulse, Trophy } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { EventKeyInfo } from './types';

type Tab = 'heat' | 'leaders' | 'momentum' | 'pulse' | 'health';

const TABS: { key: Tab; label: string; icon: typeof Trophy }[] = [
    { key: 'heat', label: 'Heat grid', icon: Grid3x3 },
    { key: 'leaders', label: 'Leaderboard', icon: Trophy },
    { key: 'momentum', label: 'Momentum', icon: Flame },
    { key: 'pulse', label: 'Pulse', icon: Activity },
    { key: 'health', label: 'Health', icon: HeartPulse },
];

const fmt = (n: number) => {
    if (!Number.isFinite(n)) return '0';
    const a = Math.abs(n);
    if (a >= 1e9) return `${(n / 1e9).toFixed(1)}B`;
    if (a >= 1e6) return `${(n / 1e6).toFixed(1)}M`;
    if (a >= 1e3) return `${(n / 1e3).toFixed(1)}K`;
    return Math.round(n).toLocaleString();
};

interface Point {
    t: Date;
    day: string;
    hour: number;
    total: number;
    success: number;
    fail: number;
    byEvent: Record<string, { count: number; success: number; fail: number }>;
}

function toDate(item: any): Date | null {
    const raw = item?.timestamp ?? item?.date;
    let d = raw instanceof Date ? raw : new Date(raw);
    if (Number.isNaN(d.getTime()) && typeof raw === 'string' && !/\b(19|20)\d{2}\b/.test(raw)) {
        d = new Date(`${raw} ${new Date().getFullYear()}`);
    }
    return Number.isNaN(d.getTime()) ? null : d;
}

function usePoints(graphData: any[], eventKeys: EventKeyInfo[]) {
    return useMemo(() => {
        const pts: Point[] = [];
        for (const item of graphData || []) {
            const t = toDate(item);
            if (!t) continue;
            const byEvent: Point['byEvent'] = {};
            for (const ek of eventKeys) {
                byEvent[ek.eventKey] = {
                    count: Number(item[`${ek.eventKey}_count`] ?? item[ek.eventKey]) || 0,
                    success: Number(item[`${ek.eventKey}_success`]) || 0,
                    fail: Number(item[`${ek.eventKey}_fail`]) || 0,
                };
            }
            pts.push({
                t,
                day: t.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
                hour: Number.isFinite(Number(item?.hour)) ? Number(item.hour) : t.getHours(),
                total: Number(item.count) || 0,
                success: Number(item.successCount) || 0,
                fail: Number(item.failCount) || 0,
                byEvent,
            });
        }
        return pts.sort((a, b) => a.t.getTime() - b.t.getTime());
    }, [graphData, eventKeys]);
}

function Spark({ values }: { values: number[] }) {
    if (values.length < 2) return <span className="block h-7 w-24" />;
    const max = Math.max(...values, 1);
    const pts = values.map((v, i) => `${(i / (values.length - 1)) * 96},${26 - (v / max) * 24}`).join(' ');
    return (
        <svg viewBox="0 0 96 28" className="h-7 w-24 overflow-visible" preserveAspectRatio="none">
            <polyline points={`0,28 ${pts} 96,28`} fill="hsl(var(--accent-primary) / 0.14)" stroke="none" />
            <polyline points={pts} fill="none" stroke="hsl(var(--accent-primary))" strokeWidth="1.8" strokeLinejoin="round" strokeLinecap="round" />
        </svg>
    );
}

function HeatGrid({ pts, eventKeys, isHourly }: { pts: Point[]; eventKeys: EventKeyInfo[]; isHourly: boolean }) {
    const [hover, setHover] = useState<string | null>(null);
    if (isHourly) {
        const days = [...new Set(pts.map((p) => p.day))].slice(-8);
        const grid = days.map((d) => Array.from({ length: 24 }, (_, h) => pts.filter((p) => p.day === d && p.hour === h).reduce((a, p) => a + p.total, 0)));
        const max = Math.max(1, ...grid.flat());
        return (
            <div>
                <p className="mb-3 h-5 text-[12.5px]" style={{ color: 'var(--e-ink-3)' }}>{hover ?? 'Each cell is one hour. Darker = more events.'}</p>
                <div className="overflow-x-auto pb-1">
                    <div className="min-w-[620px] space-y-[5px]">
                        {grid.map((row, r) => (
                            <div key={days[r]} className="grid items-center gap-3" style={{ gridTemplateColumns: '64px 1fr' }}>
                                <span className="text-[12px] font-bold" style={{ color: 'var(--e-ink-2)' }}>{days[r]}</span>
                                <div className="grid gap-[5px]" style={{ gridTemplateColumns: 'repeat(24, minmax(0,1fr))' }}>
                                    {row.map((v, h) => (
                                        <span
                                            key={h}
                                            onMouseEnter={() => setHover(`${days[r]} · ${h}:00 · ${fmt(v)} events`)}
                                            onMouseLeave={() => setHover(null)}
                                            className="aspect-square rounded-[6px] transition-transform duration-150 hover:scale-[1.3] hover:shadow-[0_6px_16px_-4px_hsl(var(--accent-primary)/0.6)]"
                                            style={{ background: v === 0 ? 'var(--e-surface-3)' : `hsl(var(--accent-primary) / ${0.12 + (v / max) * 0.88})` }}
                                        />
                                    ))}
                                </div>
                            </div>
                        ))}
                        <div className="grid gap-3" style={{ gridTemplateColumns: '64px 1fr' }}>
                            <span />
                            <div className="grid gap-[5px] text-center text-[10px]" style={{ gridTemplateColumns: 'repeat(24, minmax(0,1fr))', color: 'var(--e-ink-3)' }}>
                                {Array.from({ length: 24 }, (_, h) => <span key={h}>{h % 3 === 0 ? h : ''}</span>)}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    }
    const days = [...new Set(pts.map((p) => p.day))];
    const rows = eventKeys.slice(0, 12);
    const val = (ek: EventKeyInfo, d: string) => pts.filter((p) => p.day === d).reduce((a, p) => a + (p.byEvent[ek.eventKey]?.count || 0), 0);
    const max = Math.max(1, ...rows.flatMap((ek) => days.map((d) => val(ek, d))));
    const step = Math.ceil(days.length / 8);
    return (
        <div>
            <p className="mb-3 h-5 text-[12.5px]" style={{ color: 'var(--e-ink-3)' }}>{hover ?? 'Events by day. Darker = more volume.'}</p>
            <div className="overflow-x-auto pb-1">
                <div className="min-w-[620px] space-y-[5px]">
                    {rows.map((ek) => (
                        <div key={ek.eventKey} className="grid items-center gap-3" style={{ gridTemplateColumns: '160px 1fr' }}>
                            <span className="truncate text-[12px] font-bold" style={{ color: 'var(--e-ink-2)' }} title={ek.eventName}>{ek.eventName}</span>
                            <div className="grid gap-[5px]" style={{ gridTemplateColumns: `repeat(${days.length}, minmax(0,1fr))` }}>
                                {days.map((d) => {
                                    const v = val(ek, d);
                                    return (
                                        <span
                                            key={d}
                                            onMouseEnter={() => setHover(`${ek.eventName} · ${d} · ${fmt(v)}`)}
                                            onMouseLeave={() => setHover(null)}
                                            className="h-[18px] rounded-[6px] transition-transform duration-150 hover:scale-y-[1.35] hover:shadow-[0_6px_16px_-4px_hsl(var(--accent-primary)/0.6)]"
                                            style={{ background: v === 0 ? 'var(--e-surface-3)' : `hsl(var(--accent-primary) / ${0.12 + (v / max) * 0.88})` }}
                                        />
                                    );
                                })}
                            </div>
                        </div>
                    ))}
                    <div className="grid gap-3" style={{ gridTemplateColumns: '160px 1fr' }}>
                        <span />
                        <div className="grid gap-[5px] text-center text-[10px]" style={{ gridTemplateColumns: `repeat(${days.length}, minmax(0,1fr))`, color: 'var(--e-ink-3)' }}>
                            {days.map((d, i) => <span key={d} className="truncate">{i % step === 0 ? d : ''}</span>)}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

function Leaders({ pts, eventKeys }: { pts: Point[]; eventKeys: EventKeyInfo[] }) {
    const rows = eventKeys
        .map((ek) => {
            const series = pts.map((p) => p.byEvent[ek.eventKey]?.count || 0);
            const total = series.reduce((a, v) => a + v, 0);
            const ok = pts.reduce((a, p) => a + (p.byEvent[ek.eventKey]?.success || 0), 0);
            return { ek, total, series, rate: total > 0 ? (ok / total) * 100 : 0 };
        })
        .filter((r) => r.total > 0)
        .sort((a, b) => b.total - a.total);
    const max = Math.max(1, ...rows.map((r) => r.total));
    const sum = rows.reduce((a, r) => a + r.total, 0) || 1;
    return (
        <div className="space-y-1.5">
            {rows.slice(0, 10).map((r, i) => (
                <motion.div
                    key={r.ek.eventKey}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.03 }}
                    className="grid grid-cols-[36px_minmax(0,1.2fr)_minmax(0,2fr)_96px_64px] items-center gap-4 rounded-[18px] px-3 py-2.5 transition-colors hover:bg-[var(--e-surface-2)] max-md:grid-cols-[36px_minmax(0,1fr)_64px]"
                >
                    <span
                        className="flex h-9 w-9 items-center justify-center rounded-full text-[13px] font-bold"
                        style={i === 0 ? { background: 'hsl(var(--accent-primary))', color: '#fff' } : i < 3 ? { background: 'var(--e-ink-pill)', color: 'var(--e-canvas)' } : { background: 'var(--e-surface-3)', color: 'var(--e-ink-2)' }}
                    >
                        {i === 0 ? <Crown className="h-4 w-4" /> : i + 1}
                    </span>
                    <div className="min-w-0">
                        <p className="truncate text-[14px] font-bold" style={{ color: 'var(--e-ink)' }} title={r.ek.eventName}>{r.ek.eventName}</p>
                        <p className="text-[11.5px] tabular-nums" style={{ color: 'var(--e-ink-3)' }}>{((r.total / sum) * 100).toFixed(1)}% of volume</p>
                    </div>
                    <div className="relative h-9 overflow-hidden rounded-full max-md:hidden" style={{ background: 'var(--e-surface-2)' }}>
                        <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${Math.max(2, (r.total / max) * 100)}%` }}
                            transition={{ duration: 0.8, delay: i * 0.03, ease: [0.22, 1, 0.36, 1] }}
                            className={cn('h-full rounded-full', i === 0 ? '' : 'e-hatch')}
                            style={i === 0 ? { background: 'hsl(var(--accent-primary))' } : { color: 'hsl(var(--accent-primary) / 0.35)', background: 'hsl(var(--accent-primary) / 0.08)' }}
                        />
                        <span className="absolute inset-y-0 left-1 flex items-center">
                            <span className="rounded-full px-3 py-1 text-[12.5px] font-bold tabular-nums" style={{ background: 'var(--e-surface)', color: 'var(--e-ink)', boxShadow: '0 4px 10px -4px rgba(0,0,0,.25)' }}>{fmt(r.total)}</span>
                        </span>
                    </div>
                    <span className="max-md:hidden"><Spark values={r.series} /></span>
                    <span className="justify-self-end rounded-full px-2.5 py-1 text-[11.5px] font-bold tabular-nums" style={{ background: `color-mix(in srgb, ${r.rate >= 90 ? 'var(--e-mint)' : r.rate >= 70 ? 'var(--e-amber)' : 'var(--e-red)'} 14%, transparent)`, color: r.rate >= 90 ? 'var(--e-mint)' : r.rate >= 70 ? 'var(--e-amber)' : 'var(--e-red)' }}>
                        {r.rate.toFixed(0)}%
                    </span>
                </motion.div>
            ))}
            {rows.length === 0 && <p className="py-10 text-center text-[13px]" style={{ color: 'var(--e-ink-3)' }}>No volume in this range.</p>}
        </div>
    );
}

function Momentum({ pts, eventKeys }: { pts: Point[]; eventKeys: EventKeyInfo[] }) {
    const k = Math.max(1, Math.floor(pts.length / 3));
    const moves = eventKeys
        .map((ek) => {
            const s = pts.map((p) => p.byEvent[ek.eventKey]?.count || 0);
            if (s.length < 2) return null;
            const avg = (a: number[]) => a.reduce((x, y) => x + y, 0) / Math.max(a.length, 1);
            const before = avg(s.slice(0, k));
            const after = avg(s.slice(-k));
            if (!before && !after) return null;
            return { ek, change: before === 0 ? 100 : ((after - before) / before) * 100, after, s };
        })
        .filter((m): m is NonNullable<typeof m> => m !== null);
    const up = [...moves].sort((a, b) => b.change - a.change).filter((m) => m.change > 0).slice(0, 5);
    const down = [...moves].sort((a, b) => a.change - b.change).filter((m) => m.change < 0).slice(0, 5);
    const col = (title: string, list: typeof moves, isUp: boolean) => (
        <div className="rounded-[22px] p-4" style={{ background: 'var(--e-surface-2)' }}>
            <div className="mb-3 flex items-center gap-2">
                <span className="flex h-8 w-8 items-center justify-center rounded-full text-white" style={{ background: isUp ? 'var(--e-mint)' : 'var(--e-red)' }}>
                    {isUp ? <ArrowUpRight className="h-4 w-4" /> : <ArrowDownRight className="h-4 w-4" />}
                </span>
                <p className="text-[18px] font-medium" style={{ fontFamily: 'var(--font-display)', color: 'var(--e-ink)' }}>{title}</p>
            </div>
            {list.length === 0 ? (
                <p className="py-6 text-[12.5px]" style={{ color: 'var(--e-ink-3)' }}>Nothing moving this way.</p>
            ) : (
                <div className="space-y-1">
                    {list.map((m) => (
                        <div key={m.ek.eventKey} className="flex items-center gap-3 rounded-[14px] px-3 py-2.5" style={{ background: 'var(--e-surface)' }}>
                            <div className="min-w-0 flex-1">
                                <p className="truncate text-[13px] font-bold" style={{ color: 'var(--e-ink)' }}>{m.ek.eventName}</p>
                                <p className="text-[11px] tabular-nums" style={{ color: 'var(--e-ink-3)' }}>now {fmt(m.after)} / interval</p>
                            </div>
                            <Spark values={m.s} />
                            <span className="w-16 text-right text-[14px] font-bold tabular-nums" style={{ color: isUp ? 'var(--e-mint)' : 'var(--e-red)' }}>
                                {isUp ? '+' : ''}{Math.abs(m.change) >= 1000 ? `${(m.change / 1000).toFixed(1)}k` : m.change.toFixed(0)}%
                            </span>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
    return <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">{col('Risers', up, true)}{col('Fallers', down, false)}</div>;
}

function Pulse({ pts }: { pts: Point[] }) {
    const series = pts.slice(-36);
    const max = Math.max(1, ...series.map((p) => p.total));
    const avg = series.reduce((a, p) => a + p.total, 0) / Math.max(series.length, 1);
    const peak = series.reduce((b, p) => (p.total > b.total ? p : b), series[0] ?? { total: 0, t: new Date(), day: '-', hour: 0 } as Point);
    const DOTS = 12;
    const label = (p: Point) => `${p.day}${series.length > 0 && new Set(series.map((x) => x.day)).size < series.length ? ` ${p.hour}:00` : ''}`;
    return (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[220px_1fr]">
            <div className="flex flex-col justify-between gap-4">
                <div>
                    <p className="text-[12px]" style={{ color: 'var(--e-ink-3)' }}>Average / interval</p>
                    <p className="text-[clamp(2.4rem,4vw,3.4rem)] font-medium leading-none tracking-[-0.04em] tabular-nums" style={{ fontFamily: 'var(--font-display)', color: 'var(--e-ink)' }}>{fmt(avg)}</p>
                </div>
                <div className="rounded-[18px] p-4" style={{ background: 'var(--e-ink-pill)', color: 'var(--e-canvas)' }}>
                    <p className="text-[11px] opacity-60">Peak</p>
                    <p className="text-[20px] font-bold tabular-nums">{fmt(peak?.total ?? 0)}</p>
                    <p className="text-[12px] opacity-70">{peak ? label(peak) : '-'}</p>
                </div>
            </div>
            <div className="overflow-x-auto">
                <div className="flex min-w-[520px] items-end gap-[6px]">
                    {series.map((p, i) => {
                        const lit = Math.round((p.total / max) * DOTS);
                        const isPeak = p === peak;
                        return (
                            <div key={i} className="group flex flex-1 flex-col items-center gap-[4px]" title={`${label(p)}: ${fmt(p.total)}`}>
                                {Array.from({ length: DOTS }).map((_, n) => {
                                    const on = DOTS - n <= lit;
                                    return (
                                        <motion.span
                                            key={n}
                                            initial={{ scale: 0 }}
                                            animate={{ scale: 1 }}
                                            transition={{ delay: i * 0.015 + (DOTS - n) * 0.012 }}
                                            className="aspect-square w-full max-w-[14px] rounded-full transition-colors"
                                            style={{ background: on ? (isPeak ? 'hsl(var(--accent-primary))' : 'hsl(var(--accent-primary) / 0.38)') : 'var(--e-surface-3)' }}
                                        />
                                    );
                                })}
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}

function Health({ pts, eventKeys }: { pts: Point[]; eventKeys: EventKeyInfo[] }) {
    const total = pts.reduce((a, p) => a + p.total, 0);
    const ok = pts.reduce((a, p) => a + p.success, 0);
    const fail = pts.reduce((a, p) => a + p.fail, 0);
    const rate = total > 0 ? (ok / total) * 100 : 0;
    const r = 70;
    const c = 2 * Math.PI * r;
    const failing = eventKeys
        .map((ek) => ({ ek, fail: pts.reduce((a, p) => a + (p.byEvent[ek.eventKey]?.fail || 0), 0), count: pts.reduce((a, p) => a + (p.byEvent[ek.eventKey]?.count || 0), 0) }))
        .filter((x) => x.fail > 0)
        .sort((a, b) => b.fail - a.fail)
        .slice(0, 5);
    const tone = rate >= 90 ? 'var(--e-mint)' : rate >= 70 ? 'var(--e-amber)' : 'var(--e-red)';
    return (
        <div className="grid grid-cols-1 items-center gap-6 lg:grid-cols-[260px_1fr]">
            <div className="relative mx-auto h-[190px] w-[190px]">
                <svg viewBox="0 0 160 160" className="h-full w-full -rotate-90">
                    <circle cx="80" cy="80" r={r} fill="none" stroke="var(--e-surface-3)" strokeWidth="14" />
                    <motion.circle
                        cx="80" cy="80" r={r} fill="none" stroke={tone} strokeWidth="14" strokeLinecap="round"
                        strokeDasharray={c}
                        initial={{ strokeDashoffset: c }}
                        animate={{ strokeDashoffset: c * (1 - rate / 100) }}
                        transition={{ duration: 1.1, ease: [0.22, 1, 0.36, 1] }}
                        style={{ filter: `drop-shadow(0 6px 12px ${tone})` }}
                    />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-[38px] font-medium leading-none tracking-[-0.04em] tabular-nums" style={{ fontFamily: 'var(--font-display)', color: 'var(--e-ink)' }}>{rate.toFixed(1)}%</span>
                    <span className="mt-1 text-[12px]" style={{ color: 'var(--e-ink-3)' }}>success rate</span>
                </div>
            </div>
            <div>
                <div className="grid grid-cols-3 gap-3">
                    {[{ k: 'Events', v: fmt(total) }, { k: 'Succeeded', v: fmt(ok), t: 'var(--e-mint)' }, { k: 'Failed', v: fmt(fail), t: fail ? 'var(--e-red)' : undefined }].map((x) => (
                        <div key={x.k} className="rounded-[18px] px-4 py-3" style={{ background: 'var(--e-surface-2)' }}>
                            <p className="text-[11.5px]" style={{ color: 'var(--e-ink-3)' }}>{x.k}</p>
                            <p className="text-[24px] font-medium tracking-[-0.03em] tabular-nums" style={{ fontFamily: 'var(--font-display)', color: x.t ?? 'var(--e-ink)' }}>{x.v}</p>
                        </div>
                    ))}
                </div>
                <p className="mb-2 mt-5 text-[13px] font-bold" style={{ color: 'var(--e-ink)' }}>Failing most</p>
                {failing.length === 0 ? (
                    <p className="text-[12.5px]" style={{ color: 'var(--e-ink-3)' }}>No failures in this range.</p>
                ) : (
                    <div className="space-y-2">
                        {failing.map((f) => (
                            <div key={f.ek.eventKey} className="flex items-center gap-3">
                                <span className="w-40 truncate text-[12.5px] font-bold" style={{ color: 'var(--e-ink-2)' }}>{f.ek.eventName}</span>
                                <span className="h-2 flex-1 overflow-hidden rounded-full" style={{ background: 'var(--e-surface-3)' }}>
                                    <motion.span className="block h-full rounded-full" style={{ background: 'var(--e-red)' }} initial={{ width: 0 }} animate={{ width: `${(f.fail / failing[0].fail) * 100}%` }} transition={{ duration: 0.8 }} />
                                </span>
                                <span className="w-14 text-right text-[12.5px] font-bold tabular-nums" style={{ color: 'var(--e-red)' }}>{fmt(f.fail)}</span>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}

function Insights({ pts, eventKeys, isHourly }: { pts: Point[]; eventKeys: EventKeyInfo[]; isHourly: boolean }) {
    const half = Math.floor(pts.length / 2);
    const sum = (a: Point[]) => a.reduce((x, p) => x + p.total, 0);
    const first = sum(pts.slice(0, half));
    const second = sum(pts.slice(half));
    const change = first > 0 ? ((second - first) / first) * 100 : 0;
    const peak = pts.reduce((b, p) => (p.total > b.total ? p : b), pts[0]);
    const riser = eventKeys
        .map((ek) => {
            const a = pts.slice(0, half).reduce((x, p) => x + (p.byEvent[ek.eventKey]?.count || 0), 0);
            const b = pts.slice(half).reduce((x, p) => x + (p.byEvent[ek.eventKey]?.count || 0), 0);
            return { ek, d: a > 0 ? ((b - a) / a) * 100 : 0, b };
        })
        .filter((x) => x.b > 0)
        .sort((x, y) => Math.abs(y.d) - Math.abs(x.d))[0];
    const total = sum(pts);
    const ok = pts.reduce((x, p) => x + p.success, 0);
    const rate = total > 0 ? (ok / total) * 100 : 0;
    return (
        <div className="grid grid-cols-1 gap-3 px-5 pt-5 md:px-7 lg:grid-cols-[1.3fr_1fr_1fr]">
            <div className="e-hero-card relative overflow-hidden rounded-[22px] p-5 text-white" style={{ boxShadow: '0 24px 50px -30px hsl(var(--accent-primary) / 0.7)' }}>
                <span className="inline-flex items-center gap-1.5 rounded-full border border-white/30 bg-white/10 px-2.5 py-0.5 text-[11px] font-bold">
                    <span className="h-1.5 w-1.5 rounded-full bg-white" /> Insight
                </span>
                <p className="mt-3 text-[clamp(2rem,3.2vw,2.8rem)] font-light leading-none tracking-[-0.05em] tabular-nums" style={{ fontFamily: 'var(--font-display)' }}>
                    {change >= 0 ? '+' : ''}{change.toFixed(1)}%
                </p>
                <p className="mt-2 text-[13.5px] font-medium leading-snug opacity-90">
                    Volume {change >= 0 ? 'climbed' : 'dropped'} in the second half of this range vs the first.
                </p>
            </div>
            <div className="rounded-[22px] p-5" style={{ background: 'var(--e-surface-2)' }}>
                <p className="text-[12px] font-bold" style={{ color: 'var(--e-ink-3)' }}>Busiest {isHourly ? 'hour' : 'day'}</p>
                <p className="mt-2 text-[26px] font-medium leading-none tracking-[-0.035em]" style={{ fontFamily: 'var(--font-display)', color: 'var(--e-ink)' }}>
                    {peak ? `${peak.day}${isHourly ? ` · ${peak.hour}:00` : ''}` : '-'}
                </p>
                <p className="mt-2 text-[12.5px] tabular-nums" style={{ color: 'var(--e-ink-3)' }}>{fmt(peak?.total ?? 0)} events · {rate.toFixed(1)}% success overall</p>
            </div>
            <div className="rounded-[22px] p-5" style={{ background: 'var(--e-surface-2)' }}>
                <p className="text-[12px] font-bold" style={{ color: 'var(--e-ink-3)' }}>Biggest mover</p>
                <p className="mt-2 truncate text-[20px] font-medium leading-tight tracking-[-0.02em]" style={{ fontFamily: 'var(--font-display)', color: 'var(--e-ink)' }} title={riser?.ek.eventName}>
                    {riser?.ek.eventName ?? '-'}
                </p>
                {riser && (
                    <p className="mt-2 text-[13px] font-bold tabular-nums" style={{ color: riser.d >= 0 ? 'var(--e-mint)' : 'var(--e-red)' }}>
                        {riser.d >= 0 ? '▲' : '▼'} {Math.abs(riser.d).toFixed(0)}% second half
                    </p>
                )}
            </div>
        </div>
    );
}

export function PanelDeepDive({ graphData, eventKeys, isHourly }: { graphData: any[]; eventKeys: EventKeyInfo[]; isHourly: boolean }) {
    const pts = usePoints(graphData, eventKeys);
    const [tab, setTab] = useState<Tab>('heat');
    if (pts.length < 2) return null;
    const days = new Set(pts.map((p) => p.day)).size;

    return (
        <div className="mt-5 overflow-hidden rounded-[28px]" style={{ background: 'var(--e-surface)', boxShadow: 'var(--dash-card-shadow)' }}>
            <div className="flex flex-col gap-4 px-5 pt-6 md:px-7 lg:flex-row lg:items-end lg:justify-between">
                <div>
                    <p className="text-[12px]" style={{ color: 'var(--e-ink-3)' }}>{eventKeys.length} event{eventKeys.length === 1 ? '' : 's'} · {days} day{days === 1 ? '' : 's'} · {isHourly ? 'hourly' : 'daily'}</p>
                    <h3 className="mt-1 text-[clamp(1.8rem,3vw,2.6rem)] font-medium leading-none tracking-[-0.035em]" style={{ fontFamily: 'var(--font-display)', color: 'var(--e-ink)' }}>
                        Deep <span style={{ color: 'hsl(var(--accent-primary))' }}>dive</span>
                    </h3>
                </div>
                <div className="flex gap-2 overflow-x-auto pb-1">
                    {TABS.map((t) => (
                        <button
                            key={t.key}
                            onClick={() => setTab(t.key)}
                            className="flex h-10 flex-none items-center gap-2 rounded-full px-4 text-[13px] font-bold transition-all"
                            style={tab === t.key
                                ? { background: 'var(--e-ink-pill)', color: 'var(--e-canvas)', boxShadow: '0 10px 22px -10px rgba(0,0,0,.5)' }
                                : { background: 'var(--e-surface-2)', color: 'var(--e-ink-2)' }}
                        >
                            <t.icon className="h-4 w-4" /> {t.label}
                        </button>
                    ))}
                </div>
            </div>
            <Insights pts={pts} eventKeys={eventKeys} isHourly={isHourly} />
            <div className="px-4 pb-7 pt-5 md:px-7">
                <AnimatePresence mode="wait">
                    <motion.div key={tab} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.22 }}>
                        {tab === 'heat' && <HeatGrid pts={pts} eventKeys={eventKeys} isHourly={isHourly} />}
                        {tab === 'leaders' && <Leaders pts={pts} eventKeys={eventKeys} />}
                        {tab === 'momentum' && <Momentum pts={pts} eventKeys={eventKeys} />}
                        {tab === 'pulse' && <Pulse pts={pts} />}
                        {tab === 'health' && <Health pts={pts} eventKeys={eventKeys} />}
                    </motion.div>
                </AnimatePresence>
            </div>
        </div>
    );
}
