import { useEffect, useCallback } from 'react';

/**
 * Keyboard navigation hook for chart interactions
 * Provides arrow key navigation and Enter/Space for selection
 */
export function useChartKeyboardNav(options: {
    onNext?: () => void;
    onPrevious?: () => void;
    onSelect?: () => void;
    onEscape?: () => void;
    enabled?: boolean;
}) {
    const { onNext, onPrevious, onSelect, onEscape, enabled = true } = options;

    const handleKeyDown = useCallback(
        (event: KeyboardEvent) => {
            if (!enabled) return;

            switch (event.key) {
                case 'ArrowRight':
                case 'ArrowDown':
                    event.preventDefault();
                    onNext?.();
                    break;
                case 'ArrowLeft':
                case 'ArrowUp':
                    event.preventDefault();
                    onPrevious?.();
                    break;
                case 'Enter':
                case ' ':
                    event.preventDefault();
                    onSelect?.();
                    break;
                case 'Escape':
                    event.preventDefault();
                    onEscape?.();
                    break;
            }
        },
        [enabled, onNext, onPrevious, onSelect, onEscape]
    );

    useEffect(() => {
        if (!enabled) return;

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [enabled, handleKeyDown]);
}

/**
 * ARIA label generators for charts
 */
export const chartAriaLabels = {
    pieChart: (category: string, value: number, percentage: number, total: number) =>
        `${category}: ${value.toLocaleString()} of ${total.toLocaleString()} (${percentage.toFixed(1)}%)`,

    funnelStage: (stageName: string, count: number, percentage: number, dropoff?: number) =>
        dropoff
            ? `${stageName}: ${count.toLocaleString()} users (${percentage.toFixed(1)}%), ${dropoff.toFixed(1)}% drop-off from previous stage`
            : `${stageName}: ${count.toLocaleString()} users (${percentage.toFixed(1)}%)`,

    barChart: (label: string, value: number, max: number) =>
        `${label}: ${value.toLocaleString()} (${((value / max) * 100).toFixed(1)}% of maximum)`,

    lineChart: (date: string, value: number, trend?: 'up' | 'down') =>
        trend
            ? `${date}: ${value.toLocaleString()}, trending ${trend}`
            : `${date}: ${value.toLocaleString()}`,

    zoomControl: (zoomLevel: number) =>
        `Zoom level: ${Math.round(zoomLevel * 100)}%`,
};

/**
 * Focus management utilities
 */
export const focusManagement = {
    /**
     * Trap focus within a container (for modals)
     */
    trapFocus: (container: HTMLElement) => {
        const focusableElements = container.querySelectorAll<HTMLElement>(
            'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        const firstElement = focusableElements[0];
        const lastElement = focusableElements[focusableElements.length - 1];

        const handleTabKey = (e: KeyboardEvent) => {
            if (e.key !== 'Tab') return;

            if (e.shiftKey) {
                if (document.activeElement === firstElement) {
                    e.preventDefault();
                    lastElement?.focus();
                }
            } else {
                if (document.activeElement === lastElement) {
                    e.preventDefault();
                    firstElement?.focus();
                }
            }
        };

        container.addEventListener('keydown', handleTabKey);
        firstElement?.focus();

        return () => container.removeEventListener('keydown', handleTabKey);
    },

    /**
     * Restore focus to a previously focused element
     */
    restoreFocus: (element: HTMLElement | null) => {
        element?.focus();
    },
};

/**
 * Announce changes to screen readers
 */
export function announceToScreenReader(message: string, priority: 'polite' | 'assertive' = 'polite') {
    const announcement = document.createElement('div');
    announcement.setAttribute('role', 'status');
    announcement.setAttribute('aria-live', priority);
    announcement.setAttribute('aria-atomic', 'true');
    announcement.className = 'sr-only';
    announcement.textContent = message;

    document.body.appendChild(announcement);

    setTimeout(() => {
        document.body.removeChild(announcement);
    }, 1000);
}
