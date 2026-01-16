import { PIE_COLORS } from './constants';
import { formatIsAvgValue, getIsAvgLabel } from '@/lib/formatters';

interface PieTooltipProps {
    active?: boolean;
    payload?: any[];
    totalValue?: number;
    category?: string;
    isAvgEventType?: number; // 0=count, 1=time(ms), 2=rupees
}

// Custom Pie Chart Tooltip
export const PieTooltip = ({ active, payload, totalValue, isAvgEventType = 0 }: PieTooltipProps) => {
    if (!active || !payload || !payload.length) return null;

    const data = payload[0]?.payload;
    if (!data) return null;

    const metricType = data.metricType || 'count';
    const isCount = metricType === 'count';

    // Determine the metric label based on isAvgEventType or metricType
    const getMetricLabel = () => {
        if (isCount) return 'Count';
        if (isAvgEventType === 2) return 'Amount (₹)';
        if (isAvgEventType === 1) return 'Avg Delay (ms)';
        if (metricType === 'avgDelay') return isAvgEventType === 2 ? 'Avg Amount (₹)' : 'Avg Delay (ms)';
        if (metricType === 'medianDelay') return 'Median Delay (ms)';
        if (metricType === 'modeDelay') return 'Mode Delay (ms)';
        return 'Value';
    };

    const formatValue = (v: any) => {
        const n = Number(v);
        if (!Number.isFinite(n)) return '0';

        // Prioritize count formatting
        if (isCount) return n.toLocaleString();

        // Use isAvgEventType for formatting
        if (isAvgEventType === 2) {
            return `₹${n.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
        }
        if (isAvgEventType === 1 || metricType === 'avgDelay' || metricType === 'medianDelay' || metricType === 'modeDelay') {
            if (n >= 60000) return `${(n / 60000).toFixed(2)} min`;
            if (n >= 1000) return `${(n / 1000).toFixed(2)} sec`;
            return `${n.toFixed(2)} ms`;
        }
        return n.toLocaleString();
    };

    const safeTotal = totalValue ?? 0;
    const percentage = safeTotal > 0 ? ((data.value / safeTotal) * 100).toFixed(1) : '0';

    return (
        <div
            className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-md rounded-xl shadow-2xl border border-slate-200/60 dark:border-slate-700/60 p-3.5 min-w-[200px] max-w-[240px] z-[1000]"
        >
            <div className="flex items-center gap-2.5 mb-3 border-b border-slate-100 dark:border-slate-800 pb-2">
                <div
                    className="w-3 h-3 rounded-full flex-shrink-0 shadow-sm"
                    style={{ backgroundColor: payload[0]?.payload?.fill || PIE_COLORS[0] }}
                />
                <span className="font-bold text-sm text-slate-900 dark:text-slate-100 truncate flex-1">
                    {data.name}
                </span>
            </div>
            <div className="space-y-2.5">
                <div className="flex justify-between items-end gap-4">
                    <div className="flex flex-col">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 leading-none mb-1">{getMetricLabel()}</span>
                        <span className="text-lg font-black text-slate-900 dark:text-slate-50">
                            {formatValue(data.value)}
                        </span>
                    </div>
                    <div className="flex flex-col items-end">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 leading-none mb-1">Share</span>
                        <span className="text-base font-extrabold text-indigo-600 dark:text-indigo-400">
                            {percentage}%
                        </span>
                    </div>
                </div>
            </div>
        </div>
    );
};
