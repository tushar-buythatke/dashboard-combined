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
            className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-md rounded-lg shadow-lg border border-slate-200/60 dark:border-slate-700/60 p-3 min-w-[160px] max-w-[200px]"
        >
            <div className="flex items-center gap-2.5 mb-2">
                <div
                    className="w-2.5 h-2.5 rounded-sm flex-shrink-0"
                    style={{ backgroundColor: payload[0]?.payload?.fill || PIE_COLORS[0] }}
                />
                <span className="font-medium text-sm text-slate-900 dark:text-slate-100 truncate">
                    {data.name}
                </span>
            </div>
            <div className="space-y-1">
                <div className="flex justify-between items-center">
                    <span className="text-xs text-slate-600 dark:text-slate-400">{getMetricLabel()}</span>
                    <span className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                        {formatValue(data.value)}
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
};
