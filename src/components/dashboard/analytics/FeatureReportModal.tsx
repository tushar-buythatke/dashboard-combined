/**
 * Feature Report Modal - Professional Data Scientist Grade Analytics
 * Comprehensive feature analytics with AI-powered insights
 */

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  FileText, Download, Calendar as CalendarIcon,
  TrendingUp, TrendingDown, Minus, AlertTriangle, CheckCircle,
  BarChart3, PieChart, Activity, Zap, Shield, Target,
  ArrowUpRight, ArrowDownRight, Sparkles, RefreshCw, ExternalLink,
  ChevronDown, ChevronUp, Flame, SortDesc, Store
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import {
  collectComprehensiveFeatureData,
  generateComprehensiveAIAnalysis,
  generatePDFFromElement,
  formatNumber,
  formatPercentage,
  getHealthColor,
  getHealthBgClass,
  type ComprehensiveFeatureReport,
  type AIAnalysisResult,
  type PlatformMetrics,
  type HourlyTrend,
  type POSMetrics,
  type CriticalAlertInfo,
  type EventMetrics
} from '@/services/featureReportService';
import {
  AreaChart, Area, BarChart, Bar, PieChart as RechartsPie, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  ComposedChart, Brush
} from 'recharts';

interface FeatureReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  featureId: string;
  featureName: string;
  organizationId?: number;
}

const CHART_COLORS = ['#6366f1', '#22c55e', '#f59e0b', '#ef4444', '#ec4899', '#8b5cf6', '#06b6d4', '#84cc16', '#14b8a6', '#f97316'];

// Chart axis tick style that works in both light and dark mode
const getAxisTickStyle = (fontSize: number = 10) => ({
  fontSize,
  fill: 'currentColor',
  className: 'text-gray-500 dark:text-gray-400'
});

// Brand logo endpoint - uses direct API since images don't have CORS restrictions
const getBrandLogoEndpoint = (brand: string): string => {
  // Use direct API URL - images can be loaded cross-origin without CORS issues
  return `https://search-new.bitbns.com/buyhatke/wrapper/brandLogo?brand=${encodeURIComponent(brand)}`;
};

// Get site logo - uses siteDetails image or brand logo API
const getSiteLogo = (siteName: string, siteImage?: string): string => {
  // If we have an image from siteDetails API, use it
  if (siteImage && siteImage.trim()) {
    return siteImage;
  }

  // Otherwise use brand logo endpoint with site name
  return getBrandLogoEndpoint(siteName);
};

// Format AI text - convert backticks and event-like patterns to bold
// Chart Styles for PDF & Performance
const chartStyles = `
  .pdf-page-break-avoid { page-break-inside: avoid !important; break-inside: avoid !important; }
  .no-scrollbar::-webkit-scrollbar { display: none; }
  .hide-animations * { transition: none !important; animation: none !important; }
`;

const formatAIText = (text: string): React.ReactNode => {
  if (!text) return text;
  // Regex to catch: `backticks`, EVENT_NAMES, /api/paths
  const regex = /(`[^`]+`|\b[A-Z][A-Z0-9_]{3,}\b|\/[a-zA-Z0-9._-]+\/[a-zA-Z0-9._\/-]+)/g;
  const parts = text.split(regex);

  return (
    <>
      {parts.map((part, i) => {
        if (!part) return null;
        const isEvent = /^[A-Z][A-Z0-9_]{3,}$/.test(part);
        const isPath = /^\/[a-zA-Z0-9._-]+\//.test(part);
        const isBacktick = part.startsWith('`') && part.endsWith('`');

        if (isEvent || isPath || isBacktick) {
          const cleanPart = isBacktick ? part.slice(1, -1) : part;
          return (
            <strong key={i} className="font-black text-indigo-600 dark:text-indigo-400 shadow-sm bg-indigo-50/50 dark:bg-indigo-950/30 px-1 rounded border border-indigo-100/50 dark:border-indigo-900/50 mx-0.5">
              {cleanPart}
            </strong>
          );
        }
        return part;
      })}
    </>
  );
};

// Heatmap color scale
const getHeatmapColor = (value: number, max: number) => {
  if (max === 0) return '#22c55e33';
  const intensity = Math.min(value / max, 1);
  if (intensity < 0.2) return '#22c55e4d';
  if (intensity < 0.4) return '#eab30866';
  if (intensity < 0.6) return '#f9731680';
  if (intensity < 0.8) return '#ef444499';
  return '#dc2626cc';
};

// Custom tooltip with human-readable dates and detailed metrics
const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;

  // Get the first payload item for event-based charts
  const data = payload[0]?.payload || {};

  // Try to get event name from data or label
  let displayLabel = data.eventName || label;
  try {
    if (displayLabel && typeof displayLabel === 'string' && (displayLabel.includes('T') || displayLabel.includes('-'))) {
      const date = new Date(displayLabel);
      if (!isNaN(date.getTime())) {
        displayLabel = format(date, 'EEEE, MMM d, yyyy');
      }
    }
  } catch {
    // Keep original label
  }

  // Calculate success rate - prefer direct successRate, fallback to calculation
  let rate = data.successRate ?? 0;
  if (rate === 0 && data.totalCount > 0) {
    const success = data.successCount ?? payload.find((p: any) => p.name === 'Success')?.value ?? 0;
    const total = data.totalCount ?? payload.find((p: any) => p.name === 'Total')?.value ?? 1;
    rate = total > 0 ? (success / total) * 100 : 0;
  }
  // If still 0 and we have no failures, assume 100%
  if (rate === 0 && data.failCount === 0 && data.totalCount > 0) {
    rate = 100;
  }

  return (
    <div className="bg-white dark:bg-gray-900 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 p-3 min-w-[200px] z-[9999] relative">
      <div className="flex items-center justify-between gap-4 mb-2 border-b border-gray-100 dark:border-gray-800 pb-2">
        <p className="font-bold text-gray-900 dark:text-white text-xs truncate max-w-[150px]">{displayLabel}</p>
        <div className={cn("px-2 py-0.5 rounded-full text-[9px] font-bold uppercase", rate >= 95 ? "bg-emerald-100 text-emerald-600" : rate >= 80 ? "bg-amber-100 text-amber-600" : "bg-rose-100 text-rose-600")}>
          {rate.toFixed(1)}% SUCCESS
        </div>
      </div>
      <div className="space-y-1.5">
        {payload.map((entry: any, i: number) => (
          <div key={i} className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }} />
              <span className="text-[10px] font-bold text-gray-600 dark:text-gray-400 capitalize">{entry.name}</span>
            </div>
            <span className="font-mono font-bold text-[11px] text-gray-900 dark:text-white">
              {typeof entry.value === 'number' && entry.value < 1 ? entry.value.toFixed(1) : formatNumber(entry.value)}
            </span>
          </div>
        ))}
      </div>
      <div className="mt-2 pt-1.5 border-t border-gray-100 dark:border-gray-800 text-center">
        <p className="text-[8px] text-gray-400 italic">Impact: {Math.round((data.totalCount || 0) / 1000 * Math.max(rate, 1))}pts</p>
      </div>
    </div>
  );
};

export function FeatureReportModal({ isOpen, onClose, featureId, featureName, organizationId = 0 }: FeatureReportModalProps) {
  const [loading, setLoading] = useState(false);
  const [generatingAI, setGeneratingAI] = useState(false);
  const [generatingPDF, setGeneratingPDF] = useState(false);
  const [report, setReport] = useState<ComprehensiveFeatureReport | null>(null);
  const [aiAnalysis, setAiAnalysis] = useState<AIAnalysisResult | null>(null);
  const [dateRange, setDateRange] = useState<{ from: Date; to: Date }>({
    from: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
    to: new Date()
  });
  const [datePickerOpen, setDatePickerOpen] = useState(false);
  const [showAllEvents, setShowAllEvents] = useState(false);
  const [sortBy, setSortBy] = useState<'total' | 'failures' | 'rate' | 'trend'>('total');
  const [filterErrorsOnly, setFilterErrorsOnly] = useState(false);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({ pos: true, source: true });
  const reportRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen && featureId) {
      // Stagger initialization to allow modal transition animation to complete
      const timer = setTimeout(() => {
        generateReport();
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [isOpen, featureId]);

  const generateReport = async () => {
    setLoading(true);
    setReport(null);
    setAiAnalysis(null);

    try {
      const data = await collectComprehensiveFeatureData(featureId, organizationId, dateRange);
      setReport(data);

      setGeneratingAI(true);
      try {
        const analysis = await generateComprehensiveAIAnalysis(data);
        setAiAnalysis(analysis);
        data.aiAnalysis = analysis;
        setReport({ ...data });
      } catch (error) {
        console.error('AI Analysis failed:', error);
      } finally {
        setGeneratingAI(false);
      }
    } catch (error) {
      console.error('Failed to generate report:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenPDF = async () => {
    if (!report) return;
    setGeneratingPDF(true);
    try {
      await generatePDFFromElement('feature-report-content', `${featureName}_Report_${format(new Date(), 'yyyy-MM-dd')}`, true);
    } catch (error) {
      console.error('Failed to generate PDF:', error);
    } finally {
      setGeneratingPDF(false);
    }
  };

  const handleDownloadPDF = async () => {
    if (!report) return;
    setGeneratingPDF(true);
    try {
      const { blob } = await generatePDFFromElement('feature-report-content', `${featureName}_Report_${format(new Date(), 'yyyy-MM-dd')}`, false);
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${featureName}_Report_${format(new Date(), 'yyyy-MM-dd')}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Failed to download PDF:', error);
    } finally {
      setGeneratingPDF(false);
    }
  };

  const handleRegenerateAI = async () => {
    if (!report) return;
    setGeneratingAI(true);
    try {
      const analysis = await generateComprehensiveAIAnalysis(report);
      setAiAnalysis(analysis);
    } catch (error) {
      console.error('AI Analysis failed:', error);
    } finally {
      setGeneratingAI(false);
    }
  };

  // Sorted events
  const sortedEvents = useMemo(() => {
    if (!report) return [];
    let events = [...report.eventMetrics];
    if (filterErrorsOnly) {
      events = events.filter(e => e.isErrorEvent || e.failCount > 0);
    }
    switch (sortBy) {
      case 'total': return events.sort((a, b) => b.totalCount - a.totalCount);
      case 'failures': return events.sort((a, b) => b.failCount - a.failCount);
      case 'rate': return events.sort((a, b) => b.successRate - a.successRate);
      case 'trend': return events.sort((a, b) => Math.abs(b.trendPercentage) - Math.abs(a.trendPercentage));
      default: return events;
    }
  }, [report, sortBy, filterErrorsOnly]);

  const toggleSection = (key: string) => setExpandedSections(prev => ({ ...prev, [key]: !prev[key] }));

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-[100vw] sm:max-w-[95vw] w-full sm:w-[1400px] max-h-[100vh] sm:max-h-[95vh] overflow-hidden flex flex-col p-0 gap-0 bg-white dark:bg-gray-900 border-none sm:border sm:border-gray-200 dark:sm:border-gray-800 shadow-2xl" aria-describedby="report-desc" showCloseButton={false}>
        <style dangerouslySetInnerHTML={{ __html: chartStyles }} />
        {/* Clean Close Button */}
        <button
          onClick={onClose}
          className="absolute right-4 top-4 z-50 w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 flex items-center justify-center  shadow-sm border border-gray-200 dark:border-gray-700"
          aria-label="Close"
        >
          <svg className="w-4 h-4 text-gray-500 dark:text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        {/* Header - Master Brain Style */}
        <DialogHeader className="px-4 sm:px-6 py-3 sm:py-4 border-b border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 sm:gap-6 pr-10 sm:pr-12">
            {/* Left: Identity */}
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-2xl bg-gradient-to-br from-indigo-500 via-violet-600 to-fuchsia-600 shadow-xl shadow-indigo-500/20 ring-1 ring-white/20">
                <FileText className="h-6 w-6 text-white" />
              </div>
              <div className="flex flex-col">
                <DialogTitle className="text-xl font-extrabold text-gray-900 dark:text-white tracking-tight flex items-center gap-2">
                  {featureName} <span className="text-[10px] font-mono font-normal bg-white/50 dark:bg-gray-800/50 px-1.5 py-0.5 rounded border border-white/20 dark:border-gray-700/20 text-gray-500 uppercase">ID: {featureId}</span>
                </DialogTitle>
                <DialogDescription id="report-desc" className="text-xs font-medium text-gray-500 flex items-center gap-1.5">
                  <Sparkles className="h-3 w-3 text-amber-500" />
                  Feature Analysis
                </DialogDescription>
              </div>
            </div>

            {/* Center: Date Range - Pill Style */}
            <div className="flex-1 flex justify-center">
              <Popover open={datePickerOpen} onOpenChange={setDatePickerOpen}>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="h-10 px-4 rounded-full bg-white/40 dark:bg-gray-800/40  border border-white/40 dark:border-gray-700/40 gap-3 shadow-sm hover:bg-white/60 dark:hover:bg-gray-700/60  font-semibold text-gray-700 dark:text-gray-200">
                    <CalendarIcon className="h-4 w-4 text-indigo-500" />
                    <span>{format(dateRange.from, 'MMMM d')} — {format(dateRange.to, 'MMMM d, yyyy')}</span>
                    <ChevronDown className={cn("h-4 w-4 ", datePickerOpen && "rotate-180")} />
                  </Button>
                </PopoverTrigger>
                <PopoverContent
                  className="w-auto p-0 rounded-2xl overflow-hidden shadow-2xl border border-white/20 z-[9999]"
                  align="center"
                  sideOffset={8}
                >
                  <Calendar
                    mode="range"
                    selected={{ from: dateRange.from, to: dateRange.to }}
                    onSelect={(range) => {
                      if (range?.from && range?.to) setDateRange({ from: range.from, to: range.to });
                    }}
                    numberOfMonths={2}
                    className="p-4"
                  />
                  <div className="p-4 border-t bg-gray-50 dark:bg-gray-900/50 flex justify-between items-center gap-4">
                    <p className="text-xs text-gray-500 italic">Select range for trend analysis</p>
                    <div className="flex gap-2">
                      <Button size="sm" variant="ghost" onClick={() => setDatePickerOpen(false)}>Cancel</Button>
                      <Button size="sm" className="bg-indigo-600 hover:bg-indigo-700 shadow-lg shadow-indigo-500/20" onClick={() => { setDatePickerOpen(false); generateReport(); }}>Update Data</Button>
                    </div>
                  </div>
                </PopoverContent>
              </Popover>
            </div>

            {/* Right: Controls */}
            <div className="flex items-center gap-2 justify-end sm:justify-start">
              <div className="flex items-center p-1 bg-white/40 dark:bg-gray-800/40  border border-white/40 dark:border-gray-700/40 rounded-lg shadow-sm">
                <Button variant="ghost" size="sm" onClick={generateReport} disabled={loading} className="h-8 w-8 p-0 hover:bg-white/50 dark:hover:bg-gray-700/50 rounded-md">
                  <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
                </Button>
                <div className="w-[1px] h-4 bg-gray-300 dark:bg-gray-600 mx-1" />
                <Button variant="ghost" size="sm" onClick={handleOpenPDF} disabled={!report || generatingPDF} className="h-8 px-2.5 gap-2 text-xs font-bold hover:bg-white/50 dark:hover:bg-gray-700/50 rounded-md">
                  <ExternalLink className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">PDF</span>
                </Button>
              </div>

              <Button size="sm" onClick={handleDownloadPDF} disabled={!report || generatingPDF} className="h-9 sm:h-10 px-3 sm:px-4 rounded-xl font-bold bg-gradient-to-r from-indigo-500 via-violet-600 to-fuchsia-600 text-white hover:opacity-90 shadow-lg shadow-indigo-500/20 border-t border-white/20   active:scale-[0.98] text-[10px] sm:text-xs tracking-tight">
                {generatingPDF ? (
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <Download className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1.5 sm:mr-2" />
                )}
                <span className="hidden xs:inline">EXPORT REPORT</span>
                <span className="xs:hidden">EXPORT</span>
              </Button>
            </div>

          </div>
        </DialogHeader>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-6 bg-transparent">
          {loading ? (
            <LoadingState featureName={featureName} />
          ) : report ? (
            <div id="feature-report-content" ref={reportRef} className="space-y-4 sm:space-y-6 bg-white dark:bg-gray-900 rounded-2xl p-4 sm:p-6 shadow-lg border border-gray-100 dark:border-gray-800">
              {/* Report Header - Mobile Responsive */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 sm:pb-6 border-b border-gray-100 dark:border-gray-800">
                <div className="flex items-center gap-3 sm:gap-4">
                  <img src="/assets/logo_512x512.png" alt="Logo" className="h-10 w-10 sm:h-12 sm:w-12 rounded-xl" />
                  <div>
                    <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white tracking-tight">{featureName}</h1>
                    <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">Analytics Report</p>
                  </div>
                </div>
                <div className="text-left sm:text-right">
                  <p className="text-[10px] sm:text-xs text-gray-400 dark:text-gray-500 uppercase tracking-wider font-medium">Report Period</p>
                  <p className="font-semibold text-sm sm:text-base text-gray-700 dark:text-gray-300">
                    {format(report.dateRange.from, 'MMM dd, yyyy')} - {format(report.dateRange.to, 'MMM dd, yyyy')}
                  </p>
                  <p className="text-[10px] sm:text-xs text-gray-400 dark:text-gray-500 mt-1">Generated: {format(new Date(report.generatedAt), 'PPpp')}</p>
                </div>
              </div>

              {/* Health Score + Key Metrics - Premium Layout */}
              <div className="grid grid-cols-1 xs:grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
                <HealthScoreCard score={report.executiveSummary.healthScore} status={report.executiveSummary.healthStatus} />
                <MetricCard title="Total Volume" value={formatNumber(report.executiveSummary.totalEvents)} icon={<Activity className="h-5 w-5" />} trend={report.eventMetrics[0]?.trend} />
                <MetricCard title="Success Rate" value={formatPercentage(report.executiveSummary.overallSuccessRate)} icon={<CheckCircle className="h-5 w-5" />} color="green" trend={report.executiveSummary.overallSuccessRate >= 95 ? 'up' : 'down'} />
                <MetricCard title="Total Failures" value={formatNumber(report.executiveSummary.totalFailEvents)} icon={<AlertTriangle className="h-5 w-5" />} color="red" />
                <MetricCard title="Critical Alerts" value={report.executiveSummary.criticalAlertsCount.toString()} icon={<Zap className="h-5 w-5" />} color={report.executiveSummary.criticalAlertsCount > 0 ? 'amber' : 'green'} />
              </div>

              {/* Secondary Metrics Row - Master Brain Style */}
              <div className="grid grid-cols-2 xs:grid-cols-3 lg:grid-cols-6 gap-2 sm:gap-3">
                {[
                  { label: "Daily Avg", value: formatNumber(report.executiveSummary.avgDailyEvents), color: "slate" },
                  { label: "Peak Load", value: `${report.executiveSummary.peakHour}:00`, color: "emerald" },
                  { label: "Worst Hour", value: `${report.executiveSummary.worstHour}:00`, color: "rose" },
                  { label: "Event Matrix", value: report.eventMetrics.length, color: "indigo" },
                  { label: "Sitelist Size", value: report.posBreakdown.length, color: "purple" },
                  { label: "Coverage", value: report.platformBreakdown.length, color: "amber" }
                ].map((m, i) => (
                  <div key={i} className="bg-white/40 dark:bg-gray-800/40 rounded-xl sm:rounded-2xl p-2.5 sm:p-3 border border-white/20 dark:border-gray-700/20 shadow-sm">
                    <p className="text-[8px] sm:text-[10px] font-extrabold text-gray-500 uppercase tracking-widest mb-1">{m.label}</p>
                    <p className={cn("text-sm sm:text-lg font-black",
                      m.color === 'emerald' ? "text-emerald-600 dark:text-emerald-400" :
                        m.color === 'rose' ? "text-rose-600 dark:text-rose-400" :
                          m.color === 'indigo' ? "text-indigo-600 dark:text-indigo-400" :
                            m.color === 'purple' ? "text-purple-600 dark:text-purple-400" :
                              m.color === 'amber' ? "text-amber-600 dark:text-amber-400" :
                                "text-gray-800 dark:text-white"
                    )}>{m.value}</p>
                  </div>
                ))}
              </div>


              {/* AI Analysis */}
              {(aiAnalysis || generatingAI) && (
                <AIAnalysisSection aiAnalysis={aiAnalysis} generatingAI={generatingAI} onRegenerate={handleRegenerateAI} />
              )}

              {/* Charts Grid - 6 Visualizations - Responsive */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
                {/* Daily Trends */}
                {report.dailyTrends.length > 0 && (
                  <ChartCard title="Daily Event Trends" icon={<BarChart3 className="h-5 w-5 text-indigo-500" />}>
                    <div className="flex gap-4 mb-2">
                      <Legend color="#6366f1" label="Total" />
                      <Legend color="#22c55e" label="Success" />
                      <Legend color="#ef4444" label="Failures" />
                    </div>
                    <ResponsiveContainer width="100%" height={240}>
                      <ComposedChart data={report.dailyTrends}>
                        <defs>
                          <linearGradient id="totalGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                            <stop offset="95%" stopColor="#6366f1" stopOpacity={0.05} />
                          </linearGradient>
                          <linearGradient id="successGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3} />
                            <stop offset="95%" stopColor="#22c55e" stopOpacity={0.05} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" className="stroke-gray-200 dark:stroke-gray-700" strokeOpacity={0.7} />
                        <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#6b7280' }} tickFormatter={(v) => { try { return format(new Date(v), 'MMM d'); } catch { return v; } }} />
                        <YAxis tick={{ fontSize: 10, fill: '#6b7280' }} tickFormatter={formatNumber} />
                        <Tooltip content={<CustomTooltip />} />
                        <Area type="monotone" dataKey="totalCount" stroke="#6366f1" strokeWidth={2} fill="url(#totalGrad)" name="Total" isAnimationActive={false} />
                        <Area type="monotone" dataKey="successCount" stroke="#22c55e" strokeWidth={2} fill="url(#successGrad)" name="Success" isAnimationActive={false} />
                        <Bar dataKey="failCount" fill="#ef4444" name="Failures" radius={[3, 3, 0, 0]} maxBarSize={16} opacity={0.8} isAnimationActive={false} />
                        {report.dailyTrends.length > 7 && <Brush dataKey="date" height={20} stroke="#6366f1" fill="#f9fafb" />}
                      </ComposedChart>
                    </ResponsiveContainer>
                  </ChartCard>
                )}

                {/* Success vs Failure Distribution */}
                <ChartCardRaw title="Success vs Failure Distribution" icon={<PieChart className="h-5 w-5 text-indigo-500" />}>
                  <div className="h-[220px] w-full flex items-center justify-center pdf-page-break-avoid overflow-visible">
                    <ResponsiveContainer width="100%" height="100%">
                      <RechartsPie>
                        <Pie
                          data={[
                            { name: 'Successful', value: report.executiveSummary.totalSuccessEvents },
                            { name: 'Failed', value: report.executiveSummary.totalFailEvents }
                          ]}
                          cx="50%"
                          cy="50%"
                          innerRadius={50}
                          outerRadius={80}
                          paddingAngle={5}
                          dataKey="value"
                          isAnimationActive={false}
                        >
                          <Cell fill="#10b981" />
                          <Cell fill="#ef4444" />
                        </Pie>
                        <Tooltip wrapperStyle={{ zIndex: 9999 }} allowEscapeViewBox={{ x: true, y: true }} />
                      </RechartsPie>
                    </ResponsiveContainer>
                  </div>
                  <div className="flex-1 space-y-3">
                    <div className="text-center">
                      <p className={cn("text-4xl font-bold", report.executiveSummary.overallSuccessRate >= 95 ? "text-emerald-500" : report.executiveSummary.overallSuccessRate >= 80 ? "text-amber-500" : "text-red-500")}>
                        {report.executiveSummary.overallSuccessRate.toFixed(1)}%
                      </p>
                      <p className="text-xs text-gray-500 uppercase tracking-wider">Success Rate</p>
                    </div>
                    <div className="flex justify-center gap-6 pt-4 border-t">
                      <div className="text-center">
                        <p className="text-lg font-bold text-emerald-500">{formatNumber(report.executiveSummary.totalSuccessEvents)}</p>
                        <p className="text-[10px] text-gray-500 uppercase">Successful</p>
                      </div>
                      <div className="text-center">
                        <p className="text-lg font-bold text-red-500">{formatNumber(report.executiveSummary.totalFailEvents)}</p>
                        <p className="text-[10px] text-gray-500 uppercase">Failed</p>
                      </div>
                    </div>
                  </div>
                </ChartCardRaw>

                {/* Platform Distribution */}
                {report.platformBreakdown.length > 0 && (
                  <ChartCard title="Platform Distribution" icon={<PieChart className="h-5 w-5 text-blue-500" />}>
                    <div className="flex items-center h-[240px] pdf-page-break-avoid">
                      <ResponsiveContainer width="55%" height="100%">
                        <RechartsPie>
                          <Pie data={report.platformBreakdown as any[]} cx="50%" cy="50%" innerRadius={45} outerRadius={80} dataKey="count" nameKey="platformName" paddingAngle={2} isAnimationActive={false}>
                            {report.platformBreakdown.map((_: PlatformMetrics, i: number) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                          </Pie>
                          <Tooltip content={({ active, payload }) => {
                            if (!active || !payload?.length) return null;
                            const d = payload[0].payload;
                            return (
                              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl border p-2 text-xs">
                                <p className="font-semibold">{d.platformName}</p>
                                <p>{formatNumber(d.count)} • {d.percentage.toFixed(1)}%</p>
                                <p className={d.successRate >= 95 ? "text-emerald-500" : "text-amber-500"}>{d.successRate.toFixed(1)}% success</p>
                              </div>
                            );
                          }} />
                        </RechartsPie>
                      </ResponsiveContainer>
                      <div className="flex-1 space-y-2">
                        {report.platformBreakdown.slice(0, 5).map((p: PlatformMetrics, i: number) => (
                          <div key={i} className="flex items-center gap-2 text-xs">
                            <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: CHART_COLORS[i % CHART_COLORS.length] }} />
                            <span className="flex-1 truncate text-gray-700 dark:text-gray-300">{p.platformName}</span>
                            <span className="font-mono text-gray-500">{p.percentage.toFixed(0)}%</span>
                            <span className={cn("font-semibold text-[10px]", p.successRate >= 95 ? "text-emerald-500" : "text-amber-500")}>{p.successRate.toFixed(0)}✓</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </ChartCard>
                )}

                {/* Top Events Horizontal Bar - Excludes API events */}
                {report.eventMetrics.filter((e: EventMetrics) => !e.isApiEvent).length > 0 && (
                  <ChartCardRaw title="Top Events by Volume" icon={<BarChart className="h-5 w-5 text-indigo-500" />} badge="Top 8 (Excl. API)">
                    <div className="h-[240px] w-full pdf-page-break-avoid overflow-visible">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                          layout="vertical"
                          data={report.eventMetrics.sort((a, b) => b.totalCount - a.totalCount).slice(0, 8)}
                          margin={{ top: 5, right: 30, left: 10, bottom: 5 }}
                        >
                          <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e5e7eb" opacity={0.5} />
                          <XAxis type="number" axisLine={false} tickLine={false} tick={{ fontSize: 9, fill: '#9ca3af' }} tickFormatter={formatNumber} />
                          <YAxis
                            type="category"
                            dataKey="eventName"
                            axisLine={false}
                            tickLine={false}
                            tick={{ fontSize: 9, fill: '#4b5563', fontWeight: 800 }}
                            width={140}
                            tickFormatter={(v) => v.length > 20 ? v.substring(0, 17) + '...' : v}
                          />
                          <Tooltip
                            wrapperStyle={{ zIndex: 9999 }}
                            allowEscapeViewBox={{ x: true, y: true }}
                            content={<CustomTooltip />}
                            cursor={{ fill: 'transparent' }}
                          />
                          <Bar dataKey="totalCount" radius={[0, 4, 4, 0]} isAnimationActive={false}>
                            {report.eventMetrics.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.isErrorEvent ? '#ef4444' : '#10b981'} />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </ChartCardRaw>
                )}
              </div>

              {/* Second Charts Row - Source Distribution + Event Success Rates - Responsive */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
                {/* Source Distribution */}
                {report.sourceBreakdown.length > 0 && (
                  <ChartCard title="Source Distribution" icon={<Zap className="h-5 w-5 text-cyan-500" />} badge={`${report.sourceBreakdown.length} sources`}>
                    <div className="flex items-center h-[200px] pdf-page-break-avoid">
                      <ResponsiveContainer width="55%" height="100%">
                        <RechartsPie>
                          <Pie data={report.sourceBreakdown as any[]} cx="50%" cy="50%" innerRadius={40} outerRadius={70} dataKey="count" nameKey="sourceName" paddingAngle={2} isAnimationActive={false}>
                            {report.sourceBreakdown.map((_: any, i: number) => <Cell key={i} fill={CHART_COLORS[(i + 4) % CHART_COLORS.length]} />)}
                          </Pie>
                          <Tooltip content={({ active, payload }) => {
                            if (!active || !payload?.length) return null;
                            const d = payload[0].payload;
                            return (
                              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl border p-2 text-xs">
                                <p className="font-semibold">{d.sourceName}</p>
                                <p>{formatNumber(d.count)} • {d.percentage.toFixed(1)}%</p>
                              </div>
                            );
                          }} />
                        </RechartsPie>
                      </ResponsiveContainer>
                      <div className="flex-1 space-y-2">
                        {report.sourceBreakdown.slice(0, 5).map((s: any, i: number) => (
                          <div key={i} className="flex items-center gap-2 text-xs">
                            <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: CHART_COLORS[(i + 4) % CHART_COLORS.length] }} />
                            <span className="flex-1 truncate text-gray-700 dark:text-gray-300">{s.sourceName}</span>
                            <span className="font-mono text-gray-500">{s.percentage.toFixed(0)}%</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </ChartCard>
                )}

                {/* Event Success Rate Comparison */}
                <ChartCardRaw title="Event Success Rate Comparison" icon={<Target className="h-5 w-5 text-emerald-500" />} badge="Top 10">
                  <div className="h-[240px] w-full pdf-page-break-avoid overflow-visible">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        layout="vertical"
                        data={report.eventMetrics
                          .filter(e => e.totalCount > 0) // Filter out events with zero data
                          .sort((a, b) => a.successRate - b.successRate)
                          .slice(0, 10)}
                        margin={{ top: 5, right: 30, left: 10, bottom: 5 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e5e7eb" opacity={0.5} />
                        <XAxis type="number" domain={[0, 100]} axisLine={false} tickLine={false} tick={{ fontSize: 9, fill: '#9ca3af' }} />
                        <YAxis
                          type="category"
                          dataKey="eventName"
                          axisLine={false}
                          tickLine={false}
                          tick={{ fontSize: 9, fill: '#4b5563', fontWeight: 800 }}
                          width={140}
                          tickFormatter={(v) => v.length > 20 ? v.substring(0, 17) + '...' : v}
                        />
                        <Tooltip
                          wrapperStyle={{ zIndex: 9999 }}
                          allowEscapeViewBox={{ x: true, y: true }}
                          content={<CustomTooltip />}
                          cursor={{ fill: 'transparent' }}
                        />
                        <Bar dataKey="successRate" radius={[0, 4, 4, 0]} isAnimationActive={false}>
                          {report.eventMetrics.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.successRate < 80 ? '#f59e0b' : '#10b981'} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </ChartCardRaw>
              </div>

              {/* Failure Rate Rankings */}
              {report.eventMetrics.filter((e: EventMetrics) => e.failCount > 0).length > 0 && (
                <ChartCard title="Events with Highest Failure Rates" icon={<AlertTriangle className="h-5 w-5 text-red-500" />} badge={`${report.eventMetrics.filter((e: EventMetrics) => e.failCount > 0).length} with failures`} badgeColor="red">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3 pdf-page-break-avoid">
                    {[...report.eventMetrics].filter(e => e.failCount > 0).sort((a, b) => (b.failCount / b.totalCount) - (a.failCount / a.totalCount)).slice(0, 6).map((event, i) => {
                      const failRate = (event.failCount / event.totalCount) * 100;
                      return (
                        <div key={i} className="flex items-center gap-3 p-3 rounded-xl bg-gradient-to-r from-gray-50 to-red-50/30 dark:from-gray-800 dark:to-red-950/20 border border-gray-100 dark:border-gray-800">
                          <span className={cn("w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white", failRate >= 50 ? "bg-red-500" : failRate >= 20 ? "bg-amber-500" : "bg-yellow-500")}>{i + 1}</span>
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-sm text-gray-800 dark:text-gray-200 truncate">{event.eventName}</p>
                            <div className="flex items-center gap-2 mt-1">
                              <div className="flex-1 h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                                <div className={cn("h-full rounded-full", failRate >= 50 ? "bg-red-500" : failRate >= 20 ? "bg-amber-500" : "bg-yellow-500")} style={{ width: `${Math.min(failRate, 100)}%` }} />
                              </div>
                              <span className="text-xs font-mono font-bold text-red-600">{failRate.toFixed(1)}%</span>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-xs font-mono text-red-600">{formatNumber(event.failCount)}</p>
                            <p className="text-[10px] text-gray-400">of {formatNumber(event.totalCount)}</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </ChartCard>
              )}

              {/* Hourly Heatmap - Hidden on mobile */}
              {report.hourlyTrends.length > 0 && (
                <ChartCard title="Hourly Activity Heatmap" icon={<Activity className="h-5 w-5 text-indigo-500" />} badge="24-hour view">
                  <div className="flex items-center gap-2 mb-3 text-xs">
                    <span className="text-gray-500 dark:text-gray-400">Failure intensity:</span>
                    <div className="flex gap-0.5">{['#22c55e4d', '#eab30866', '#f9731680', '#ef444499', '#dc2626cc'].map((c, i) => <span key={i} className="w-4 h-4 rounded" style={{ background: c }} />)}</div>
                    <span className="text-gray-400 dark:text-gray-500 ml-2">Low → Critical</span>
                  </div>
                  {/* Heatmap grid - only visible on larger screens */}
                  <div className="hidden sm:grid grid-cols-24 gap-1 mb-4">
                    {(() => {
                      const maxFail = Math.max(...report.hourlyTrends.map((x: any) => x.failCount || 0), 1);
                      return report.hourlyTrends.map((h: HourlyTrend, i: number) => {
                        const failRate = h.count > 0 ? ((h.failCount || 0) / h.count * 100) : 0;
                        const successRate = h.count > 0 ? (((h.successCount || h.count - (h.failCount || 0)) / h.count) * 100) : 0;
                        const impactScore = Math.round((h.count / report.executiveSummary.totalEvents) * successRate * 10);

                        return (
                          <div key={i} className="group relative">
                            <div
                              className="h-12 rounded    hover:z-20 cursor-pointer hover:ring-2 hover:ring-indigo-400 hover:shadow-lg"
                              style={{ background: getHeatmapColor(h.failCount || 0, maxFail) }}
                            />
                            {/* Hover tooltip */}
                            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 opacity-0 group-hover:opacity-100 pointer-events-none z-50  duration-150">
                              <div className="bg-gray-900/95 dark:bg-white/95  text-white dark:text-gray-900 text-[10px] rounded-lg px-2.5 py-2 shadow-xl whitespace-nowrap min-w-[120px] ring-1 ring-white/10">
                                <p className="font-black text-xs mb-1.5 border-b border-white/10 dark:border-gray-900/10 pb-1">{h.hour}:00</p>
                                <div className="space-y-1">
                                  <p className="flex justify-between items-center gap-4">
                                    <span className="opacity-70 font-semibold uppercase tracking-tighter">Total</span>
                                    <span className="font-mono font-bold leading-none">{formatNumber(h.count)}</span>
                                  </p>
                                  <p className="flex justify-between items-center gap-4 text-emerald-400 dark:text-emerald-600">
                                    <span className="opacity-70 font-semibold uppercase tracking-tighter">Success</span>
                                    <span className="font-bold leading-none">{successRate.toFixed(1)}%</span>
                                  </p>
                                  <p className="flex justify-between items-center gap-4 text-red-400 dark:text-red-500">
                                    <span className="opacity-70 font-semibold uppercase tracking-tighter">Fail</span>
                                    <span className="font-bold leading-none">{formatNumber(h.failCount || 0)}</span>
                                  </p>
                                </div>
                                <div className="mt-1.5 pt-1.5 border-t border-white/10 dark:border-gray-900/10 flex justify-center">
                                  <span className="text-[8px] font-black uppercase text-indigo-300 dark:text-indigo-600">Impact: {impactScore} pts</span>
                                </div>
                                <div className="absolute left-1/2 -translate-x-1/2 top-full w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900/95 dark:border-t-white/95" />
                              </div>
                            </div>
                            {i % 3 === 0 && <span className="absolute -bottom-4 left-1/2 -translate-x-1/2 text-[9px] text-gray-400 dark:text-gray-500 font-bold">{h.hour}</span>}
                          </div>
                        );
                      });
                    })()}
                  </div>

                  <ResponsiveContainer width="100%" height={140}>
                    <BarChart data={report.hourlyTrends} barCategoryGap="15%">
                      <CartesianGrid strokeDasharray="3 3" className="stroke-gray-200 dark:stroke-gray-700" strokeOpacity={0.7} />
                      <XAxis dataKey="hour" tick={{ fontSize: 8, fill: '#6b7280' }} interval={2} />
                      <YAxis tick={{ fontSize: 8, fill: '#6b7280' }} tickFormatter={formatNumber} />
                      <Tooltip content={<CustomTooltip />} />
                      <Bar dataKey="count" fill="#6366f1" radius={[3, 3, 0, 0]} name="Total" isAnimationActive={false} />
                      <Bar dataKey="failCount" fill="#ef4444" radius={[3, 3, 0, 0]} name="Failures" isAnimationActive={false} />
                    </BarChart>
                  </ResponsiveContainer>
                </ChartCard>
              )}

              {/* Site/POS Distribution with Logos - Always visible - Responsive */}
              {report.posBreakdown.length > 0 && (
                <ChartCard
                  title="Site Performance Matrix"
                  icon={<Store className="h-5 w-5 text-indigo-500" />}
                  badge={`${report.posBreakdown.length} sites matched`}
                >
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-6">
                    {report.posBreakdown.slice(0, 9).map((pos: POSMetrics, i: number) => (
                      <SiteCard key={i} name={pos.posName} count={pos.count} percentage={pos.percentage} successRate={pos.successRate} failCount={pos.failCount} image={pos.image} />
                    ))}
                  </div>

                  {/* Top Sites by Volume - Clean Horizontal Bars */}
                  <div className="mt-6 pt-6 border-t border-gray-100 dark:border-gray-800">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <h4 className="text-sm font-bold text-gray-900 dark:text-white">Top Sites by Volume</h4>
                        <p className="text-[10px] text-gray-500">Ranked by event count with success rates</p>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-1">
                          <div className="w-2 h-2 rounded-full bg-emerald-500" />
                          <span className="text-[9px] font-bold text-gray-400">≥95%</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <div className="w-2 h-2 rounded-full bg-amber-500" />
                          <span className="text-[9px] font-bold text-gray-400">80-95%</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <div className="w-2 h-2 rounded-full bg-rose-500" />
                          <span className="text-[9px] font-bold text-gray-400">{'<80%'}</span>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-2">
                      {report.posBreakdown.slice(0, 10).map((pos: POSMetrics, i: number) => {
                        const maxCount = report.posBreakdown[0]?.count || 1;
                        const barWidth = (pos.count / maxCount) * 100;
                        const barColor = pos.successRate >= 95 ? 'bg-emerald-500' : pos.successRate >= 80 ? 'bg-amber-500' : 'bg-rose-500';

                        return (
                          <div key={i} className="flex items-center gap-3">
                            {/* Rank */}
                            <span className="w-5 text-[10px] font-bold text-gray-400 text-right">{i + 1}</span>

                            {/* Site Name */}
                            <span className="w-32 text-xs font-semibold text-gray-700 dark:text-gray-300 truncate" title={pos.posName}>
                              {pos.posName}
                            </span>

                            {/* Bar */}
                            <div className="flex-1 h-5 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden relative">
                              <div
                                className={cn("h-full rounded-full", barColor)}
                                style={{ width: `${barWidth}%` }}
                              />
                              <span className="absolute inset-0 flex items-center justify-end pr-2 text-[10px] font-bold text-gray-600 dark:text-gray-400">
                                {formatNumber(pos.count)}
                              </span>
                            </div>

                            {/* Success Rate */}
                            <span className={cn(
                              "w-14 text-right text-xs font-bold",
                              pos.successRate >= 95 ? "text-emerald-600" : pos.successRate >= 80 ? "text-amber-600" : "text-rose-600"
                            )}>
                              {pos.successRate.toFixed(1)}%
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </ChartCard>
              )}

              {/* Event Breakdown Table */}
              {report.eventMetrics.length > 0 && (
                <ChartCard title="Event Breakdown" icon={<Activity className="h-5 w-5 text-indigo-500" />} badge={`${report.eventMetrics.length} events`}>
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-6 pr-2">
                    <div className="flex items-center gap-2">
                      <Button
                        variant={filterErrorsOnly ? "default" : "outline"}
                        size="sm"
                        onClick={() => setFilterErrorsOnly(!filterErrorsOnly)}
                        className={cn("gap-2 h-9 px-4 rounded-full font-bold ",
                          filterErrorsOnly ? "bg-red-600 hover:bg-red-700 shadow-lg shadow-red-500/20" : "bg-white/40 dark:bg-gray-800/40 ")}
                      >
                        <Flame className={cn("h-4 w-4", filterErrorsOnly && "animate-pulse")} />
                        FAILURE POINTS ONLY
                        {filterErrorsOnly && <span className="ml-1 w-2 h-2 rounded-full bg-white animate-ping" />}
                      </Button>
                    </div>

                    <div className="flex items-center gap-4">
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Sort Intelligence:</p>
                      <div className="flex p-1 bg-white/40 dark:bg-gray-800/40  border border-white/40 dark:border-gray-700/40 rounded-full shadow-sm">
                        {(['total', 'failures', 'rate', 'trend'] as const).map((opt) => (
                          <button
                            key={opt}
                            onClick={() => setSortBy(opt)}
                            className={cn(
                              "px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-wider ",
                              sortBy === opt
                                ? "bg-indigo-600 text-white shadow-md scale-105"
                                : "text-gray-500 hover:text-gray-900 dark:hover:text-white"
                            )}
                          >
                            {opt}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b-2 border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
                          <th className="text-left py-2.5 px-3 font-semibold text-gray-600 dark:text-gray-400 text-xs uppercase tracking-wider">Event Name</th>
                          <th className="text-right py-2.5 px-3 font-semibold text-gray-600 dark:text-gray-400 text-xs uppercase tracking-wider cursor-pointer hover:text-indigo-600" onClick={() => setSortBy('total')}>Total</th>
                          <th className="text-right py-2.5 px-3 font-semibold text-gray-600 dark:text-gray-400 text-xs uppercase tracking-wider">Success</th>
                          <th className="text-right py-2.5 px-3 font-semibold text-gray-600 dark:text-gray-400 text-xs uppercase tracking-wider cursor-pointer hover:text-red-600" onClick={() => setSortBy('failures')}>Failures</th>
                          <th className="text-right py-2.5 px-3 font-semibold text-gray-600 dark:text-gray-400 text-xs uppercase tracking-wider cursor-pointer hover:text-emerald-600" onClick={() => setSortBy('rate')}>Rate</th>
                          <th className="text-right py-2.5 px-3 font-semibold text-gray-600 dark:text-gray-400 text-xs uppercase tracking-wider">Trend</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(showAllEvents ? sortedEvents : sortedEvents.slice(0, 15)).map((event, i) => (
                          <tr key={event.eventId} className={cn("border-b border-gray-100 dark:border-gray-800  hover:bg-indigo-50/50 dark:hover:bg-indigo-950/20 pdf-page-break-avoid", event.isErrorEvent && "bg-red-50/30 dark:bg-red-950/10")}>
                            <td className="py-2 px-3">
                              <div className="flex items-center gap-2">
                                <span className={cn("w-2 h-2 rounded-full", event.isErrorEvent ? "bg-red-500" : event.isApiEvent ? "bg-blue-500" : "bg-emerald-500")} />
                                <span className="font-extrabold text-gray-900 dark:text-white truncate max-w-[200px]" title={event.eventName}>{event.eventName}</span>
                                {event.isApiEvent && <span className="px-1.5 py-0.5 text-[10px] font-bold bg-blue-100 text-blue-600 rounded">API</span>}
                                {event.isErrorEvent && <span className="px-1.5 py-0.5 text-[10px] font-bold bg-red-100 text-red-600 rounded">ERROR</span>}
                              </div>
                            </td>
                            <td className="py-2 px-3 text-right font-mono text-gray-700 dark:text-gray-300">{formatNumber(event.totalCount)}</td>
                            <td className="py-2 px-3 text-right font-mono text-emerald-600">{formatNumber(event.successCount)}</td>
                            <td className="py-2 px-3 text-right">
                              <span className={cn("font-mono px-2 py-0.5 rounded-full text-xs font-semibold", event.failCount === 0 ? "bg-emerald-100 text-emerald-700" : event.failCount < 100 ? "bg-amber-100 text-amber-700" : "bg-red-100 text-red-700")}>
                                {formatNumber(event.failCount)}
                              </span>
                            </td>
                            <td className="py-2 px-3 text-right">
                              <div className="flex items-center justify-end gap-2">
                                <div className="w-14 h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                                  <div className={cn("h-full rounded-full", event.successRate >= 95 ? "bg-emerald-500" : event.successRate >= 80 ? "bg-amber-500" : "bg-red-500")} style={{ width: `${event.successRate}%` }} />
                                </div>
                                <span className={cn("font-semibold text-xs w-11 text-right", event.successRate >= 95 ? "text-emerald-600" : event.successRate >= 80 ? "text-amber-600" : "text-red-600")}>
                                  {event.successRate.toFixed(1)}%
                                </span>
                              </div>
                            </td>
                            <td className="py-2 px-3 text-right">
                              <span className={cn("inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold", event.trend === 'up' && "bg-emerald-100 text-emerald-700", event.trend === 'down' && "bg-red-100 text-red-700", event.trend === 'stable' && "bg-gray-100 text-gray-700")}>
                                {event.trend === 'up' && <ArrowUpRight className="h-3 w-3" />}
                                {event.trend === 'down' && <ArrowDownRight className="h-3 w-3" />}
                                {event.trend === 'stable' && <Minus className="h-3 w-3" />}
                                {event.trendPercentage.toFixed(1)}%
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {sortedEvents.length > 15 && (
                      <div className="mt-3 flex justify-center">
                        <Button variant="outline" size="sm" onClick={() => setShowAllEvents(!showAllEvents)} className="gap-2">
                          {showAllEvents ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                          {showAllEvents ? 'Show Less' : `Show ${sortedEvents.length - 15} More`}
                        </Button>
                      </div>
                    )}
                  </div>
                </ChartCard>
              )}

              {/* Critical Alerts - Responsive */}
              {report.criticalAlerts.length > 0 && (
                <div className="bg-gradient-to-r from-red-50 to-rose-50 dark:from-red-950/20 dark:to-rose-950/20 rounded-xl p-4 sm:p-6 border border-red-200 dark:border-red-800/50">
                  <div className="flex items-center gap-2 mb-3 sm:mb-4">
                    <AlertTriangle className="h-4 w-4 sm:h-5 sm:w-5 text-red-500" />
                    <h3 className="font-bold text-red-700 dark:text-red-400 text-sm sm:text-base">Critical Alerts</h3>
                    <span className="px-2 py-0.5 bg-red-200 dark:bg-red-900/50 text-red-700 dark:text-red-400 text-[10px] sm:text-xs font-bold rounded-full">{report.executiveSummary.criticalAlertsCount} total</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 sm:gap-3">
                    {report.criticalAlerts.slice(0, 6).map((alert: CriticalAlertInfo, i: number) => (
                      <div key={i} className="bg-white dark:bg-gray-800 rounded-lg p-3 flex items-center gap-3 border border-red-100 dark:border-red-900/30">
                        <div className={cn("w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0", alert.severity === 'critical' && "bg-red-100", alert.severity === 'high' && "bg-orange-100", alert.severity === 'medium' && "bg-amber-100", alert.severity === 'low' && "bg-yellow-100")}>
                          <AlertTriangle className={cn("h-4 w-4", alert.severity === 'critical' && "text-red-500", alert.severity === 'high' && "text-orange-500", alert.severity === 'medium' && "text-amber-500", alert.severity === 'low' && "text-yellow-500")} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-extrabold text-gray-900 dark:text-white truncate text-sm">{alert.eventName}</p>
                          <p className="text-xs text-gray-500 font-bold">{alert.alertCount} alerts • <span className="uppercase">{alert.severity}</span></p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Footer */}
              <div className="text-center pt-6 border-t border-gray-100 dark:border-gray-800">
                <p className="text-sm text-gray-500">Report generated by <span className="font-bold text-indigo-600">Buyhatke Analytics</span> • Powered by AI</p>
                <p className="text-xs text-gray-400 mt-1">Report ID: {report.reportId}</p>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-96">
              <FileText className="h-16 w-16 text-gray-300 mb-4" />
              <p className="text-gray-500">No report data available</p>
              <Button onClick={generateReport} className="mt-4">Generate Report</Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ==================== SUB COMPONENTS ====================

function LoadingState({ featureName }: { featureName: string }) {
  return (
    <div className="flex flex-col items-center justify-center h-80 gap-4">
      {/* Spinner with inline style for maximum compatibility */}
      <div
        className="w-10 h-10 rounded-full animate-spin"
        style={{
          border: '3px solid',
          borderColor: 'rgb(229 231 235)',
          borderTopColor: '#6366f1'
        }}
      />
      <div className="text-center">
        <p className="text-base font-semibold text-gray-900 dark:text-white">Generating Report</p>
        <p className="text-sm text-gray-500 dark:text-gray-400">Analyzing <span className="text-indigo-600 dark:text-indigo-400 font-medium">{featureName}</span>...</p>
      </div>
    </div>
  );
}

function HealthScoreCard({ score, status }: { score: number; status: string }) {
  return (
    <div className="bg-white dark:bg-gray-900 rounded-2xl p-4 sm:p-5 border border-gray-100 dark:border-gray-800 shadow-lg relative overflow-hidden group">
      <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 rounded-full -mr-16 -mt-16  group- " />
      <div className="flex items-center justify-between mb-3 sm:mb-4 relative z-10">
        <span className="text-[8px] sm:text-[10px] font-black text-gray-500 dark:text-gray-400 uppercase tracking-widest">System Health</span>
        <Shield className="h-4 w-4 text-indigo-500 drop-shadow-sm" />
      </div>
      <div className="flex items-center gap-4 sm:gap-6 relative z-10">
        <div className="relative">
          <svg className="w-16 h-16 sm:w-20 sm:h-20 transform -rotate-90" viewBox="0 0 100 100">
            <circle cx="50" cy="50" r="40" stroke="currentColor" strokeWidth="6" fill="none" className="text-gray-200 dark:text-gray-700/50" />
            <circle cx="50" cy="50" r="40" stroke={getHealthColor(score)} strokeWidth="8" fill="none" strokeDasharray={`${(score / 100) * 251.2} 251.2`} strokeLinecap="round" className="drop-shadow-[0_0_12px_rgba(0,0,0,0.2)] dark:drop-shadow-[0_0_12px_rgba(255,255,255,0.1)]" />
          </svg>
          <span className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-xl sm:text-2xl font-black text-gray-900 dark:text-white">{Math.round(score)}</span>
        </div>
        <div className="flex flex-col">
          <span className={cn("px-3 py-1.5 rounded-xl text-[8px] sm:text-[10px] font-black uppercase tracking-widest text-white shadow-xl ring-1 ring-white/20", getHealthBgClass(status))}>
            {status}
          </span>
          <p className="text-[9px] text-gray-400 dark:text-gray-500 mt-2.5 font-bold italic">Reliability Factor</p>
        </div>
      </div>
    </div>
  );
}


function MetricCard({ title, value, icon, color = 'indigo', trend }: { title: string; value: string; icon: React.ReactNode; color?: 'indigo' | 'green' | 'red' | 'amber'; trend?: 'up' | 'down' | 'stable' }) {
  const colors = {
    indigo: 'bg-indigo-500/5 dark:bg-indigo-500/10 border-indigo-200/30 dark:border-indigo-800/30',
    green: 'bg-emerald-500/5 dark:bg-emerald-500/10 border-emerald-200/30 dark:border-emerald-800/30',
    red: 'bg-rose-500/5 dark:bg-rose-500/10 border-rose-200/30 dark:border-rose-800/30',
    amber: 'bg-amber-500/5 dark:bg-amber-500/10 border-amber-200/30 dark:border-amber-800/30'
  };
  const iconColors = { indigo: 'text-indigo-500', green: 'text-emerald-500', red: 'text-rose-500', amber: 'text-amber-500' };

  return (
    <div className={cn("bg-white dark:bg-gray-900 rounded-3xl p-4 sm:p-5 border shadow-lg relative overflow-hidden group   hover:shadow-xl pdf-page-break-avoid will-change-transform", colors[color], "border-gray-100 dark:border-gray-800")}>
      <div className="flex items-center justify-between mb-3 sm:mb-4 relative z-10">
        <span className="text-[8px] sm:text-[10px] font-black text-gray-500 dark:text-gray-400 uppercase tracking-widest">{title}</span>
        <div className={cn("p-1.5 sm:p-2 rounded-xl bg-white/80 dark:bg-gray-800/80 shadow-lg  group-hover:rotate-12 ring-1 ring-black/5 dark:ring-white/10", iconColors[color])}>{icon}</div>
      </div>
      <div className="flex items-center gap-2 sm:gap-3 relative z-10">
        <span className="text-xl sm:text-3xl font-black text-gray-900 dark:text-white tracking-tighter">{value}</span>
        {trend && (
          <div className={cn("flex items-center px-2 py-1 rounded-lg text-[8px] sm:text-[10px] font-black shadow-inner", trend === 'up' ? "bg-emerald-100/60 text-emerald-600 dark:bg-emerald-900/40 dark:text-emerald-400" : trend === 'down' ? "bg-rose-100/60 text-rose-600 dark:bg-rose-900/40 dark:text-rose-400" : "bg-gray-100/60 text-gray-500 dark:bg-gray-800/40 dark:text-gray-400")}>
            {trend === 'up' ? <ArrowUpRight className="h-2.5 w-2.5 sm:h-3 sm:w-3" /> : trend === 'down' ? <ArrowDownRight className="h-2.5 w-2.5 sm:h-3 sm:w-3" /> : <Minus className="h-2.5 w-2.5 sm:h-3 sm:w-3" />}
          </div>
        )}
      </div>
      <div className="absolute -bottom-6 -right-6 w-24 h-24 bg-current opacity-[0.03] rounded-full " />
    </div>
  );
}

function AIAnalysisSection({ aiAnalysis, generatingAI, onRegenerate }: { aiAnalysis: AIAnalysisResult | null; generatingAI: boolean; onRegenerate: () => void }) {
  return (
    <div className="bg-gradient-to-br from-indigo-500/10 via-violet-500/5 to-fuchsia-500/10 dark:from-indigo-900/20 dark:via-violet-900/10 dark:to-fuchsia-900/20  rounded-3xl p-6 border border-indigo-200/50 dark:border-indigo-800/30 shadow-2xl shadow-indigo-500/5">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-2xl bg-indigo-500 shadow-lg shadow-indigo-500/20">
            <Sparkles className="h-5 w-5 text-white" />
          </div>
          <h2 className="text-xl font-black text-gray-900 dark:text-white tracking-tight">AI-Powered Intelligence</h2>
        </div>
        <Button variant="outline" size="sm" onClick={onRegenerate} disabled={generatingAI} className="h-9 px-4 rounded-full bg-white/40 dark:bg-gray-800/40  border-white/40 dark:border-gray-700/40 gap-2 font-bold hover:bg-white/60 dark:hover:bg-gray-700/60  text-gray-700 dark:text-gray-200">
          <RefreshCw className={cn("h-4 w-4", generatingAI && "animate-spin")} />
          Regenerate
        </Button>
      </div>

      {generatingAI ? (
        <div className="flex items-center gap-3 py-6">
          <div className="w-5 h-5 border-2 border-indigo-300 border-t-indigo-600 rounded-full animate-spin" />
          <span className="text-gray-600 dark:text-gray-400">Analyzing data with AI...</span>
        </div>
      ) : aiAnalysis && (
        <div className="space-y-4">
          {/* Executive Summary */}
          <div className="bg-white/60 dark:bg-gray-800/40  rounded-2xl p-5 border border-white/60 dark:border-white/5 shadow-lg">
            <h3 className="text-[10px] font-black text-gray-500 dark:text-gray-400 uppercase tracking-widest mb-3">Executive Summary</h3>
            <p className="text-sm text-gray-800 dark:text-gray-200 leading-relaxed font-medium">{formatAIText(aiAnalysis.executiveSummary)}</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Key Successes */}
            <div className="bg-emerald-500/10 dark:bg-emerald-500/5  rounded-2xl p-5 border border-emerald-500/20 dark:border-emerald-500/10 shadow-lg group/item  ">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-1.5 rounded-lg bg-emerald-500 shadow-lg shadow-emerald-500/20 group-hover/item:scale-110 ">
                  <CheckCircle className="h-4 w-4 text-white" />
                </div>
                <h3 className="font-extrabold text-gray-900 dark:text-white text-sm tracking-tight">Key Successes</h3>
              </div>
              <ul className="space-y-2">
                {aiAnalysis.keySuccesses.slice(0, 4).map((s: string, i: number) => (
                  <li key={i} className="flex items-start gap-2.5 text-[11px] text-gray-700 dark:text-gray-300 font-bold">
                    <span className="text-emerald-500 font-black mt-0.5">✓</span>
                    <span className="leading-relaxed">{formatAIText(s)}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Critical Issues */}
            <div className="bg-red-500/10 dark:bg-red-500/5  rounded-2xl p-5 border border-red-500/20 dark:border-red-500/10 shadow-lg group/item  ">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-1.5 rounded-lg bg-red-500 shadow-lg shadow-red-500/20 group-hover/item:scale-110 ">
                  <AlertTriangle className="h-4 w-4 text-white" />
                </div>
                <h3 className="font-extrabold text-gray-900 dark:text-white text-sm tracking-tight">Critical Issues</h3>
              </div>
              <ul className="space-y-2">
                {aiAnalysis.criticalIssues.slice(0, 4).map((issue: string, i: number) => (
                  <li key={i} className="flex items-start gap-2.5 text-[11px] text-gray-700 dark:text-gray-300 font-bold">
                    <span className="text-red-500 font-black mt-0.5">!</span>
                    <span className="leading-relaxed">{formatAIText(issue)}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Action Items */}
          <div className="bg-indigo-500/5 dark:bg-indigo-500/5  rounded-2xl p-5 border border-indigo-500/20 dark:border-indigo-500/10 shadow-lg">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-1.5 rounded-lg bg-indigo-600 shadow-lg shadow-indigo-600/20">
                <Target className="h-4 w-4 text-white" />
              </div>
              <h3 className="font-extrabold text-gray-900 dark:text-white text-sm tracking-tight">Strategic Action Items</h3>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {aiAnalysis.recommendations.slice(0, 6).map((rec: string, i: number) => (
                <div key={i} className="flex items-start gap-3 text-[11px] text-gray-700 dark:text-gray-300 p-3 bg-white/40 dark:bg-gray-800/40  rounded-xl border border-white/60 dark:border-white/5 shadow-sm hover:translate-x-1  font-bold">
                  <span className="bg-gradient-to-br from-indigo-500 to-violet-600 text-white rounded-lg w-5 h-5 flex items-center justify-center text-[10px] font-black flex-shrink-0 shadow-md ring-1 ring-white/20">{i + 1}</span>
                  <span className="leading-relaxed">{formatAIText(rec)}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Risk + Insights */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white/40 dark:bg-gray-800/20  rounded-2xl p-5 border border-white/60 dark:border-white/5 shadow-lg">
              <div className="flex items-center justify-between mb-3 border-b border-gray-100 dark:border-gray-800 pb-2">
                <div className="flex items-center gap-2">
                  <Shield className="h-4 w-4 text-purple-500" />
                  <h4 className="font-black text-[10px] uppercase tracking-widest text-gray-500">Risk Profile</h4>
                </div>
                <span className={cn("px-2.5 py-1 rounded-lg text-[9px] font-black uppercase ring-1 ring-inset",
                  aiAnalysis.riskAssessment.level === 'low' && "bg-emerald-100 text-emerald-700 ring-emerald-500/20",
                  aiAnalysis.riskAssessment.level === 'medium' && "bg-amber-100 text-amber-700 ring-amber-500/20",
                  aiAnalysis.riskAssessment.level === 'high' && "bg-orange-100 text-orange-700 ring-orange-500/20",
                  aiAnalysis.riskAssessment.level === 'critical' && "bg-red-100 text-red-700 ring-red-500/20")}>
                  {aiAnalysis.riskAssessment.level}
                </span>
              </div>
              <ul className="space-y-2">
                {aiAnalysis.riskAssessment.factors.slice(0, 3).map((f: string, i: number) => (
                  <li key={i} className="text-[10px] text-gray-600 dark:text-gray-400 flex items-start gap-2 font-bold leading-tight">
                    <span className="text-purple-500 mt-1">•</span>
                    <span>{formatAIText(f)}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="bg-white/40 dark:bg-gray-800/20  rounded-2xl p-5 border border-white/60 dark:border-white/5 shadow-lg">
              <div className="flex items-center gap-2 mb-3 border-b border-gray-100 dark:border-gray-800 pb-2">
                <TrendingUp className="h-4 w-4 text-indigo-500" />
                <h4 className="font-black text-[10px] uppercase tracking-widest text-gray-500">Trajectory</h4>
              </div>
              <p className="text-[10px] text-gray-700 dark:text-gray-300 leading-relaxed font-bold italic line-clamp-4">{formatAIText(aiAnalysis.trendsAnalysis)}</p>
            </div>

            <div className="bg-white/40 dark:bg-gray-800/20  rounded-2xl p-5 border border-white/60 dark:border-white/5 shadow-lg">
              <div className="flex items-center gap-2 mb-3 border-b border-gray-100 dark:border-gray-800 pb-2">
                <Zap className="h-4 w-4 text-amber-500" />
                <h4 className="font-black text-[10px] uppercase tracking-widest text-gray-500">Forecast</h4>
              </div>
              <p className="text-[10px] text-gray-700 dark:text-gray-300 leading-relaxed font-bold italic line-clamp-4">{formatAIText(aiAnalysis.predictiveOutlook)}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ChartCardRaw({ title, icon, children, badge, badgeColor = 'indigo', collapsible, expanded, onToggle }: {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  badge?: string;
  badgeColor?: 'indigo' | 'red';
  collapsible?: boolean;
  expanded?: boolean;
  onToggle?: () => void;
}) {
  return (
    <div className="bg-white dark:bg-gray-900 shadow-xl rounded-3xl p-4 sm:p-6 border border-gray-100 dark:border-gray-800 relative overflow-visible pdf-page-break-avoid will-change-transform content-visibility-auto">
      <div className="absolute top-0 left-0 w-1 bg-gradient-to-b from-indigo-500 via-violet-600 to-fuchsia-600 h-full opacity-60" />
      <div className="flex items-center justify-between mb-4 sm:mb-6 relative z-10">
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="p-1.5 sm:p-2.5 rounded-2xl bg-indigo-50/50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 shadow-sm border border-indigo-100/50 dark:border-indigo-800/50">
            {icon}
          </div>
          <div>
            <h3 className="text-base sm:text-lg font-black text-gray-900 dark:text-white tracking-tight leading-tight">{title}</h3>
            {badge && (
              <span className={cn(
                "inline-flex items-center px-1.5 py-0.5 rounded-md text-[8px] sm:text-[10px] font-black uppercase tracking-wider mt-0.5",
                badgeColor === 'indigo' ? "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300" : "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300"
              )}>
                {badge}
              </span>
            )}
          </div>
        </div>
        {collapsible && (
          <button onClick={onToggle} className="p-1.5 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800/50 ">
            {expanded ? <ChevronUp className="h-5 w-5 text-gray-400" /> : <ChevronDown className="h-5 w-5 text-gray-400" />}
          </button>
        )}
      </div>
      <div className={cn("relative z-10", !expanded && collapsible && "hidden")}>
        {children}
      </div>
    </div>
  );
}


// Optimized Chart Card with Memoization
const ChartCard = React.memo(ChartCardRaw);

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <span className="flex items-center gap-1.5 text-xs text-gray-500">
      <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: color }} />
      {label}
    </span>
  );
}

function SiteCard({ name, count, percentage, successRate, failCount, image }: { name: string; count: number; percentage: number; successRate: number; failCount: number; image?: string }) {
  const [imgError, setImgError] = React.useState(false);
  const logoUrl = getSiteLogo(name, image);

  return (
    <div className="flex items-center gap-3 p-3 bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm   hover:shadow-md group">
      <div className="w-9 h-9 rounded-lg bg-white dark:bg-gray-700 flex items-center justify-center overflow-hidden flex-shrink-0 shadow-sm border border-gray-100 dark:border-gray-600">
        {!imgError && logoUrl ? (
          <img
            src={logoUrl}
            alt={name}
            className="w-6 h-6 object-contain"
            onError={() => setImgError(true)}
          />
        ) : (
          <div className="w-6 h-6 rounded bg-indigo-100 dark:bg-indigo-900/50 flex items-center justify-center text-[10px] font-bold text-indigo-600 dark:text-indigo-400">
            {name.slice(0, 2).toUpperCase()}
          </div>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-extrabold text-gray-900 dark:text-white text-sm truncate group-hover:text-indigo-600 dark:group-hover:text-indigo-400 ">{name}</p>
        <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
          <span className="font-mono">{formatNumber(count)}</span>
          <span className="text-gray-300 dark:text-gray-600">•</span>
          <span className="font-bold text-indigo-500 dark:text-indigo-400">{percentage.toFixed(1)}%</span>
          <span className="text-gray-300 dark:text-gray-600">•</span>
          <span className={cn("font-bold", successRate >= 95 ? "text-emerald-500" : successRate >= 80 ? "text-amber-500" : "text-red-500")}>{successRate.toFixed(1)}%✓</span>
          {failCount > 0 && <span className="text-red-500 font-mono">({formatNumber(failCount)} ✗)</span>}
        </div>
      </div>
      <div className="w-12 h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
        <div className="h-full bg-gradient-to-r from-indigo-500 to-violet-500 rounded-full" style={{ width: `${Math.min(percentage * 2, 100)}%` }} />
      </div>
    </div>
  );
}
