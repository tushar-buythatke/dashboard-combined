import React, { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { X, Maximize2 } from 'lucide-react';
import { ChartZoomControls } from './ChartZoomControls';
import { useChartZoom } from '@/hooks/useChartZoom';

interface ChartExpandedViewProps {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    children: (zoomLevel: number) => React.ReactNode;
}

export const ChartExpandedView: React.FC<ChartExpandedViewProps> = ({ isOpen, onClose, title, children }) => {
    // Independent zoom state for the full-screen view
    const { zoomLevel, zoomIn, zoomOut, resetZoom, handleWheel } = useChartZoom({ minZoom: 0.5, maxZoom: 5, initialZoom: 1 });

    // Handle ESC key
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };
        if (isOpen) window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, onClose]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
            <div
                className="bg-white dark:bg-slate-900 w-full h-full sm:w-[95vw] sm:h-[90vh] sm:rounded-2xl shadow-2xl flex flex-col relative overflow-hidden"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex items-center justify-between px-3 sm:px-6 py-3 sm:py-4 border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-slate-900 z-20">
                    <h2 className="text-base sm:text-xl font-bold text-gray-800 dark:text-gray-100 flex items-center gap-2 truncate flex-1 mr-2">
                        <Maximize2 className="h-4 w-4 sm:h-5 sm:w-5 text-indigo-500 flex-shrink-0" />
                        <span className="truncate">{title}</span>
                    </h2>
                    <div className="flex items-center gap-2 sm:gap-4 flex-shrink-0">
                        <ChartZoomControls
                            zoomLevel={zoomLevel}
                            onZoomIn={zoomIn}
                            onZoomOut={zoomOut}
                            onReset={resetZoom}
                        />
                        <div className="hidden sm:block w-px h-6 bg-gray-200 dark:bg-gray-700" />
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={onClose}
                            className="h-9 w-9 sm:h-8 sm:w-8 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 touch-manipulation"
                        >
                            <X className="h-5 w-5 sm:h-5 sm:w-5 text-gray-500" />
                        </Button>
                    </div>
                </div>

                {/* Content Area - Scrollable with Zoom */}
                <div
                    className="flex-1 w-full relative overflow-auto bg-gray-50/50 dark:bg-slate-950/50"
                    onWheel={handleWheel}
                >
                    <div
                        className="h-full min-h-0 transition-all duration-150 ease-out origin-top-left p-3 sm:p-6"
                        style={{
                            // KEY CHANGE: Width Scaling logic
                            // Instead of transform: scale(), we set explicit width to force re-layout of X-axis
                            width: `${zoomLevel * 100}%`,
                            minWidth: '100%'
                        }}
                    >
                        {children(zoomLevel)}
                    </div>
                </div>
            </div>
        </div>
    );
};
