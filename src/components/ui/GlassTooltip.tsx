/**
 * GlassTooltip — premium floating tooltip for Recharts charts (Foundation).
 *
 * Dark glass card, blur, rounded, with a colored left border matching the
 * hovered series. Pass via `content={<GlassTooltip />}` on any Recharts
 * `<Tooltip>`. Optional `formatter` / `labelFormatter` mirror Recharts' API.
 *
 *   <Tooltip content={<GlassTooltip valueSuffix="%" />} cursor={...} />
 */
import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

export interface GlassTooltipProps {
    /** Injected by Recharts. */
    active?: boolean;
    payload?: Array<{
        name?: string | number;
        value?: number | string;
        color?: string;
        dataKey?: string | number;
        payload?: Record<string, unknown>;
    }>;
    label?: string | number;
    /** Format a single value (and its series name). */
    formatter?: (value: number | string, name: string | number, color: string) => ReactNode;
    /** Format the header label. */
    labelFormatter?: (label: string | number) => ReactNode;
    /** Appended to raw values when no `formatter` is given. */
    valueSuffix?: string;
    className?: string;
}

function defaultFormatNumber(value: number | string): string {
    if (typeof value === 'number') return new Intl.NumberFormat().format(value);
    return String(value);
}

export function GlassTooltip({
    active,
    payload,
    label,
    formatter,
    labelFormatter,
    valueSuffix = '',
    className,
}: GlassTooltipProps) {
    if (!active || !payload || payload.length === 0) return null;

    const accentColor = payload[0]?.color || 'var(--accent-primary, #6c47ff)';

    return (
        <div
            className={cn(
                'animate-scale-in min-w-[120px] max-w-[260px] overflow-hidden rounded-[12px]',
                'backdrop-blur-xl px-3.5 py-2.5',
                // Theme-aware: clean white glass in light mode, dark glass in dark mode
                'bg-white/95 dark:bg-[#10101c]/90',
                'border border-black/[0.06] dark:border-white/10',
                'shadow-[0_10px_30px_rgba(0,0,0,0.14)] dark:shadow-[0_10px_34px_rgba(0,0,0,0.5)]',
                className,
            )}
            style={{
                borderLeftColor: accentColor,
                borderLeftWidth: '3px',
            }}
        >
            {label !== undefined && label !== '' && (
                <div className="mb-1 text-[11px] font-medium uppercase tracking-wide text-slate-400 dark:text-white/55">
                    {labelFormatter ? labelFormatter(label) : label}
                </div>
            )}
            <div className="space-y-1">
                {payload.map((item, i) => {
                    const color = item.color || accentColor;
                    const name = item.name ?? item.dataKey ?? '';
                    const value = item.value ?? '';
                    return (
                        <div key={i} className="flex items-center gap-2">
                            {payload.length > 1 && (
                                <span
                                    className="h-2 w-2 shrink-0 rounded-full"
                                    style={{ background: color }}
                                />
                            )}
                            <div className="flex min-w-0 flex-1 items-baseline justify-between gap-3">
                                {payload.length > 1 && name !== '' && (
                                    <span className="truncate text-[12px] text-slate-500 dark:text-white/65">{name}</span>
                                )}
                                <span className="text-[14px] font-semibold tabular-nums text-slate-900 dark:text-white">
                                    {formatter
                                        ? formatter(value, name, color)
                                        : `${defaultFormatNumber(value)}${valueSuffix}`}
                                </span>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

export default GlassTooltip;
