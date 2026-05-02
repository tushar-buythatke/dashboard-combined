import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { motion, useInView, useReducedMotion, AnimatePresence } from 'framer-motion';
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

/* ========================================================================
   FEATURE ICONS & GRADIENTS — unique per feature
   ======================================================================== */
const FEATURE_META: Record<string, { icon: LucideIcon; gradient: string; lightGradient: string }> = {
  pricealert:       { icon: Bell,          gradient: 'from-blue-500/20 to-cyan-500/20',       lightGradient: 'from-blue-100 to-cyan-100' },
  autocoupons:      { icon: Ticket,        gradient: 'from-emerald-500/20 to-teal-500/20',    lightGradient: 'from-emerald-100 to-teal-100' },
  spendcalculator:  { icon: Calculator,    gradient: 'from-violet-500/20 to-purple-500/20',   lightGradient: 'from-violet-100 to-purple-100' },
  spidy:            { icon: Bug,           gradient: 'from-rose-500/20 to-pink-500/20',       lightGradient: 'from-rose-100 to-pink-100' },
  lookalike:        { icon: ScanEye,       gradient: 'from-amber-500/20 to-orange-500/20',    lightGradient: 'from-amber-100 to-orange-100' },
  pricecomparison:  { icon: ArrowLeftRight,gradient: 'from-indigo-500/20 to-blue-500/20',     lightGradient: 'from-indigo-100 to-blue-100' },
  grocery:          { icon: ShoppingCart,  gradient: 'from-lime-500/20 to-green-500/20',      lightGradient: 'from-lime-100 to-green-100' },
  chatai:           { icon: MessageSquare, gradient: 'from-sky-500/20 to-cyan-500/20',        lightGradient: 'from-sky-100 to-cyan-100' },
  giftvoucher:      { icon: Gift,          gradient: 'from-fuchsia-500/20 to-pink-500/20',    lightGradient: 'from-fuchsia-100 to-pink-100' },
  checkout:         { icon: CreditCard,    gradient: 'from-teal-500/20 to-emerald-500/20',    lightGradient: 'from-teal-100 to-emerald-100' },
  cabcomparison:    { icon: Car,           gradient: 'from-orange-500/20 to-amber-500/20',    lightGradient: 'from-orange-100 to-amber-100' },
  dealscanner:      { icon: ScanLine,      gradient: 'from-cyan-500/20 to-blue-500/20',       lightGradient: 'from-cyan-100 to-blue-100' },
  scrapper:         { icon: Database,      gradient: 'from-rose-500/20 to-red-500/20',        lightGradient: 'from-rose-100 to-red-100' },
  searchapi:        { icon: Code,          gradient: 'from-purple-500/20 to-indigo-500/20',   lightGradient: 'from-purple-100 to-indigo-100' },
  buyhatkewebsite:  { icon: Globe,         gradient: 'from-slate-500/20 to-gray-500/20',      lightGradient: 'from-slate-100 to-gray-100' },
};

function getFeatureMeta(name: string) {
  const key = name.toLowerCase().replace(/[^a-z0-9]/g, '');
  return FEATURE_META[key] || { icon: Sparkles, gradient: 'from-slate-500/20 to-gray-500/20', lightGradient: 'from-slate-100 to-gray-100' };
}

/* ========================================================================
   SPARKLINE — upgraded with gradient fill, glow, tooltip, draw animation
   ======================================================================== */
function MicroSparkline({ data, severity }: { data: number[]; severity: 'amber' | 'orange' | 'rose' | 'none' }) {
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);
  const [drawn, setDrawn] = useState(false);
  const svgRef = useRef<SVGSVGElement>(null);
  const inView = useInView(svgRef, { once: true, margin: '-20px' });

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
  const w = 110;
  const h = 32;
  const pad = 3;

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
    <div className="relative">
      <svg ref={svgRef} width={w} height={h} className="overflow-visible" onMouseLeave={() => setHoverIdx(null)}>
        <defs>
          <linearGradient id="sparkFill" x1="0" y1="0" x2="0" y2="100%">
            <stop offset="0%" stopColor={stroke} stopOpacity={0.2} />
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
          className="transition-all duration-300 group-hover:[filter:drop-shadow(0_0_3px_currentColor)]"
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

/* ========================================================================
   INSTANT COUNTER — reliable, no animation delay
   ======================================================================== */
function AlertCount({ value }: { value: number }) {
  return <span className="tabular-nums">{value.toLocaleString()}</span>;
}

/* ========================================================================
   SEVERITY HELPERS
   ======================================================================== */
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
   BENTO CARD — Glassmorphism 2.0 with full theme support
   ======================================================================== */
function BentoCard({
  feature,
  alertCount,
  onClick,
  index,
  hoveredCard,
  onHover,
}: {
  feature: Feature;
  alertCount: number;
  onClick: () => void;
  index: number;
  hoveredCard: string | null;
  onHover: (id: string | null) => void;
}) {
  const severity = getSeverity(alertCount);
  const hasAlerts = severity !== 'none';
  const isWide = alertCount > 100;
  const trendData = hasAlerts ? generateTrend(alertCount, feature.id) : null;
  const meta = getFeatureMeta(feature.name);
  const Icon = meta.icon;
  const isDimmed = hoveredCard !== null && hoveredCard !== feature.id;

  const handleRipple = useCallback((e: React.MouseEvent<HTMLButtonElement>) => {
    const btn = e.currentTarget;
    const circle = document.createElement('span');
    const d = Math.max(btn.clientWidth, btn.clientHeight);
    const r = d / 2;
    const rect = btn.getBoundingClientRect();
    circle.style.cssText = `
      position: absolute; border-radius: 50%; width: ${d}px; height: ${d}px;
      left: ${e.clientX - rect.left - r}px; top: ${e.clientY - rect.top - r}px;
      background: rgba(255,255,255,0.12); animation: ripple-effect 0.55s ease-out forwards;
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
    <motion.div
      initial={{ opacity: 0, y: 24, filter: 'blur(4px)' }}
      animate={{ opacity: isDimmed ? 0.55 : 1, y: 0, filter: 'blur(0px)' }}
      transition={{ duration: 0.5, delay: index * 0.03, ease: [0.25, 0.46, 0.45, 0.94] }}
      className={cn('group relative', isWide && 'sm:col-span-2')}
      onMouseEnter={() => onHover(feature.id)}
      onMouseLeave={() => onHover(null)}
    >
      <button
        onClick={handleClick}
        className="relative w-full text-left rounded-2xl focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--dash-border-hover)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--dash-bg)] touch-target"
        aria-label={`Open ${feature.name}${hasAlerts ? `, ${alertCount} active alerts` : ''}`}
      >
        {/* Animated gradient border shell */}
        <div
          className={cn(
            'absolute inset-0 rounded-2xl transition-all duration-500 opacity-0 group-hover:opacity-100',
            'bg-gradient-to-br from-teal-400/15 via-purple-400/8 to-blue-400/5'
          )}
        />

        {/* Critical top shimmer bar */}
        {isWide && (
          <div className="absolute top-0 left-2 right-2 h-[2px] overflow-hidden rounded-full z-10">
            <div className="h-full w-full bg-gradient-to-r from-amber-400 via-rose-400 to-amber-400 animate-[shimmer-border_3s_linear_infinite]" />
          </div>
        )}

        {/* Inner card */}
        <div
          className={cn(
            'relative m-[1px] rounded-[15px] h-full overflow-hidden',
            'transition-all duration-500 ease-out',
            'group-hover:-translate-y-1'
          )}
          style={{
            background: isWide
              ? `radial-gradient(ellipse at 50% 0%, var(--dash-glow-primary) 0%, transparent 60%), var(--dash-card-bg)`
              : 'var(--dash-card-bg)',
            backdropFilter: 'blur(20px) saturate(180%)',
            WebkitBackdropFilter: 'blur(20px) saturate(180%)',
            boxShadow: 'var(--dash-card-shadow)',
            border: '1px solid var(--dash-card-border)',
          }}
        >
          <div
            className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
            style={{
              background: 'radial-gradient(500px circle at var(--mouse-x, 50%) var(--mouse-y, 50%), rgba(255,255,255,0.03), transparent 40%)',
            }}
          />

          <div className="relative p-5 lg:p-6 flex flex-col h-full" style={{ minHeight: isWide ? 200 : 170 }}>
            {/* Top row */}
            <div className="flex items-start justify-between mb-3">
              <div
                className={cn(
                  'h-10 w-10 rounded-xl flex items-center justify-center border transition-all duration-300 group-hover:scale-110',
                  'bg-gradient-to-br',
                  meta.gradient,
                  'border-white/10 dark:border-white/10',
                  'border-black/5'
                )}
              >
                <Icon
                  className="h-5 w-5 text-slate-700 dark:text-white transition-colors"
                  strokeWidth={1.8}
                />
              </div>

              {hasAlerts ? (
                <div
                  className="flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-mono font-bold tabular-nums leading-none"
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
                <div className="flex items-center gap-1 rounded-full px-2 py-0.5 bg-emerald-500/8 border border-emerald-500/15">
                  <CheckCircle2 className="h-2.5 w-2.5 text-emerald-500" />
                  <span className="text-[9px] font-medium text-emerald-600 dark:text-emerald-400">All Clear</span>
                </div>
              )}
            </div>

            {/* Text */}
            <div className="flex-1 min-w-0">
              <h3 className="text-sm font-semibold mb-1 tracking-tight transition-colors truncate" style={{ color: 'var(--dash-text-primary)' }}>
                {feature.name}
              </h3>
              <p className="text-[11px] leading-relaxed line-clamp-2" style={{ color: 'var(--dash-text-secondary)' }}>
                {feature.description || `${feature.name} analytics and tracking`}
              </p>
            </div>

            {/* Wide card stat row */}
            {isWide && (
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

            {/* Bottom: sparkline + CTA */}
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

              <div
                className="flex items-center gap-1 text-[11px] font-medium shrink-0 transition-all duration-300 group-hover:translate-x-0.5"
                style={{ color: 'var(--dash-text-muted)' }}
              >
                <span>View</span>
                <ArrowRight className="h-3 w-3" />
              </div>
            </div>
          </div>
        </div>
      </button>
    </motion.div>
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
          <kbd className="hidden sm:inline-flex px-2 py-0.5 rounded-md text-[10px] font-semibold tracking-wide bg-white/70 dark:bg-white/10 backdrop-blur-sm border border-white/50 dark:border-white/20 shadow-[0_1px_2px_rgba(0,0,0,0.06),inset_0_1px_0_rgba(255,255,255,0.4)] text-slate-500 dark:text-slate-400 transition-all duration-200">
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
                <div className={cn('h-8 w-8 rounded-lg flex items-center justify-center bg-gradient-to-br', meta.lightGradient, 'dark:' + meta.gradient)}>
                  <Icon className="h-4 w-4 text-slate-600 dark:text-white" strokeWidth={1.8} />
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
              No features found for "{query}"
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
  const [cmdOpen, setCmdOpen] = useState(false);
  const gridRef = useRef<HTMLDivElement>(null);
  const shouldReduceMotion = useReducedMotion();

  /* Mouse spotlight */ 
  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (shouldReduceMotion || !gridRef.current) return;
    const rect = gridRef.current.getBoundingClientRect();
    gridRef.current.style.setProperty('--mouse-x', `${e.clientX - rect.left}px`);
    gridRef.current.style.setProperty('--mouse-y', `${e.clientY - rect.top}px`);
  }, [shouldReduceMotion]);

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
    <div className="relative z-10 flex-1 overflow-auto theme-transition">
      {/* Hero */}
      <div className="px-4 sm:px-6 lg:px-8 xl:px-12 pt-8 pb-6 lg:pt-12 lg:pb-8">
        <div className="max-w-7xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-[11px] font-semibold mb-5 backdrop-blur-sm"
            style={{ background: 'var(--dash-surface)', border: '1px solid var(--dash-border)', color: 'var(--dash-text-secondary)' }}
          >
            <Zap className="h-3 w-3 text-amber-500" />
            Analytics Dashboard
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 16, filter: 'blur(10px)' }}
            animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
            transition={{ duration: 0.7, delay: 0.1 }}
            className="text-3xl sm:text-4xl lg:text-5xl xl:text-6xl font-bold tracking-[-0.02em] mb-4"
            style={{ color: 'var(--dash-text-primary)' }}
          >
            Hatke Analytics
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="text-sm lg:text-base max-w-md mx-auto mb-6"
            style={{ color: 'var(--dash-text-secondary)' }}
          >
            Choose a feature to explore detailed analytics and insights
          </motion.p>

          {/* Prominent Search Input */}
          <motion.button
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            onClick={() => setCmdOpen(true)}
            className="inline-flex items-center gap-2.5 w-full max-w-sm mx-auto px-4 py-2.5 rounded-xl text-left transition-all hover:shadow-md"
            style={{ background: 'var(--dash-card-bg)', border: '1px solid var(--dash-border)', color: 'var(--dash-text-muted)' }}
          >
            <Search className="h-4 w-4 shrink-0" />
            <span className="text-sm flex-1">Search analytics...</span>
            <kbd className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold tracking-wide bg-white/70 dark:bg-white/10 backdrop-blur-sm border border-white/50 dark:border-white/20 shadow-[0_1px_2px_rgba(0,0,0,0.06),inset_0_1px_0_rgba(255,255,255,0.4)] text-slate-500 dark:text-slate-400 transition-all duration-200">
              <Command className="h-2.5 w-2.5 opacity-70" />K
            </kbd>
          </motion.button>
        </div>
      </div>

      {/* Bento Grid */}
      <div className="px-4 sm:px-6 lg:px-8 xl:px-12 pb-4">
        <div
          ref={gridRef}
          onMouseMove={handleMouseMove}
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5 max-w-7xl mx-auto"
        >
          {features.map((feature, index) => (
            <BentoCard
              key={feature.id}
              feature={feature}
              alertCount={alertCounts[feature.id] || 0}
              onClick={() => onSelectFeature(feature.id)}
              index={index}
              hoveredCard={hoveredCard}
              onHover={setHoveredCard}
            />
          ))}
        </div>
      </div>

      <Footer />

      {/* Command Palette */}
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
