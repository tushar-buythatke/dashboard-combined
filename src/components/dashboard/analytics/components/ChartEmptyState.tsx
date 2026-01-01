import React from 'react';
import { BarChart3, Database, Filter, TrendingUp } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface EmptyStateProps {
    title?: string;
    description?: string;
    icon?: 'chart' | 'data' | 'filter' | 'trend';
    action?: {
        label: string;
        onClick: () => void;
    };
    className?: string;
}

const icons = {
    chart: BarChart3,
    data: Database,
    filter: Filter,
    trend: TrendingUp,
};

/**
 * Empty state component for charts with no data
 * Provides clear guidance on what to do next
 */
export function ChartEmptyState({
    title = 'No Data Available',
    description = 'There is no data to display for the selected filters and date range.',
    icon = 'chart',
    action,
    className,
}: EmptyStateProps) {
    const Icon = icons[icon];

    return (
        <Card className={cn('border-dashed', className)}>
            <CardContent className="flex flex-col items-center justify-center py-12 px-6 text-center">
                <div className="h-16 w-16 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mb-4">
                    <Icon className="h-8 w-8 text-slate-400 dark:text-slate-500" />
                </div>

                <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-2">
                    {title}
                </h3>

                <p className="text-sm text-muted-foreground max-w-sm mb-6">
                    {description}
                </p>

                {action && (
                    <Button onClick={action.onClick} variant="outline" size="sm">
                        {action.label}
                    </Button>
                )}
            </CardContent>
        </Card>
    );
}

/**
 * Specific empty states for different chart types
 */
export function FunnelEmptyState() {
    return (
        <ChartEmptyState
            icon="trend"
            title="No Funnel Data"
            description="Configure funnel stages to see conversion analysis. Select events to track user progression through your flow."
        />
    );
}

export function PieChartEmptyState() {
    return (
        <ChartEmptyState
            icon="chart"
            title="No Distribution Data"
            description="Adjust your filters or date range to see data distribution across categories."
        />
    );
}

export function TimeSeriesEmptyState() {
    return (
        <ChartEmptyState
            icon="trend"
            title="No Time Series Data"
            description="Select a different date range or adjust filters to see trends over time."
        />
    );
}
