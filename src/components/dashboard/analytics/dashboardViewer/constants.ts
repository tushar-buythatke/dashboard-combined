// ========== PREMIUM CHART COLOR PALETTE ==========
// Harmonious, sophisticated colors for better visual appeal and accessibility

export const EVENT_COLORS = [
    '#6366f1', // Rich Purple
    '#3b82f6', // Vibrant Blue
    '#10b981', // Emerald Green
    '#f59e0b', // Amber
    '#ec4899', // Pink
    '#06b6d4', // Cyan
    '#a855f7', // Deep Purple
    '#14b8a6', // Teal
    '#e11d48', // Rose
    '#7c3aed', // Violet
    '#f97316', // Orange
    '#84cc16', // Lime
];

// Premium error colors - sophisticated and vibrant for better distinction
export const ERROR_COLORS = [
    '#dc2626', // Red 600 - Primary Error
    '#ea580c', // Orange 600 - Warning
    '#ca8a04', // Yellow 600 - Caution
    '#c026d3', // Fuchsia 600 - Secondary Error
    '#7c3aed', // Violet 600 - Tertiary Error
    '#0891b2', // Cyan 600 - Info Error
    '#be123c', // Rose 600 - Critical Error
    '#c2410c', // Orange 700 - Severe Warning
];

export const PIE_COLORS = [
    '#6366f1', // Rich Purple
    '#3b82f6', // Vibrant Blue
    '#10b981', // Emerald Green
    '#f59e0b', // Amber
    '#ec4899', // Pink
    '#06b6d4', // Cyan
    '#a855f7', // Deep Purple
    '#14b8a6', // Teal
    '#e11d48', // Rose
    '#7c3aed', // Violet
    '#f97316', // Orange
    '#84cc16', // Lime
];

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
        let name = item.name;
        // Fallback to ID fields if name is missing
        if (name === undefined || name === null || name === '') {
            if (item.platform !== undefined && item.platform !== null) name = String(item.platform);
            else if (item.pos !== undefined && item.pos !== null) name = String(item.pos);
            else if (item.source !== undefined && item.source !== null) name = String(item.source);
            else if (item.sourceStr !== undefined && item.sourceStr !== null) name = item.sourceStr;
        }

        name = name || 'Unknown';
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
// Now shows pie chart even for single entry (100% share) for consistency
export const shouldShowPieChart = (data: any[] | Record<string, any>): boolean => {
    if (!data) return false;
    const combinedData = combinePieChartDuplicates(data);
    return combinedData.length >= 1; // Show pie chart even for 100% single entry
};
