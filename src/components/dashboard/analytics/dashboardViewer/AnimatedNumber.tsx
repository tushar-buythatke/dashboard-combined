import React, { useEffect, useState } from 'react';

export const AnimatedNumber = ({
    value,
    suffix = '',
    prefix = '',
    className = ''
}: {
    value: number;
    suffix?: string;
    prefix?: string;
    className?: string;
}) => {
    const [displayValue, setDisplayValue] = useState(0);

    useEffect(() => {
        const duration = 150;
        const startValue = displayValue;
        const diff = value - startValue;

        if (diff === 0) return;

        const startTime = performance.now();
        let frameId: number;

        const tick = (now: number) => {
            const elapsed = now - startTime;
            const t = Math.min(1, elapsed / duration);
            const eased = 1 - Math.pow(1 - t, 3);
            const next = Math.round(startValue + diff * eased);
            setDisplayValue(next);
            if (t < 1) {
                frameId = requestAnimationFrame(tick);
            }
        };

        frameId = requestAnimationFrame(tick);
        return () => cancelAnimationFrame(frameId);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [value]);

    return (
        <span className={className}>
            {prefix}
            {displayValue.toLocaleString()}
            {suffix}
        </span>
    );
};
