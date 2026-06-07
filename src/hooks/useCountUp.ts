/**
 * useCountUp — animated number roll-up (Foundation).
 *
 * Counts from 0 → target with easeOutQuart over `duration` ms and returns the
 * current numeric value plus a comma-formatted string. Respects
 * `prefers-reduced-motion` (jumps straight to the target).
 *
 *   const { formatted } = useCountUp(277372, { start: shouldAnimate });
 *   <span>{formatted}</span>
 */
import { useEffect, useRef, useState } from 'react';

export interface UseCountUpOptions {
    /** Gate the animation (e.g. only once the card is in view). Default true. */
    start?: boolean;
    /** Duration in ms (default 800). */
    duration?: number;
    /** Decimal places to keep (default 0). */
    decimals?: number;
}

const easeOutQuart = (t: number) => 1 - Math.pow(1 - t, 4);

function prefersReducedMotion(): boolean {
    return (
        typeof window !== 'undefined' &&
        typeof window.matchMedia === 'function' &&
        window.matchMedia('(prefers-reduced-motion: reduce)').matches
    );
}

export function useCountUp(target: number, options: UseCountUpOptions = {}) {
    const { start = true, duration = 800, decimals = 0 } = options;
    const [value, setValue] = useState(0);
    const rafRef = useRef<number | null>(null);
    const startedRef = useRef(false);

    useEffect(() => {
        if (!start) return;
        const safeTarget = Number.isFinite(target) ? target : 0;

        if (prefersReducedMotion() || duration <= 0 || typeof requestAnimationFrame === 'undefined') {
            setValue(safeTarget);
            return;
        }

        // Re-run if target changes after first animation.
        startedRef.current = true;
        const from = 0;
        const t0 = performance.now();

        const tick = (now: number) => {
            const progress = Math.min((now - t0) / duration, 1);
            const eased = easeOutQuart(progress);
            setValue(from + (safeTarget - from) * eased);
            if (progress < 1) {
                rafRef.current = requestAnimationFrame(tick);
            }
        };

        rafRef.current = requestAnimationFrame(tick);
        return () => {
            if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
        };
    }, [target, start, duration]);

    const rounded = decimals > 0
        ? Number(value.toFixed(decimals))
        : Math.round(value);

    const formatted = new Intl.NumberFormat(undefined, {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
    }).format(rounded);

    return { value: rounded, formatted };
}

export default useCountUp;
