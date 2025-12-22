import React from 'react';
import { PercentageGraph } from './PercentageGraph';

interface MultiPercentageGraphProps {
    data: any[];
    dateRange?: { from: Date; to: Date };
    parentEvents: string[];
    childEvents: string[];
    eventColors: Record<string, string>;
    eventNames: Record<string, string>;
    filters?: {
        statusCodes: string[];
        cacheStatus: string[];
    };
    showCombinedPercentage?: boolean;
    isHourly?: boolean;
    onToggleBackToFunnel?: () => void;
}

/**
 * Wrapper component that renders separate PercentageGraph for each child/parent pair
 */
export function MultiPercentageGraph({
    data,
    dateRange,
    parentEvents,
    childEvents,
    eventColors,
    eventNames,
    filters,
    showCombinedPercentage = true,
    isHourly = true,
    onToggleBackToFunnel,
}: MultiPercentageGraphProps) {
    // Render a separate chart for each child event
    return (
        <div className="space-y-6">
            {childEvents.map((childEventId, index) => (
                <PercentageGraph
                    key={`percentage-${childEventId}-${index}`}
                    data={data}
                    dateRange={dateRange}
                    parentEvents={parentEvents}
                    childEvents={[childEventId]} // Pass only ONE child event
                    eventColors={eventColors}
                    eventNames={eventNames}
                    filters={filters}
                    showCombinedPercentage={showCombinedPercentage}
                    isHourly={isHourly}
                    onToggleBackToFunnel={onToggleBackToFunnel}
                />
            ))}
        </div>
    );
}
