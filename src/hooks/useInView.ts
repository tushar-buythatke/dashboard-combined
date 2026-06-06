/**
 * useInView — scroll-triggered entrance via IntersectionObserver (Foundation).
 *
 * Returns a ref to attach and an `inView` flag. Pair with a transition:
 *   const { ref, inView } = useInView<HTMLDivElement>();
 *   <div ref={ref} style={{ opacity: inView ? 1 : 0,
 *     transform: inView ? 'none' : 'translateY(20px)',
 *     transition: `opacity 400ms var(--ease-out-expo) ${delay}ms,
 *                   transform 400ms var(--ease-out-expo) ${delay}ms` }} />
 *
 * Respects `prefers-reduced-motion` (reports inView immediately) and defaults to
 * triggering once.
 */
import { useEffect, useRef, useState } from 'react';

export interface UseInViewOptions {
    /** Visible fraction needed to trigger (default 0.12). */
    threshold?: number;
    /** Root margin, e.g. trigger slightly early (default '0px 0px -10% 0px'). */
    rootMargin?: string;
    /** Disconnect after first trigger (default true). */
    once?: boolean;
}

function prefersReducedMotion(): boolean {
    return (
        typeof window !== 'undefined' &&
        typeof window.matchMedia === 'function' &&
        window.matchMedia('(prefers-reduced-motion: reduce)').matches
    );
}

export function useInView<T extends HTMLElement = HTMLElement>(
    options: UseInViewOptions = {},
) {
    const { threshold = 0.12, rootMargin = '0px 0px -10% 0px', once = true } = options;
    const ref = useRef<T | null>(null);
    const [inView, setInView] = useState(false);

    useEffect(() => {
        const node = ref.current;
        if (!node) return;

        // No motion preference, or no IO support → show immediately.
        if (prefersReducedMotion() || typeof IntersectionObserver === 'undefined') {
            setInView(true);
            return;
        }

        const observer = new IntersectionObserver(
            (entries) => {
                entries.forEach((entry) => {
                    if (entry.isIntersecting) {
                        setInView(true);
                        if (once) observer.disconnect();
                    } else if (!once) {
                        setInView(false);
                    }
                });
            },
            { threshold, rootMargin },
        );

        observer.observe(node);
        return () => observer.disconnect();
    }, [threshold, rootMargin, once]);

    return { ref, inView };
}

export default useInView;
