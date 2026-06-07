import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import {
  Bell, Ticket, Calculator, Bug, ScanEye, ArrowLeftRight,
  ShoppingCart, MessageSquare, Gift, CreditCard, Car,
  ScanLine, Database, Code, Globe, ArrowRight, Zap,
  Loader2, Sparkles, TrendingUp, Search, CheckCircle2,
  Command
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { Feature } from '@/types/analytics';
import { cn } from '@/lib/utils';
import { apiService } from '@/services/apiService';
import { useOrganization } from '@/contexts/OrganizationContext';
import { useAnalyticsAuth } from '@/contexts/AnalyticsAuthContext';
import { useInView } from '@/hooks/useInView';
import RandomBackground from '@/components/ui/background';

/* ========================================================================
   CARD WASH PALETTES
   ======================================================================== */
const CARD_WASHES = [
  { light: 'rgba(167,139,250,0.06)', dark: 'rgba(139,92,246,0.07)' },
  { light: 'rgba(52,211,153,0.06)', dark: 'rgba(16,185,129,0.07)' },
  { light: 'rgba(56,189,248,0.06)', dark: 'rgba(14,165,233,0.07)' },
  { light: 'rgba(251,146,60,0.06)', dark: 'rgba(249,115,22,0.07)' },
  { light: 'rgba(251,113,133,0.06)', dark: 'rgba(244,63,94,0.07)' },
  { light: 'rgba(251,191,36,0.06)', dark: 'rgba(245,158,11,0.07)' },
  { light: 'rgba(196,181,253,0.07)', dark: 'rgba(167,139,250,0.08)' },
  { light: 'rgba(45,212,191,0.06)', dark: 'rgba(20,184,166,0.07)' },
];

/* ========================================================================
   ICON GRADIENT + GLOW
   ======================================================================== */
const FEATURE_META: Record<string, {
  icon: LucideIcon;
  iconGradient: [string, string];
  iconGlow: string;
  cardGradient: string;
  lightGradient: string;
}> = {
  pricealert:      { icon: Bell,           iconGradient: ['#3b82f6','#06b6d4'], iconGlow: 'rgba(59,130,246,0.22)',  cardGradient: 'from-blue-500/20 to-cyan-500/20',    lightGradient: 'from-blue-100 to-cyan-100' },
  autocoupons:     { icon: Ticket,         iconGradient: ['#10b981','#14b8a6'], iconGlow: 'rgba(16,185,129,0.22)',  cardGradient: 'from-emerald-500/20 to-teal-500/20', lightGradient: 'from-emerald-100 to-teal-100' },
  spendcalculator: { icon: Calculator,     iconGradient: ['#8b5cf6','#a855f7'], iconGlow: 'rgba(139,92,246,0.22)', cardGradient: 'from-violet-500/20 to-purple-500/20', lightGradient: 'from-violet-100 to-purple-100' },
  spidy:           { icon: Bug,            iconGradient: ['#f43f5e','#ec4899'], iconGlow: 'rgba(244,63,94,0.22)',  cardGradient: 'from-rose-500/20 to-pink-500/20',    lightGradient: 'from-rose-100 to-pink-100' },
  lookalike:       { icon: ScanEye,        iconGradient: ['#f59e0b','#f97316'], iconGlow: 'rgba(245,158,11,0.22)', cardGradient: 'from-amber-500/20 to-orange-500/20', lightGradient: 'from-amber-100 to-orange-100' },
  pricecomparison: { icon: ArrowLeftRight, iconGradient: ['#6366f1','#3b82f6'], iconGlow: 'rgba(99,102,241,0.22)', cardGradient: 'from-indigo-500/20 to-blue-500/20',  lightGradient: 'from-indigo-100 to-blue-100' },
  grocery:         { icon: ShoppingCart,   iconGradient: ['#84cc16','#22c55e'], iconGlow: 'rgba(132,204,22,0.22)', cardGradient: 'from-lime-500/20 to-green-500/20',   lightGradient: 'from-lime-100 to-green-100' },
  chatai:          { icon: MessageSquare,  iconGradient: ['#0ea5e9','#06b6d4'], iconGlow: 'rgba(14,165,233,0.22)', cardGradient: 'from-sky-500/20 to-cyan-500/20',     lightGradient: 'from-sky-100 to-cyan-100' },
  giftvoucher:     { icon: Gift,           iconGradient: ['#d946ef','#ec4899'], iconGlow: 'rgba(217,70,239,0.22)', cardGradient: 'from-fuchsia-500/20 to-pink-500/20', lightGradient: 'from-fuchsia-100 to-pink-100' },
  checkout:        { icon: CreditCard,     iconGradient: ['#14b8a6','#10b981'], iconGlow: 'rgba(20,184,166,0.22)', cardGradient: 'from-teal-500/20 to-emerald-500/20', lightGradient: 'from-teal-100 to-emerald-100' },
  cabcomparison:   { icon: Car,            iconGradient: ['#f97316','#f59e0b'], iconGlow: 'rgba(249,115,22,0.22)', cardGradient: 'from-orange-500/20 to-amber-500/20', lightGradient: 'from-orange-100 to-amber-100' },
  dealscanner:     { icon: ScanLine,       iconGradient: ['#06b6d4','#3b82f6'], iconGlow: 'rgba(6,182,212,0.22)',  cardGradient: 'from-cyan-500/20 to-blue-500/20',    lightGradient: 'from-cyan-100 to-blue-100' },
  scrapper:        { icon: Database,       iconGradient: ['#ef4444','#f43f5e'], iconGlow: 'rgba(239,68,68,0.22)',  cardGradient: 'from-rose-500/20 to-red-500/20',     lightGradient: 'from-rose-100 to-red-100' },
  searchapi:       { icon: Code,           iconGradient: ['#a855f7','#6366f1'], iconGlow: 'rgba(168,85,247,0.22)', cardGradient: 'from-purple-500/20 to-indigo-500/20', lightGradient: 'from-purple-100 to-indigo-100' },
  buyhatkewebsite: { icon: Globe,          iconGradient: ['#64748b','#475569'], iconGlow: 'rgba(100,116,139,0.22)',cardGradient: 'from-slate-500/20 to-gray-500/20',   lightGradient: 'from-slate-100 to-gray-100' },
};

function getFeatureMeta(name: string) {
  const key = name.toLowerCase().replace(/[^a-z0-9]/g, '');
  return FEATURE_META[key] || {
    icon: Sparkles,
    iconGradient: ['#6366f1', '#a855f7'] as [string, string],
    iconGlow: 'rgba(99,102,241,0.22)',
    cardGradient: 'from-slate-500/20 to-gray-500/20',
    lightGradient: 'from-slate-100 to-gray-100',
  };
}

/* ========================================================================
   SPARKLINE
   ======================================================================== */
function MicroSparkline({ data, severity }: { data: number[]; severity: 'amber' | 'orange' | 'rose' | 'none' }) {
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);
  const [drawn, setDrawn] = useState(false);
  const svgRef = useRef<SVGSVGElement>(null);
  const { ref: inViewRef, inView } = useInView<HTMLDivElement>({ threshold: 0.1 });

  useEffect(() => {
    if (inView) {
      const t = setTimeout(() => setDrawn(true), 100);
      return () => clearTimeout(t);
    }
  }, [inView]);

  if (severity === 'none') return null;

  const colorMap = {
    amber:  { stroke: 'var(--dash-spark-amber)' },
    orange: { stroke: 'var(--dash-spark-orange)' },
    rose:   { stroke: 'var(--dash-spark-rose)' },
  };
  const { stroke } = colorMap[severity];

  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;
  const w = 110, h = 32, pad = 3;

  const pts = data.map((v, i) => {
    const x = pad + (i / (data.length - 1)) * (w - 2 * pad);
    const y = h - pad - ((v - min) / range) * (h - 2 * pad);
    return [x, y] as const;
  });

  const line = pts.map(p => `${p[0]},${p[1]}`).join(' ');
  const area = `${pts[0][0]},${h} ${line} ${pts[pts.length - 1][0]},${h}`;
  const pathLen = pts.reduce((acc, p, i) => i === 0 ? 0 : acc + Math.hypot(p[0] - pts[i-1][0], p[1] - pts[i-1][1]), 0);

  const days = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];

  return (
    <div ref={inViewRef} className="relative">
      <svg
        ref={svgRef}
        width={w} height={h}
        className="overflow-visible"
        onMouseLeave={() => setHoverIdx(null)}
      >
        <defs>
          <linearGradient id="sparkFill" x1="0" y1="0" x2="0" y2="100%">
            <stop offset="0%" stopColor={stroke} stopOpacity={0.25} />
            <stop offset="100%" stopColor={stroke} stopOpacity={0} />
          </linearGradient>
        </defs>
        <polygon points={area} fill="url(#sparkFill)" />
        <polyline
          points={line}
          fill="none"
          stroke={stroke}
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeDasharray={drawn ? undefined : pathLen}
          strokeDashoffset={drawn ? 0 : pathLen}
          style={{ transition: 'stroke-dashoffset 1s ease-out' }}
        />
        {pts.map((p, i) => (
          <circle
            key={i}
            cx={p[0]} cy={p[1]} r="2.5"
            fill={stroke}
            className="cursor-pointer transition-opacity"
            opacity={hoverIdx === i ? 1 : 0}
            onMouseEnter={() => setHoverIdx(i)}
          />
        ))}
      </svg>
      <AnimatePresence>
        {hoverIdx !== null && (
          <motion.div
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 4 }}
            className="absolute -top-7 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded-md text-[9px] font-medium whitespace-nowrap pointer-events-none z-20"
            style={{ background: 'var(--dash-card-bg)', border: '1px solid var(--dash-border)', color: 'var(--dash-text-primary)' }}
          >
            {days[hoverIdx]}: {data[hoverIdx]} alerts
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function AlertCount({ value }: { value: number }) {
  return <span className="tabular-nums">{value.toLocaleString()}</span>;
}

function getSeverity(count: number): 'none' | 'amber' | 'orange' | 'rose' {
  if (count === 0) return 'none';
  if (count <= 10) return 'amber';
  if (count <= 100) return 'orange';
  return 'rose';
}

function generateTrend(count: number, featureId: string): number[] {
  const seed = featureId.split('').reduce((a, b) => a + b.charCodeAt(0), 0);
  return Array.from({ length: 7 }, (_, i) => {
    const r = Math.sin(seed + i * 1.7) * 0.5 + 0.5;
    return Math.max(1, Math.round(count * (0.12 + r * 0.18)));
  });
}

/* ========================================================================
   PREMIUM BENTO CARD
   ======================================================================== */
function BentoCard({
  feature,
  alertCount,
  onClick,
  index,
  hoveredCard,
  hoverArmedId,
  onHover,
}: {
  feature: Feature;
  alertCount: number;
  onClick: () => void;
  index: number;
  hoveredCard: string | null;
  hoverArmedId: string | null;
  onHover: (id: string | null) => void;
}) {
  const severity = getSeverity(alertCount);
  const hasAlerts = severity !== 'none';
  const trendData = hasAlerts ? generateTrend(alertCount, feature.id) : null;
  const meta = getFeatureMeta(feature.name);
  const Icon = meta.icon;
  const isDimmed = hoveredCard !== null && hoveredCard !== feature.id;
  const isBlurred = hoverArmedId !== null && hoverArmedId !== feature.id;
  const isBentoWide = index % 5 === 4;
  const washIndex = index % CARD_WASHES.length;

  const handleRipple = useCallback((e: React.MouseEvent<HTMLButtonElement>) => {
    const btn = e.currentTarget;
    const circle = document.createElement('span');
    const d = Math.max(btn.clientWidth, btn.clientHeight);
    const r = d / 2;
    const rect = btn.getBoundingClientRect();
    circle.style.cssText = `
      position: absolute; border-radius: 50%; width: ${d}px; height: ${d}px;
      left: ${e.clientX - rect.left - r}px; top: ${e.clientY - rect.top - r}px;
      background: rgba(255,255,255,0.10); animation: ripple-effect 0.55s ease-out forwards;
      pointer-events: none; z-index: 20;
    `;
    btn.appendChild(circle);
    setTimeout(() => circle.remove(), 600);
  }, []);

  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    handleRipple(e);
    onClick();
  };

  return (
    <div
      className={cn('group relative', isBentoWide && 'lg:col-span-2')}
      style={{
        opacity: isDimmed ? 0.52 : 1,
        transform: isDimmed ? 'scale(0.99)' : 'translateY(0px)',
        filter: isBlurred ? 'blur(8px)' : 'blur(0px)',
        transition: 'opacity 420ms var(--ease-out-expo), transform 420ms var(--ease-out-expo), filter 700ms var(--ease-out-expo)',
        willChange: 'opacity, transform, filter',
      }}
      onMouseEnter={() => onHover(feature.id)}
      onMouseLeave={() => onHover(null)}
    >
      <button
        onClick={handleClick}
        className="relative w-full text-left rounded-2xl focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-primary)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--dash-bg)]"
        aria-label={`Open ${feature.name}${hasAlerts ? `, ${alertCount} active alerts` : ''}`}
        style={{ minHeight: 44 }}
      >
        <style>{`
          .bento-card-${feature.id}:hover .bento-inner-${feature.id} {
            transform: translateY(-4px) scale(1.01) !important;
            border-color: hsl(var(--accent-primary) / 0.35) !important;
            box-shadow: 0 0 0 1.5px hsl(var(--accent-primary) / 0.40), 0 16px 40px rgba(0,0,0,0.10), 0 4px 12px rgba(0,0,0,0.06) !important;
          }
          .dark .bento-card-${feature.id}:hover .bento-inner-${feature.id} {
            box-shadow: 0 0 0 1.5px hsl(var(--accent-primary) / 0.5), 0 16px 40px rgba(0,0,0,0.35), 0 4px 12px rgba(0,0,0,0.25) !important;
          }
          .bento-card-${feature.id}:hover .bento-view-arrow-${feature.id} {
            transform: translateX(4px) !important;
          }
          .bento-card-${feature.id}:hover .bento-view-text-${feature.id} {
            color: hsl(var(--accent-primary)) !important;
          }
        `}</style>

        <div className={`bento-card-${feature.id} relative w-full`}>
          <div
            className={`bento-inner-${feature.id} relative rounded-2xl overflow-hidden`}
            style={{
              background: `var(--dash-card-bg)`,
              backgroundImage: `radial-gradient(ellipse at 30% 20%, ${CARD_WASHES[washIndex].light} 0%, transparent 60%)`,
              backdropFilter: 'blur(12px) saturate(160%)',
              WebkitBackdropFilter: 'blur(12px) saturate(160%)',
              border: '1px solid var(--dash-card-border)',
              boxShadow: '0 1px 2px rgba(0,0,0,0.04), 0 8px 24px rgba(0,0,0,0.06)',
              transition: 'transform 280ms var(--ease-spring), box-shadow 280ms var(--ease-spring)',
            }}
          >
            <div
              className="absolute inset-0 pointer-events-none rounded-[15px] dark:opacity-100 opacity-0"
              style={{ backgroundImage: `radial-gradient(ellipse at 30% 20%, ${CARD_WASHES[washIndex].dark} 0%, transparent 60%)` }}
              aria-hidden="true"
            />

            <div className="relative p-5 lg:p-6 flex flex-col" style={{ minHeight: isBentoWide ? 200 : 172 }}>
              <div className="flex items-start justify-between mb-4">
                <div className="relative shrink-0 transition-transform duration-300 group-hover:scale-105" style={{ width: 52, height: 52 }}>
                  <div
                    className="absolute inset-0 rounded-full blur-md pointer-events-none"
                    style={{ background: meta.iconGlow, transform: 'scale(1.12)', opacity: 0.45 }}
                    aria-hidden="true"
                  />
                  <div
                    className="relative w-full h-full rounded-full flex items-center justify-center"
                    style={{
                      background: `linear-gradient(135deg, ${meta.iconGradient[0]}1f 0%, ${meta.iconGradient[1]}2b 100%)`,
                      border: `1px solid ${meta.iconGradient[0]}26`,
                      boxShadow: `inset 0 1px 0 rgba(255,255,255,0.15)`,
                    }}
                  >
                    <Icon style={{ color: meta.iconGradient[0], width: 22, height: 22 }} strokeWidth={1.7} />
                  </div>
                </div>

                {hasAlerts ? (
                  <div
                    className="flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-mono font-bold tabular-nums leading-none shrink-0"
                    style={{
                      background: severity === 'rose' ? 'var(--dash-alert-critical-bg)' : 'var(--dash-alert-bg)',
                      border: `1px solid ${severity === 'rose' ? 'var(--dash-alert-critical-border)' : 'var(--dash-alert-border)'}`,
                      color: severity === 'rose' ? 'var(--dash-alert-critical-text)' : 'var(--dash-alert-text)',
                    }}
                  >
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-60" style={{ background: severity === 'rose' ? 'var(--dash-alert-critical-text)' : 'var(--dash-alert-dot)' }} />
                      <span className="relative inline-flex rounded-full h-2 w-2" style={{ background: severity === 'rose' ? 'var(--dash-alert-critical-text)' : 'var(--dash-alert-dot)' }} />
                    </span>
                    <AlertCount value={alertCount} />
                  </div>
                ) : (
                  <div
                    className="flex items-center gap-1.5 rounded-full px-2.5 py-1 shrink-0"
                    style={{
                      backdropFilter: 'blur(8px)',
                      WebkitBackdropFilter: 'blur(8px)',
                      background: 'rgba(16,185,129,0.08)',
                      border: '1px solid rgba(16,185,129,0.18)',
                    }}
                  >
                    <span className="relative flex h-1.5 w-1.5">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                      <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500" />
                    </span>
                    <CheckCircle2 className="h-2.5 w-2.5 text-emerald-500" />
                    <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 leading-none">
                      All Clear
                    </span>
                  </div>
                )}
              </div>

              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-semibold mb-1 tracking-tight truncate" style={{ color: 'var(--dash-text-primary)' }}>
                  {feature.name}
                </h3>
                <p className="text-[11px] leading-relaxed line-clamp-2" style={{ color: 'var(--dash-text-secondary)' }}>
                  {feature.description || `${feature.name} analytics and tracking`}
                </p>
              </div>

              {isBentoWide && hasAlerts && (
                <div className="mt-3 flex items-center gap-3">
                  <div className="flex items-center gap-1 text-[10px]" style={{ color: 'var(--dash-text-muted)' }}>
                    <TrendingUp className="h-3 w-3 text-emerald-500" />
                    <span className="font-medium text-emerald-600 dark:text-emerald-400">↑ 12% vs last week</span>
                  </div>
                  <div className="h-3 w-px" style={{ background: 'var(--dash-border)' }} />
                  <div className="text-[10px] font-medium" style={{ color: 'var(--dash-text-muted)' }}>
                    Peak: <span className="font-bold" style={{ color: 'var(--dash-text-secondary)' }}>402/hr</span>
                  </div>
                </div>
              )}

              <div className="mt-4 pt-3 flex items-end justify-between gap-3" style={{ borderTop: '1px solid var(--dash-border)' }}>
                {trendData ? (
                  <div className="flex-1 min-w-0">
                    <MicroSparkline data={trendData} severity={severity} />
                    <div className="flex items-center gap-1 mt-1">
                      <TrendingUp className="h-2.5 w-2.5" style={{ color: 'var(--dash-text-muted)' }} />
                      <span className="text-[9px] font-medium" style={{ color: 'var(--dash-text-muted)' }}>7d trend</span>
                    </div>
                  </div>
                ) : (
                  <div />
                )}

                <div className="flex items-center gap-1 shrink-0">
                  <span className={`bento-view-text-${feature.id} text-[11px] font-semibold`} style={{ color: 'var(--dash-text-muted)', transition: 'color 200ms ease' }}>
                    View
                  </span>
                  <ArrowRight className={`bento-view-arrow-${feature.id} h-3 w-3`} style={{ color: 'var(--dash-text-muted)', transition: 'transform 200ms ease, color 200ms ease' }} />
                </div>
              </div>
            </div>
          </div>
        </div>
      </button>
    </div>
  );
}

/* ========================================================================
   COMMAND PALETTE
   ======================================================================== */
function CommandPalette({
  isOpen,
  onClose,
  features,
  onSelect,
}: {
  isOpen: boolean;
  onClose: () => void;
  features: Feature[];
  onSelect: (id: string) => void;
}) {
  const [query, setQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  const filtered = useMemo(() => {
    if (!query.trim()) return features;
    const q = query.toLowerCase();
    return features.filter(f => f.name.toLowerCase().includes(q));
  }, [query, features]);

  if (!isOpen) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[200] flex items-start justify-center pt-[15vh]"
      onClick={onClose}
    >
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" />
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 8 }}
        transition={{ duration: 0.15 }}
        className="relative w-full max-w-lg mx-4 rounded-2xl overflow-hidden shadow-2xl"
        style={{ background: 'var(--dash-card-bg)', backdropFilter: 'blur(24px)', border: '1px solid var(--dash-border)' }}
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 px-4 py-3.5" style={{ borderBottom: '1px solid var(--dash-border)' }}>
          <Search className="h-4 w-4 shrink-0" style={{ color: 'var(--dash-text-muted)' }} />
          <input
            ref={inputRef}
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search analytics features..."
            className="flex-1 bg-transparent text-sm outline-none placeholder:text-[var(--dash-text-muted)]"
            style={{ color: 'var(--dash-text-primary)' }}
          />
          <kbd className="hidden sm:inline-flex px-2 py-0.5 rounded-md text-[10px] font-semibold tracking-wide bg-white/70 dark:bg-white/10 backdrop-blur-sm border border-white/50 dark:border-white/20 shadow-[0_1px_2px_rgba(0,0,0,0.06),inset_0_1px_0_rgba(255,255,255,0.4)] text-slate-500 dark:text-slate-400">
            ESC
          </kbd>
        </div>
        <div className="max-h-[320px] overflow-y-auto py-2">
          {filtered.map((feature) => {
            const meta = getFeatureMeta(feature.name);
            const Icon = meta.icon;
            return (
              <button
                key={feature.id}
                onClick={() => { onSelect(feature.id); onClose(); }}
                className="w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors hover:bg-black/5 dark:hover:bg-white/5"
              >
                <div
                  className="h-8 w-8 rounded-lg flex items-center justify-center shrink-0"
                  style={{
                    background: `linear-gradient(135deg, ${meta.iconGradient[0]}22, ${meta.iconGradient[1]}33)`,
                    border: `1px solid ${meta.iconGradient[0]}25`,
                  }}
                >
                  <Icon style={{ color: meta.iconGradient[0], width: 15, height: 15 }} strokeWidth={1.8} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate" style={{ color: 'var(--dash-text-primary)' }}>{feature.name}</div>
                  <div className="text-[11px] truncate" style={{ color: 'var(--dash-text-secondary)' }}>{feature.description}</div>
                </div>
                <ArrowRight className="h-3.5 w-3.5 shrink-0" style={{ color: 'var(--dash-text-muted)' }} />
              </button>
            );
          })}
          {filtered.length === 0 && (
            <div className="px-4 py-8 text-center text-sm" style={{ color: 'var(--dash-text-muted)' }}>
              No features found for &quot;{query}&quot;
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}

/* ========================================================================
   FOOTER
   ======================================================================== */
function Footer() {
  return (
    <footer className="py-8 mt-4 text-center" style={{ borderTop: '1px solid var(--dash-border)' }}>
      <p className="text-[11px] font-medium" style={{ color: 'var(--dash-text-muted)' }}>
        © 2026 Buyhatke · Analytics Dashboard v2.0
      </p>
    </footer>
  );
}

/* ========================================================================
   MAIN COMPONENT
   ======================================================================== */
export function ModernFeatureSelector({
  onSelectFeature,
}: {
  onSelectFeature: (featureId: string) => void;
}) {
  const { selectedOrganization, loading: orgLoading } = useOrganization();
  const { user } = useAnalyticsAuth();
  const [features, setFeatures] = useState<Feature[]>([]);
  const [loading, setLoading] = useState(true);
  const [alertCounts, setAlertCounts] = useState<Record<string, number>>({});
  const [hoveredCard, setHoveredCard] = useState<string | null>(null);
  const [hoverArmedId, setHoverArmedId] = useState<string | null>(null);
  const [cmdOpen, setCmdOpen] = useState(false);
  const gridRef = useRef<HTMLDivElement>(null);
  const hoverTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const shouldReduceMotion = useReducedMotion();

  const handleHover = useCallback((id: string | null) => {
    setHoveredCard(id);
    if (hoverTimerRef.current) {
      clearTimeout(hoverTimerRef.current);
      hoverTimerRef.current = null;
    }
    if (id) {
      hoverTimerRef.current = setTimeout(() => {
        setHoverArmedId(id);
        hoverTimerRef.current = null;
      }, 3000);
    } else {
      setHoverArmedId(null);
    }
  }, []);

  useEffect(() => {
    return () => {
      if (hoverTimerRef.current) clearTimeout(hoverTimerRef.current);
    };
  }, []);

  /* Keyboard shortcuts */
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && (e.key === 'k' || e.key === 'K')) {
        e.preventDefault();
        setCmdOpen(prev => !prev);
      }
      if (e.key === 'Escape') setCmdOpen(false);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  /* Load features */
  useEffect(() => {
    if (orgLoading) return;
    const load = async () => {
      setLoading(true);
      try {
        const orgId = selectedOrganization?.id ?? 0;
        const list = await apiService.getFeaturesList(orgId);
        let mapped: Feature[] = list.map((f) => ({
          id: f.id.toString(),
          name: f.name,
          description: `${f.name} analytics and tracking`,
        }));
        if (user?.role !== 1 && user?.permissions?.features && Object.keys(user.permissions.features).length > 0) {
          mapped = mapped.filter((f) => !!user?.permissions?.features?.[String(f.id)]);
        }
        setFeatures(mapped);
      } catch (err) {
        console.error('Failed to load features', err);
        setFeatures([]);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [selectedOrganization?.id, user?.role, user?.permissions, orgLoading]);

  /* Load alert counts */
  useEffect(() => {
    const loadAlerts = async () => {
      if (!features.length) return;
      try {
        const orgId = selectedOrganization?.id ?? 0;
        const cacheKey = `feature_alert_counts_v2_${orgId}`;
        const CACHE_TTL = 10 * 60 * 1000;
        try {
          const raw = localStorage.getItem(cacheKey);
          if (raw) {
            const cached = JSON.parse(raw) as { updatedAt: number; counts: Record<string, number> };
            if (Date.now() - cached.updatedAt < CACHE_TTL) {
              setAlertCounts(cached.counts || {});
              return;
            }
          }
        } catch { /* ignore */ }

        const featureEventMap: Record<string, { regular: number[]; api: number[] }> = {};
        await Promise.all(features.map(async (f) => {
          try {
            const events = await apiService.getEventsList(f.id, orgId);
            featureEventMap[f.id] = {
              regular: events.filter((e) => !e.isApiEvent).map((e) => parseInt(e.eventId)),
              api: events.filter((e) => e.isApiEvent).map((e) => parseInt(e.eventId)),
            };
          } catch (err) { console.warn(`Failed events for ${f.id}:`, err); }
        }));

        const allReg = Object.values(featureEventMap).flatMap((f) => f.regular);
        const allApi = Object.values(featureEventMap).flatMap((f) => f.api);
        const end = new Date();
        const start = new Date(); start.setDate(start.getDate() - 7);

        const [regCounts, apiCounts]: [Record<string, number>, Record<string, number>] = await Promise.all([
          allReg.length > 0 ? apiService.getAlertList(allReg, start, end, true, 0) : Promise.resolve<Record<string, number>>({}),
          allApi.length > 0 ? apiService.getAlertList(allApi, start, end, true, 1) : Promise.resolve<Record<string, number>>({}),
        ]);

        const counts: Record<string, number> = {};
        features.forEach((f) => {
          const ev = featureEventMap[f.id];
          let total = 0;
          if (ev) {
            ev.regular.forEach((id) => (total += regCounts[String(id)] || 0));
            ev.api.forEach((id) => (total += apiCounts[String(id)] || 0));
          }
          counts[f.id] = total;
        });
        setAlertCounts(counts);
        try { localStorage.setItem(cacheKey, JSON.stringify({ updatedAt: Date.now(), counts })); } catch { /* ignore */ }
      } catch (err) { console.error('Failed alert counts:', err); }
    };
    loadAlerts();
  }, [features, selectedOrganization?.id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-8 w-8 animate-spin" style={{ color: 'var(--dash-text-muted)' }} />
      </div>
    );
  }

  if (!features.length) {
    return (
      <div className="flex flex-col items-center justify-center py-24">
        <Sparkles className="h-10 w-10 mb-3" style={{ color: 'var(--dash-text-muted)' }} />
        <p className="text-sm font-medium" style={{ color: 'var(--dash-text-secondary)' }}>No features available</p>
        <p className="text-xs mt-1" style={{ color: 'var(--dash-text-muted)' }}>Check your permissions or contact an admin</p>
      </div>
    );
  }

  return (
    /*
     * RandomBackground is `position: fixed` and covers the full viewport on its
     * own. The wrapper no longer needs an opaque page bg — keeping it
     * transparent lets the fixed canvas show through the content area while
     * the navbar (with its own opaque color) still sits cleanly on top.
     */
    <div
      className="relative flex-1 overflow-auto theme-transition"
      style={{ isolation: 'isolate', background: 'transparent' }}
    >
      <RandomBackground />

      {/* ── Hero Section ── */}
      <div className="relative w-full min-h-[320px] flex flex-col justify-center pt-2 pb-6" style={{ zIndex: 1 }}>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 xl:px-12 w-full mt-auto mb-auto">
          <div className="relative text-center py-2">
            {/* Badge */}
            <motion.div
              initial={shouldReduceMotion ? false : { opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-[11px] font-semibold mb-5 backdrop-blur-sm"
              style={{ background: 'var(--dash-surface)', border: '1px solid var(--dash-border)', color: 'var(--dash-text-secondary)' }}
            >
              <Zap className="h-3 w-3 text-amber-500" />
              Analytics Dashboard
            </motion.div>

            {/* Heading */}
            <motion.h1
              initial={shouldReduceMotion ? false : { opacity: 0, y: 16, filter: 'blur(10px)' }}
              animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
              transition={{ duration: 0.7, delay: 0.1 }}
              className="relative font-display text-4xl sm:text-5xl lg:text-6xl xl:text-7xl font-extrabold tracking-[-0.035em] mb-4 bg-clip-text text-transparent"
              style={{
                // Noise texture blended INTO the accent gradient, clipped to the letters
                backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E"), var(--accent-gradient)`,
                backgroundBlendMode: 'overlay',
                backgroundSize: '150px 150px, cover',
                // Dual halo: white outline pops on dark/colored bg, dark outline on light bg —
                // so the letters stay crisply visible even when the bg matches the text color.
                filter: 'drop-shadow(0 0 1px rgba(255,255,255,0.9)) drop-shadow(0 0 2px rgba(255,255,255,0.6)) drop-shadow(0 1.5px 1.5px rgba(0,0,0,0.32)) drop-shadow(0 6px 20px var(--accent-glow))',
              }}
            >
              Hatke Analytics
            </motion.h1>

            <motion.p
              initial={shouldReduceMotion ? false : { opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="text-sm lg:text-base max-w-md mx-auto mb-6 font-medium"
              style={{ color: 'var(--dash-text-primary)', textShadow: 'var(--dash-hero-text-shadow)' }}
            >
              Choose a feature to explore detailed analytics and insights
            </motion.p>

            {/* Search trigger */}
            <motion.button
              initial={shouldReduceMotion ? false : { opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.3 }}
              onClick={() => setCmdOpen(true)}
              className="inline-flex items-center gap-2.5 w-full max-w-sm mx-auto px-4 py-2.5 rounded-xl text-left transition-all hover:shadow-md"
              style={{
                background: 'var(--dash-card-bg)',
                border: '1px solid var(--dash-border)',
                color: 'var(--dash-text-muted)',
                minHeight: 44,
              }}
            >
              <Search className="h-4 w-4 shrink-0" />
              <span className="text-sm flex-1">Search analytics...</span>
              <kbd className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold tracking-wide bg-white/70 dark:bg-white/10 backdrop-blur-sm border border-white/50 dark:border-white/20 shadow-[0_1px_2px_rgba(0,0,0,0.06),inset_0_1px_0_rgba(255,255,255,0.4)] text-slate-500 dark:text-slate-400">
                <Command className="h-2.5 w-2.5 opacity-70" />K
              </kbd>
            </motion.button>
          </div>
        </div>
      </div>

      {/* ── Bento Feature Grid ── */}
      <div className="relative px-4 sm:px-6 lg:px-8 xl:px-12 pb-4" style={{ zIndex: 1 }}>
        <div
          ref={gridRef}
          className={cn('grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 max-w-7xl mx-auto')}
        >
          {features.map((feature, index) => (
            <BentoCard
              key={feature.id}
              feature={feature}
              alertCount={alertCounts[feature.id] || 0}
              onClick={() => onSelectFeature(feature.id)}
              index={index}
              hoveredCard={hoveredCard}
              hoverArmedId={hoverArmedId}
              onHover={handleHover}
            />
          ))}
        </div>
      </div>

      <div className="relative" style={{ zIndex: 1 }}>
        <Footer />
      </div>

      {/* ── Command Palette ── */}
      <AnimatePresence>
        {cmdOpen && (
          <CommandPalette
            isOpen={cmdOpen}
            onClose={() => setCmdOpen(false)}
            features={features}
            onSelect={onSelectFeature}
          />
        )}
      </AnimatePresence>
    </div>
  );
}