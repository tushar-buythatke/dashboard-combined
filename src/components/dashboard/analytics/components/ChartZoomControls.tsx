import React from 'react';
import { Button } from '@/components/ui/button';
import { ZoomIn, ZoomOut, Maximize2 } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface ChartZoomControlsProps {
  zoomLevel: number;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onReset: () => void;
  className?: string;
  minZoom?: number;
  maxZoom?: number;
}

/**
 * Floating zoom controls for charts
 * Displays current zoom level and provides +/- buttons
 */
export function ChartZoomControls({
  zoomLevel,
  onZoomIn,
  onZoomOut,
  onReset,
  className,
  minZoom = 0.5,
  maxZoom = 5,
}: ChartZoomControlsProps) {
  const zoomPercentage = Math.round(zoomLevel * 100);
  const canZoomIn = zoomLevel < maxZoom;
  const canZoomOut = zoomLevel > minZoom;

  return (
    <div
      className={cn(
        'inline-flex items-center gap-1 bg-white/95 dark:bg-slate-900/95 backdrop-blur-sm',
        'border border-slate-200 dark:border-slate-700 rounded-lg shadow-lg p-1',
        className
      )}
    >
      {/* Zoom Out */}
      <Button
        variant="ghost"
        size="icon"
        className="h-7 w-7 hover:bg-slate-100 dark:hover:bg-slate-800"
        onClick={onZoomOut}
        disabled={!canZoomOut}
        title="Zoom Out (Ctrl + Scroll Down)"
      >
        <ZoomOut className="h-3.5 w-3.5" />
      </Button>

      {/* Current Zoom Level (clickable to reset) */}
      <button
        onClick={onReset}
        className={cn(
          'px-2 py-1 text-xs font-semibold rounded transition-colors',
          'hover:bg-slate-100 dark:hover:bg-slate-800',
          'text-slate-700 dark:text-slate-300',
          'min-w-[50px] text-center'
        )}
        title="Reset Zoom (Click)"
      >
        {zoomPercentage}%
      </button>

      {/* Zoom In */}
      <Button
        variant="ghost"
        size="icon"
        className="h-7 w-7 hover:bg-slate-100 dark:hover:bg-slate-800"
        onClick={onZoomIn}
        disabled={!canZoomIn}
        title="Zoom In (Ctrl + Scroll Up)"
      >
        <ZoomIn className="h-3.5 w-3.5" />
      </Button>

      {/* Reset Button */}
      <Button
        variant="ghost"
        size="icon"
        className="h-7 w-7 hover:bg-slate-100 dark:hover:bg-slate-800 ml-0.5"
        onClick={onReset}
        title="Reset View"
      >
        <Maximize2 className="h-3.5 w-3.5" />
      </Button>
    </div>
  );
}
