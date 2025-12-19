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
export const combinePieChartDuplicates = (data: any[]): any[] => {
    if (!data || !Array.isArray(data) || data.length === 0) return [];

    const combinedMap = new Map<string, number>();
    data.forEach(item => {
        const name = item.name || 'Unknown';
        combinedMap.set(name, (combinedMap.get(name) || 0) + (item.value || 0));
    });

    return Array.from(combinedMap.entries()).map(([name, value]) => ({ name, value }));
};

// Utility function to check if pie chart should be displayed
// Returns false if there's only 1 item (100% share) - no point showing that
export const shouldShowPieChart = (data: any[]): boolean => {
    if (!data || data.length === 0) return false;
    const combinedData = combinePieChartDuplicates(data);
    return combinedData.length > 1;
};
