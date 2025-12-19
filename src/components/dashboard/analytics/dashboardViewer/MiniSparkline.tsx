import React from 'react';

export const MiniSparkline = ({
    data,
    color,
    height = 30
}: {
    data: number[];
    color: string;
    height?: number;
}) => {
    if (!data || data.length < 2) return null;

    const max = Math.max(...data);
    const min = Math.min(...data);
    const range = max - min || 1;
    const width = 80;
    const padding = 2;

    const points = data
        .map((value, index) => {
            const x = padding + (index / (data.length - 1)) * (width - 2 * padding);
            const y = height - padding - ((value - min) / range) * (height - 2 * padding);
            return `${x},${y}`;
        })
        .join(' ');

    return (
        <svg width={width} height={height} className="overflow-visible">
            <defs>
                <linearGradient id={`sparkGradient-${color}`} x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor={color} stopOpacity={0.3} />
                    <stop offset="100%" stopColor={color} stopOpacity={0.05} />
                </linearGradient>
            </defs>
            <polyline
                points={points}
                fill="none"
                stroke={color}
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
            />
            <circle
                cx={width - padding}
                cy={height - padding - ((data[data.length - 1] - min) / range) * (height - 2 * padding)}
                r="3"
                fill={color}
            />
        </svg>
    );
};
