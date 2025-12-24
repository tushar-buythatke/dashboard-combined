// Event colors for the chart
export const EVENT_COLORS = [
    '#6366f1', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6',
    '#06b6d4', '#ec4899', '#14b8a6', '#f97316', '#84cc16',
    '#a855f7', '#3b82f6'
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

    // Convert object to array if needed (API returns objects sometimes)
    const arrayData = Array.isArray(data) ? data : Object.values(data);

    if (arrayData.length === 0) return [];

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
