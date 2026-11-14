import { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Bell, Ticket, Calculator, Bug, ScanEye, ArrowLeftRight,
  ShoppingCart, MessageSquare, Gift, CreditCard, Car,
  ScanLine, Database, Code, Globe, ArrowRight,
  Loader2, Sparkles, Search, CheckCircle2,
  Command
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { Feature } from '@/types/analytics';
import { apiService } from '@/services/apiService';
import { DotMatrix } from '@/components/ui/dot-matrix';
import { useOrganization } from '@/contexts/OrganizationContext';
import { useAnalyticsAuth } from '@/contexts/AnalyticsAuthContext';

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

function getSeverity(count: number): 'none' | 'amber' | 'orange' | 'rose' {
  if (count === 0) return 'none';
  if (count <= 10) return 'amber';
  if (count <= 100) return 'orange';
  return 'rose';
}

/* ========================================================================
   FEATURE CARD
   ======================================================================== */
const SEVERITY_STYLE = {
  none: { bg: 'rgba(20,163,95,0.10)', fg: 'var(--e-mint)', label: 'All clear' },
  amber: { bg: 'rgba(235,161,43,0.14)', fg: '#b7770f', label: 'alerts' },
  orange: { bg: 'rgba(229,96,63,0.12)', fg: '#e5603f', label: 'alerts' },
  rose: { bg: 'rgba(226,71,127,0.12)', fg: '#d0335f', label: 'alerts' },
} as const;

function FeatureCard({
  feature,
  alertCount,
  onClick,
  index,
}: {
  feature: Feature;
  alertCount: number;
  onClick: () => void;
  index: number;
}) {
  const severity = getSeverity(alertCount);
  const sev = SEVERITY_STYLE[severity];
  const meta = getFeatureMeta(feature.name);
  const Icon = meta.icon;
  const tone = meta.iconGradient[0];

  return (
    <motion.button
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: Math.min(index, 12) * 0.03, ease: [0.22, 1, 0.36, 1] }}
      onClick={onClick}
      aria-label={`Open ${feature.name}${alertCount ? `, ${alertCount} alerts in 7 days` : ''}`}
      className="group relative flex min-h-[188px] w-full flex-col rounded-[28px] p-5 text-left transition-all duration-300 hover:-translate-y-1 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--e-coral)]"
      style={{ background: 'var(--e-surface)', boxShadow: 'var(--dash-card-shadow)' }}
      onMouseEnter={(e) => (e.currentTarget.style.boxShadow = 'var(--dash-card-shadow-hover)')}
      onMouseLeave={(e) => (e.currentTarget.style.boxShadow = 'var(--dash-card-shadow)')}
    >
      <div className="flex items-start justify-between gap-3">
        <span
          className="flex h-12 w-12 items-center justify-center rounded-full transition-transform duration-300 group-hover:scale-110"
          style={{ background: `${tone}1a`, color: tone }}
        >
          <Icon className="h-[22px] w-[22px]" strokeWidth={1.8} />
        </span>
        <span
          className="inline-flex h-7 items-center gap-1.5 rounded-full px-3 text-[12px] font-bold tabular-nums"
          style={{ background: sev.bg, color: sev.fg }}
        >
          {severity === 'none' ? (
            <CheckCircle2 className="h-3.5 w-3.5" />
          ) : (
            <span className="relative flex h-2 w-2">
              <span className="absolute inset-0 animate-ping rounded-full opacity-60" style={{ background: sev.fg }} />
              <span className="relative h-2 w-2 rounded-full" style={{ background: sev.fg }} />
            </span>
          )}
          {severity === 'none' ? sev.label : `${alertCount.toLocaleString()} ${sev.label}`}
        </span>
      </div>

      <div className="mt-auto pt-6">
        <h3 className="truncate text-[21px] font-medium leading-tight tracking-[-0.02em]" style={{ color: 'var(--e-ink)', fontFamily: 'var(--font-display)' }}>
          {feature.name}
        </h3>
        <div className="mt-1 flex items-center justify-between gap-3">
          <p className="truncate text-[12.5px]" style={{ color: 'var(--e-ink-3)' }}>
            {severity === 'none' ? 'Quiet for 7 days' : 'Alerts in the last 7 days'}
          </p>
          <span
            className="flex h-9 w-9 flex-none -rotate-45 items-center justify-center rounded-full opacity-0 transition-all duration-300 group-hover:rotate-0 group-hover:opacity-100"
            style={{ background: 'var(--e-ink-pill)', color: 'var(--e-canvas)' }}
          >
            <ArrowRight className="h-4 w-4" />
          </span>
        </div>
      </div>
    </motion.button>
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
  alertCounts,
}: {
  isOpen: boolean;
  onClose: () => void;
  features: Feature[];
  onSelect: (id: string) => void;
  alertCounts: Record<string, number>;
}) {
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setActive(0);
      setTimeout(() => inputRef.current?.focus(), 30);
    }
  }, [isOpen]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return features;
    // Prefix matches first, then substring matches.
    const starts = features.filter((f) => f.name.toLowerCase().startsWith(q));
    const contains = features.filter((f) => !f.name.toLowerCase().startsWith(q) && f.name.toLowerCase().includes(q));
    return [...starts, ...contains];
  }, [query, features]);

  useEffect(() => { setActive(0); }, [query]);
  useEffect(() => {
    listRef.current?.querySelector<HTMLElement>(`[data-idx="${active}"]`)?.scrollIntoView({ block: 'nearest' });
  }, [active]);

  if (!isOpen) return null;

  const pick = (id: string) => { onSelect(id); onClose(); };
  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setActive((i) => Math.min(i + 1, filtered.length - 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActive((i) => Math.max(i - 1, 0)); }
    else if (e.key === 'Enter' && filtered[active]) { e.preventDefault(); pick(filtered[active].id); }
    else if (e.key === 'Escape') onClose();
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.12 }}
      className="fixed inset-0 z-[200] flex items-start justify-center px-4 pt-[12vh]"
      onClick={onClose}
    >
      <div className="absolute inset-0 bg-black/35 backdrop-blur-[6px]" />
      <motion.div
        initial={{ opacity: 0, scale: 0.97, y: -6 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.97, y: -6 }}
        transition={{ duration: 0.16, ease: [0.22, 1, 0.36, 1] }}
        role="dialog"
        aria-label="Search features"
        className="relative w-full max-w-[620px] overflow-hidden rounded-[28px]"
        style={{ background: 'var(--e-surface)', boxShadow: '0 0 0 1px var(--e-line), 0 40px 80px -30px rgba(0,0,0,.55)' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 px-5 pt-5 pb-4">
          <Search className="h-5 w-5 shrink-0" style={{ color: 'var(--e-ink-3)' }} />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={onKey}
            placeholder="Jump to a feature…"
            role="combobox"
            aria-expanded="true"
            aria-controls="cmdk-list"
            aria-activedescendant={filtered[active] ? `cmdk-${filtered[active].id}` : undefined}
            className="flex-1 bg-transparent text-[17px] font-medium !outline-none !ring-0 !shadow-none !border-0 placeholder:text-[var(--e-ink-3)]"
            style={{ color: 'var(--e-ink)' }}
          />
          <button
            onClick={onClose}
            className="rounded-full px-2.5 py-1 text-[11px] font-bold"
            style={{ background: 'var(--e-surface-3)', color: 'var(--e-ink-2)' }}
          >
            esc
          </button>
        </div>
        <div className="mx-5 h-px" style={{ background: 'var(--e-line)' }} />
        <p className="px-6 pt-3 pb-1 text-[11.5px] font-bold" style={{ color: 'var(--e-ink-3)' }}>
          {query ? `${filtered.length} result${filtered.length === 1 ? '' : 's'}` : 'All features'}
        </p>
        <div ref={listRef} id="cmdk-list" role="listbox" className="max-h-[min(420px,55vh)] overflow-y-auto px-3 pb-3">
          {filtered.map((feature, i) => {
            const meta = getFeatureMeta(feature.name);
            const Icon = meta.icon;
            const isActive = i === active;
            const n = alertCounts[feature.id] || 0;
            return (
              <button
                key={feature.id}
                id={`cmdk-${feature.id}`}
                data-idx={i}
                role="option"
                aria-selected={isActive}
                onMouseMove={() => setActive(i)}
                onClick={() => pick(feature.id)}
                className="flex w-full items-center gap-3 rounded-[18px] px-3 py-2.5 text-left"
                style={{ background: isActive ? 'var(--e-surface-3)' : 'transparent' }}
              >
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full" style={{ background: `${meta.iconGradient[0]}1a`, color: meta.iconGradient[0] }}>
                  <Icon className="h-[18px] w-[18px]" strokeWidth={1.8} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[15px] font-bold" style={{ color: 'var(--e-ink)' }}>{feature.name}</span>
                  <span className="block text-[12px]" style={{ color: 'var(--e-ink-3)' }}>
                    {n ? `${n.toLocaleString()} alerts in 7 days` : 'All clear'}
                  </span>
                </span>
                {isActive ? (
                  <span className="flex h-8 items-center gap-1.5 rounded-full px-3 text-[12px] font-bold" style={{ background: 'var(--e-ink-pill)', color: 'var(--e-canvas)' }}>
                    Open <ArrowRight className="h-3.5 w-3.5" />
                  </span>
                ) : n > 0 ? (
                  <span className="h-2 w-2 rounded-full" style={{ background: SEVERITY_STYLE[getSeverity(n)].fg }} />
                ) : null}
              </button>
            );
          })}
          {filtered.length === 0 && (
            <div className="px-4 py-10 text-center text-[13px]" style={{ color: 'var(--e-ink-3)' }}>
              Nothing matches &ldquo;{query}&rdquo;
            </div>
          )}
        </div>
        <div className="flex items-center gap-4 px-6 py-3 text-[11.5px]" style={{ background: 'var(--e-surface-2)', color: 'var(--e-ink-3)' }}>
          <span><kbd className="font-bold" style={{ color: 'var(--e-ink-2)' }}>↑↓</kbd> move</span>
          <span><kbd className="font-bold" style={{ color: 'var(--e-ink-2)' }}>↵</kbd> open</span>
          <span><kbd className="font-bold" style={{ color: 'var(--e-ink-2)' }}>esc</kbd> close</span>
          <span className="ml-auto"><kbd className="font-bold" style={{ color: 'var(--e-ink-2)' }}>⌘K</kbd> anywhere</span>
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
  const [cmdOpen, setCmdOpen] = useState(false);
  const now = new Date();

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
      <div className="mx-auto w-full max-w-[1500px] px-4 pt-6 sm:px-6 lg:px-10">
        <div className="relative h-[280px] overflow-hidden rounded-[28px]" style={{ background: 'var(--e-surface)', boxShadow: 'var(--dash-card-shadow)' }}>
          <DotMatrix text="hatke" className="absolute inset-0" />
          <span className="absolute bottom-5 left-6 flex items-center gap-2 text-[12.5px] font-bold" style={{ color: 'var(--e-ink-3)' }}>
            <Loader2 className="h-3.5 w-3.5 animate-spin" /> Loading features
          </span>
        </div>
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

  const totalAlerts = Object.values(alertCounts).reduce((n, v) => n + (v || 0), 0);
  const ranked = [...features]
    .map((f) => ({ f, n: alertCounts[f.id] || 0 }))
    .sort((x, y) => y.n - x.n);
  const noisy = ranked.filter((r) => r.n > 0);
  const maxAlerts = Math.max(1, ...ranked.map((r) => r.n));
  const hour = now.getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  const firstName = (user?.username || '').split(/[\s_.@]/)[0];
  const sevColor = (n: number) => SEVERITY_STYLE[getSeverity(n)].fg;

  return (
    <div className="relative flex-1 theme-transition">
      {/* ── Hero ── */}
      <div className="mx-auto w-full max-w-[1500px] px-4 pt-4 sm:px-6 lg:px-10">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap items-center gap-4">
            <div
              className="flex h-[88px] w-[88px] items-center justify-center rounded-full text-[2.2rem] font-medium tracking-[-0.03em]"
              style={{ boxShadow: '0 0 0 1px var(--e-line-2)', color: 'var(--e-ink)', fontFamily: 'var(--font-display)' }}
            >
              {now.getDate()}
            </div>
            <div className="text-[19px] font-medium leading-[1.15] tracking-[-0.02em]" style={{ color: 'var(--e-ink)' }}>
              {now.toLocaleDateString('en-US', { weekday: 'short' })},<br />
              {now.toLocaleDateString('en-US', { month: 'long' })}
            </div>
            <span className="mx-2 hidden h-10 w-px sm:block" style={{ background: 'var(--e-line-2)' }} />
            <button
              onClick={() => setCmdOpen(true)}
              className="inline-flex h-14 min-w-[260px] items-center gap-3 rounded-full px-5 text-left transition-shadow hover:shadow-lg"
              style={{ background: 'var(--e-surface)', boxShadow: '0 0 0 1px var(--e-line)', color: 'var(--e-ink-3)' }}
            >
              <Search className="h-5 w-5" />
              <span className="flex-1 text-[14px]">Search features…</span>
              <kbd className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-bold" style={{ background: 'var(--e-surface-3)', color: 'var(--e-ink-2)' }}>
                <Command className="h-3 w-3" />K
              </kbd>
            </button>
          </div>
          <div className="lg:text-right">
            <p className="text-[clamp(1.8rem,3vw,2.75rem)] font-medium leading-[1.05] tracking-[-0.035em]" style={{ color: 'var(--e-ink)', fontFamily: 'var(--font-display)' }}>
              {greeting}{firstName ? `, ${firstName}` : ''} 👋
            </p>
            <p className="text-[clamp(1.8rem,3vw,2.75rem)] font-normal leading-[1.1] tracking-[-0.035em]" style={{ color: 'var(--e-ink-3)', fontFamily: 'var(--font-display)' }}>
              Pick a feature to dig in.
            </p>
          </div>
        </div>

        {/* ── Signature band ── */}
        <div className="relative mt-8 h-[200px] overflow-hidden rounded-[28px] sm:h-[230px]" style={{ background: 'var(--e-surface)', boxShadow: 'var(--dash-card-shadow)' }}>
          <DotMatrix text="hatke" className="absolute inset-0" />
          <div className="pointer-events-none absolute bottom-5 left-6 right-6 flex items-end justify-between gap-4">
            <span className="rounded-full px-3 py-1 text-[12px] font-bold" style={{ background: 'var(--e-surface-2)', color: 'var(--e-ink-2)' }}>
              Feature tracking · {features.length} live
            </span>
            <span className="hidden text-[11.5px] sm:inline" style={{ color: 'var(--e-ink-3)' }}>move your cursor ↗</span>
          </div>
        </div>

        {/* ── Overview ── */}
        <div className="mt-10 flex items-end justify-between gap-4">
          <h1 className="flex items-start gap-3 text-[clamp(2.6rem,5vw,4.25rem)] font-medium leading-[0.95] tracking-[-0.035em]" style={{ color: 'var(--e-ink)', fontFamily: 'var(--font-display)' }}>
            Features
            <span className="mt-2 rounded-full px-3 py-1 text-[13px] font-bold tracking-normal" style={{ background: 'var(--e-ink-pill)', color: 'var(--e-canvas)', fontFamily: 'var(--font-sans)' }}>
              {features.length}
            </span>
          </h1>
        </div>

        <div className="mt-6 grid grid-cols-1 gap-5 lg:grid-cols-12">
          {/* Alert total */}
          <div
            className="e-hero-card relative overflow-hidden rounded-[28px] p-7 text-white lg:col-span-4"
            style={{ boxShadow: '0 30px 60px -34px hsl(var(--accent-primary) / 0.6)', minHeight: 230 }}
          >
            <span className="inline-flex items-center gap-1.5 rounded-full border border-white/30 bg-white/10 px-3 py-1 text-[12px] font-bold">
              <span className="h-1.5 w-1.5 rounded-full bg-white" /> Last 7 days
            </span>
            <p className="mt-8 text-[clamp(3rem,5vw,4.5rem)] font-light leading-none tracking-[-0.05em] tabular-nums" style={{ fontFamily: 'var(--font-display)' }}>
              {totalAlerts.toLocaleString()}
            </p>
            <p className="mt-3 max-w-xs text-[15px] font-medium leading-snug">
              {totalAlerts === 0
                ? `Alerts across all ${features.length} features. Everything is quiet.`
                : `Alerts across ${noisy.length} of ${features.length} features. ${features.length - noisy.length} are all clear.`}
            </p>
          </div>

          {/* Noisiest features */}
          <div className="rounded-[28px] p-7 lg:col-span-5" style={{ background: 'var(--e-surface)', boxShadow: 'var(--dash-card-shadow)' }}>
            <div className="flex items-center justify-between">
              <p className="text-[19px] font-medium tracking-[-0.015em]" style={{ color: 'var(--e-ink)', fontFamily: 'var(--font-display)' }}>Noisiest features</p>
              <span className="rounded-full px-2.5 py-1 text-[11px] font-bold" style={{ background: 'var(--e-surface-3)', color: 'var(--e-ink-2)' }}>7d alerts</span>
            </div>
            {noisy.length === 0 ? (
              <p className="mt-10 text-center text-[13px]" style={{ color: 'var(--e-ink-3)' }}>No alerts anywhere this week.</p>
            ) : (
              <div className="mt-5 space-y-3">
                {noisy.slice(0, 5).map(({ f, n }, i) => (
                  <button key={f.id} onClick={() => onSelectFeature(f.id)} className="group grid w-full grid-cols-[120px_1fr_64px] items-center gap-3 text-left">
                    <span className="truncate text-[13px] font-bold group-hover:underline" style={{ color: 'var(--e-ink)' }}>{f.name}</span>
                    <span className="h-3 overflow-hidden rounded-full" style={{ background: 'var(--e-surface-3)' }}>
                      <motion.span
                        className="block h-full rounded-full"
                        initial={{ width: 0 }}
                        animate={{ width: `${Math.max(3, (n / maxAlerts) * 100)}%` }}
                        transition={{ duration: 0.8, delay: i * 0.06, ease: [0.22, 1, 0.36, 1] }}
                        style={{ background: i === 0 ? 'var(--e-coral)' : 'var(--e-ink-pill)' }}
                      />
                    </span>
                    <span className="text-right text-[13px] font-bold tabular-nums" style={{ color: 'var(--e-ink)' }}>{n.toLocaleString()}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Health matrix */}
          <div className="rounded-[28px] p-7 lg:col-span-3" style={{ background: 'var(--e-surface)', boxShadow: 'var(--dash-card-shadow)' }}>
            <p className="text-[19px] font-medium tracking-[-0.015em]" style={{ color: 'var(--e-ink)', fontFamily: 'var(--font-display)' }}>Health</p>
            <p className="text-[12px]" style={{ color: 'var(--e-ink-3)' }}>One dot per feature</p>
            <div className="mt-5 flex flex-wrap gap-2">
              {ranked.map(({ f, n }) => (
                <button
                  key={f.id}
                  title={`${f.name}: ${n ? `${n} alerts` : 'all clear'}`}
                  onClick={() => onSelectFeature(f.id)}
                  className="h-6 w-6 rounded-full transition-transform hover:scale-125"
                  style={{ background: n ? sevColor(n) : 'var(--e-mint)', opacity: n ? 1 : 0.35 }}
                />
              ))}
            </div>
            <div className="mt-5 flex flex-wrap gap-x-3 gap-y-1 text-[11px]" style={{ color: 'var(--e-ink-3)' }}>
              <span><span className="mr-1 inline-block h-2 w-2 rounded-full" style={{ background: 'var(--e-mint)', opacity: 0.5 }} />clear</span>
              <span><span className="mr-1 inline-block h-2 w-2 rounded-full" style={{ background: '#b7770f' }} />≤10</span>
              <span><span className="mr-1 inline-block h-2 w-2 rounded-full" style={{ background: 'var(--e-coral)' }} />≤100</span>
              <span><span className="mr-1 inline-block h-2 w-2 rounded-full" style={{ background: '#d0335f' }} />100+</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Feature grid ── */}
      <div className="mx-auto w-full max-w-[1500px] px-4 pb-6 pt-10 sm:px-6 lg:px-10">
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {features.map((feature, index) => (
            <FeatureCard
              key={feature.id}
              feature={feature}
              alertCount={alertCounts[feature.id] || 0}
              onClick={() => onSelectFeature(feature.id)}
              index={index}
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
            alertCounts={alertCounts}
          />
        )}
      </AnimatePresence>
    </div>
  );
}