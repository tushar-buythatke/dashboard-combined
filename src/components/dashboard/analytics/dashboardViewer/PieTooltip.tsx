import { PIE_COLORS } from './constants';

// Custom Pie Chart Tooltip
export const PieTooltip = ({ active, payload, totalValue }: any) => {
    if (!active || !payload || !payload.length) return null;

    const data = payload[0]?.payload;
    if (!data) return null;

    const metricType = data.metricType || 'count';
    const isCount = metricType === 'count';
    const metricLabel = isCount
        ? 'Count'
        : metricType === 'avgDelay'
            ? 'Avg Delay (ms)'
            : metricType === 'medianDelay'
                ? 'Median Delay (ms)'
                : metricType === 'modeDelay'
                    ? 'Mode Delay (ms)'
                    : 'Value';

    const formatValue = (v: any) => {
        const n = Number(v);
        if (!Number.isFinite(n)) return '0';
        return isCount ? n.toLocaleString() : `${n.toFixed(2)}ms`;
    };

    const percentage = totalValue > 0 ? ((data.value / totalValue) * 100).toFixed(1) : '0';

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
                    <span className="text-xs text-slate-600 dark:text-slate-400">{metricLabel}</span>
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
