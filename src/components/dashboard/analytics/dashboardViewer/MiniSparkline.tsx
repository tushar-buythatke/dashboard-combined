import { useId } from 'react';

export const MiniSparkline = ({
    data,
    color,
    height = 36
}: {
    data: number[];
    color: string;
    height?: number;
}) => {
    const gid = useId().replace(/:/g, '');
    if (!data || data.length < 2) return null;

    const max = Math.max(...data);
    const min = Math.min(...data);
    const range = max - min || 1;
    const width = 96;
    const padding = 3;
    const pts = data.map((value, index) => [
        padding + (index / (data.length - 1)) * (width - 2 * padding),
        height - padding - ((value - min) / range) * (height - 2 * padding),
    ]);
    const line = pts.map((p) => p.join(',')).join(' ');
    const last = pts[pts.length - 1];

    return (
        <svg width={width} height={height} className="flex-none overflow-visible">
            <defs>
                <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={color} stopOpacity={0.26} />
                    <stop offset="100%" stopColor={color} stopOpacity={0} />
                </linearGradient>
            </defs>
            <polygon points={`${pts[0][0]},${height} ${line} ${last[0]},${height}`} fill={`url(#${gid})`} />
            <polyline points={line} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            <circle cx={last[0]} cy={last[1]} r="3.5" fill={color} stroke="var(--e-surface)" strokeWidth="2" />
        </svg>
    );
};
