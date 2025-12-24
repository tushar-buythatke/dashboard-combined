// Event colors for the chart
export const EVENT_COLORS = [
    '#6366f1', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6',
    '#06b6d4', '#ec4899', '#14b8a6', '#f97316', '#3b82f6',
    '#a855f7', '#7c3aed'
];

// Distinct color palette for error events - various shades for better distinction
// Vibrant, highly distinguishable error colors for easy identification
export const ERROR_COLORS = [
    '#ef4444',
    '#f97316',
    '#f59e0b',
    '#ec4899',
    '#a855f7',
    '#ec4899',
    '#f43f5e',
    '#fb923c',
];

export const PIE_COLORS = ['#6366f1', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#ec4899', '#14b8a6'];

// Utility function to combine duplicate entries (like multiple "Unknown") in pie chart data
export const combinePieChartDuplicates = (data: any[] | Record<string, any>): any[] => {
    if (!data) return [];

    // Handle API response format: { "0": { count: 123, ... }, "3": { count: 456, ... } }
    // OR array format: [{ name: "x", value: 123 }, { name: "y", value: 456 }]
    let arrayData: any[];

    if (Array.isArray(data)) {
        arrayData = data;
    } else {
        // Convert object to array, using keys as names
        arrayData = Object.entries(data).map(([key, item]: [string, any]) => {
            // If item already has name/value, use them; otherwise extract from API format
            return {
                name: item.name || key, // Use key as name if no name property
                value: item.value ?? item.count ?? 0, // Use value, or count from API
                metricType: item.metricType,
                // Preserve other useful properties
                platform: item.platform,
                pos: item.pos,
                source: item.source,
                sourceStr: item.sourceStr,
            };
        });
    }

    if (arrayData.length === 0) return [];

    // Now combine duplicates by name
    const combinedMap = new Map<string, { value: number; metricType?: string }>();
    arrayData.forEach((item: any) => {
        const name = item.name || 'Unknown';
        const prev = combinedMap.get(name);
        const nextValue = (prev?.value || 0) + (item.value || 0);
        combinedMap.set(name, {
            value: nextValue,
            metricType: prev?.metricType || item.metricType,
        });
    });

    return Array.from(combinedMap.entries()).map(([name, meta]) => ({ name, value: meta.value, metricType: meta.metricType }));
};

// Utility function to check if pie chart should be displayed
// Returns false if there's only 1 item (100% share) - no point showing that
export const shouldShowPieChart = (data: any[] | Record<string, any>): boolean => {
    if (!data) return false;
    const combinedData = combinePieChartDuplicates(data);
    return combinedData.length > 1;
};
