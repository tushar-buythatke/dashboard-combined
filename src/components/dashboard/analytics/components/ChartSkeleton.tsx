import React from 'react';
import { cn } from '@/lib/utils';

interface SkeletonProps {
    className?: string;
}

/**
 * Skeleton loading component for dashboard charts
 * Provides visual feedback while data is loading
 */
export function ChartSkeleton({ className }: SkeletonProps) {
    return (
        <div className={cn("animate-pulse", className)}>
            {/* Header skeleton */}
            <div className="flex items-center justify-between mb-4">
                <div className="h-6 w-32 bg-slate-200 dark:bg-slate-700 rounded"></div>
                <div className="h-8 w-24 bg-slate-200 dark:bg-slate-700 rounded"></div>
            </div>

            {/* Chart area skeleton */}
            <div className="h-64 bg-slate-100 dark:bg-slate-800 rounded-lg flex items-center justify-center">
                <div className="text-center space-y-2">
                    <div className="h-4 w-24 bg-slate-200 dark:bg-slate-700 rounded mx-auto"></div>
                    <div className="h-3 w-32 bg-slate-200 dark:bg-slate-700 rounded mx-auto"></div>
                </div>
            </div>

            {/* Footer skeleton */}
            <div className="mt-4 grid grid-cols-3 gap-4">
                <div className="h-16 bg-slate-100 dark:bg-slate-800 rounded-lg"></div>
                <div className="h-16 bg-slate-100 dark:bg-slate-800 rounded-lg"></div>
                <div className="h-16 bg-slate-100 dark:bg-slate-800 rounded-lg"></div>
            </div>
        </div>
    );
}

/**
 * Funnel chart specific skeleton
 */
export function FunnelSkeleton() {
    return (
        <div className="animate-pulse p-6">
            <div className="flex items-center gap-3 mb-6">
                <div className="h-11 w-11 bg-slate-200 dark:bg-slate-700 rounded-xl"></div>
                <div className="space-y-2">
                    <div className="h-5 w-40 bg-slate-200 dark:bg-slate-700 rounded"></div>
                    <div className="h-3 w-32 bg-slate-200 dark:bg-slate-700 rounded"></div>
                </div>
            </div>

            {/* Funnel bars */}
            <div className="flex items-end justify-center gap-6 h-96">
                {[100, 85, 70, 55, 40].map((height, i) => (
                    <div key={i} className="flex flex-col items-center w-32">
                        <div
                            className="w-full bg-slate-200 dark:bg-slate-700 rounded-t-xl"
                            style={{ height: `${height}%` }}
                        ></div>
                        <div className="mt-2 h-4 w-24 bg-slate-200 dark:bg-slate-700 rounded"></div>
                    </div>
                ))}
            </div>
        </div>
    );
}

/**
 * Pie chart specific skeleton
 */
export function PieSkeleton() {
    return (
        <div className="animate-pulse p-6">
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                    <div className="h-8 w-8 bg-slate-200 dark:bg-slate-700 rounded-lg"></div>
                    <div className="h-5 w-24 bg-slate-200 dark:bg-slate-700 rounded"></div>
                </div>
                <div className="h-6 w-16 bg-slate-200 dark:bg-slate-700 rounded-full"></div>
            </div>

            {/* Pie chart circle */}
            <div className="flex items-center justify-center h-52">
                <div className="h-40 w-40 rounded-full bg-slate-200 dark:bg-slate-700"></div>
            </div>

            {/* Legend */}
            <div className="mt-4 grid grid-cols-2 gap-2">
                {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="flex items-center gap-2">
                        <div className="h-2 w-2 rounded-full bg-slate-200 dark:bg-slate-700"></div>
                        <div className="h-3 w-20 bg-slate-200 dark:bg-slate-700 rounded"></div>
                    </div>
                ))}
            </div>
        </div>
    );
}
