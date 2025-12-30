/**
 * Shared formatting utilities for isAvgEvent values
 * 
 * isAvgEvent types:
 * 0 = Count (default)
 * 1 = Time/Delay (milliseconds)
 * 2 = Rupees (currency)
 * 3 = Count (average)
 */

/**
 * Format a value based on isAvgEvent type
 * @param value - The numeric value to format
 * @param isAvgEventType - The event type (0=count, 1=time, 2=rupees, 3=avg count)
 * @param forAxis - If true, return shorter format for chart axes
 */
export function formatIsAvgValue(value: number, isAvgEventType: number = 0, forAxis = false): string {
    if (!value || value <= 0) return '0';

    if (isAvgEventType === 2) {
        // Rupees
        if (forAxis) {
            if (value >= 10000000) return `₹${(value / 10000000).toFixed(1)}Cr`;
            if (value >= 100000) return `₹${(value / 100000).toFixed(1)}L`;
            if (value >= 1000) return `₹${(value / 1000).toFixed(1)}K`;
            return `₹${value.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
        }
        return `₹${value.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
    } else if (isAvgEventType === 1) {
        // Time in milliseconds
        if (value >= 60000) {
            return forAxis ? `${(value / 60000).toFixed(1)}m` : `${(value / 60000).toFixed(2)} min`;
        } else if (value >= 1000) {
            return forAxis ? `${(value / 1000).toFixed(1)}s` : `${(value / 1000).toFixed(2)} sec`;
        }
        return forAxis ? `${value.toFixed(0)}ms` : `${value.toFixed(2)} ms`;
    }

    // Default: count
    if (forAxis) {
        if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
        if (value >= 1000) return `${(value / 1000).toFixed(1)}K`;
    }
    return value.toLocaleString();
}

/**
 * Get the label for a metric based on isAvgEvent type
 */
export function getIsAvgLabel(isAvgEventType: number = 0): string {
    switch (isAvgEventType) {
        case 2: return 'Amount (₹)';
        case 1: return 'Avg Delay (ms)';
        case 3: return 'Avg Count';
        default: return 'Count';
    }
}

/**
 * Get the total label for a metric based on isAvgEvent type
 */
export function getIsAvgTotalLabel(isAvgEventType: number = 0): string {
    switch (isAvgEventType) {
        case 2: return 'Total (₹)';
        case 1: return 'Total (ms)';
        case 3: return 'Total Avg';
        default: return 'Total Entries';
    }
}

/**
 * Get the unit suffix for a metric based on isAvgEvent type
 */
export function getIsAvgUnit(isAvgEventType: number = 0): string {
    switch (isAvgEventType) {
        case 2: return '₹';
        case 1: return 'ms';
        default: return '';
    }
}
