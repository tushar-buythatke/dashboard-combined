import React, { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { X, Maximize2 } from 'lucide-react';
import { ChartZoomControls } from './ChartZoomControls';
import { useChartZoom } from '@/hooks/useChartZoom';
import { useAccentTheme } from '@/contexts/AccentThemeContext';
import { cn } from '@/lib/utils';

interface ChartExpandedViewProps {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    children: (zoomLevel: number) => React.ReactNode;
}

export const ChartExpandedView: React.FC<ChartExpandedViewProps> = ({ isOpen, onClose, title, children }) => {
    const { t: themeClasses } = useAccentTheme();
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
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in duration-200" style={{ paddingTop: '64px' }}>
            <div
                className="w-full h-full sm:w-[95vw] sm:h-[calc(100vh-64px)] sm:max-h-[calc(100vh-64px)] sm:rounded-2xl shadow-2xl flex flex-col relative overflow-hidden bg-white dark:bg-slate-950"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className={cn("flex items-center justify-between px-3 sm:px-6 py-3 sm:py-4 border-b z-20 bg-white dark:bg-slate-950", themeClasses.borderAccent, themeClasses.borderAccentDark)}>
                    <h2 className={cn("text-base sm:text-xl font-bold flex items-center gap-2 truncate flex-1 mr-2", themeClasses.textPrimary, themeClasses.textPrimaryDark)}>
                        <Maximize2 className={cn("h-4 w-4 sm:h-5 sm:w-5 flex-shrink-0", themeClasses.textPrimary, themeClasses.textPrimaryDark)} />
                        <span className="truncate">{title}</span>
                    </h2>
                    <div className="flex items-center gap-2 sm:gap-4 flex-shrink-0">
                        <ChartZoomControls
                            zoomLevel={zoomLevel}
                            onZoomIn={zoomIn}
                            onZoomOut={zoomOut}
                            onReset={resetZoom}
                        />
                        <div className={cn("hidden sm:block w-px h-6", themeClasses.borderAccent, themeClasses.borderAccentDark)} />
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={onClose}
                            className={cn("h-9 w-9 sm:h-8 sm:w-8 rounded-full touch-manipulation", themeClasses.buttonHover)}
                        >
                            <X className={cn("h-5 w-5 sm:h-5 sm:w-5", themeClasses.textSecondary, themeClasses.textSecondaryDark)} />
                        </Button>
                    </div>
                </div>

                {/* Content Area - Scrollable with Zoom */}
                <div
                    className="flex-1 w-full relative overflow-auto flex flex-col bg-white dark:bg-slate-950"
                    onWheel={handleWheel}
                >
                    <div
                        className="flex-1 min-h-0 transition-all duration-150 ease-out origin-top-left p-3 sm:p-6"
                        style={{
                            // KEY CHANGE: Width Scaling logic
                            // Instead of transform: scale(), we set explicit width to force re-layout of X-axis
                            width: `${zoomLevel * 100}%`,
                            minWidth: '100%',
                            // Ensure height takes full space if not zoomed, but expands if content needs it
                            minHeight: '100%'
                        }}
                    >
                        {children(zoomLevel)}
                    </div>
                </div>
            </div>
        </div>
    );
};
