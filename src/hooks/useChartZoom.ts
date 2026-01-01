import { useState, useCallback, useRef, useEffect } from 'react';

export interface UseChartZoomOptions {
    minZoom?: number;
    maxZoom?: number;
    zoomStep?: number;
    initialZoom?: number;
}

export interface UseChartZoomReturn {
    zoomLevel: number;
    panOffset: { x: number; y: number };
    zoomIn: () => void;
    zoomOut: () => void;
    resetZoom: () => void;
    handleWheel: (e: React.WheelEvent) => void;
    handleMouseDown: (e: React.MouseEvent) => void;
    handleMouseMove: (e: React.MouseEvent) => void;
    handleMouseUp: () => void;
    setZoomLevel: (zoom: number) => void;
}

/**
 * Reusable hook for chart zoom and pan functionality
 * Supports mouse wheel zoom and drag-to-pan
 */
export function useChartZoom(options: UseChartZoomOptions = {}): UseChartZoomReturn {
    const {
        minZoom = 0.5,
        maxZoom = 5,
        zoomStep = 0.2,
        initialZoom = 1,
    } = options;

    const [zoomLevel, setZoomLevel] = useState(initialZoom);
    const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
    const [isPanning, setIsPanning] = useState(false);
    const lastMousePos = useRef({ x: 0, y: 0 });

    // Constrain zoom level
    const constrainZoom = useCallback((zoom: number) => {
        return Math.max(minZoom, Math.min(maxZoom, zoom));
    }, [minZoom, maxZoom]);

    // Zoom in
    const zoomIn = useCallback(() => {
        setZoomLevel(prev => constrainZoom(prev + zoomStep));
    }, [constrainZoom, zoomStep]);

    // Zoom out
    const zoomOut = useCallback(() => {
        setZoomLevel(prev => constrainZoom(prev - zoomStep));
    }, [constrainZoom, zoomStep]);

    // Reset zoom and pan
    const resetZoom = useCallback(() => {
        setZoomLevel(initialZoom);
        setPanOffset({ x: 0, y: 0 });
    }, [initialZoom]);

    // Handle mouse wheel zoom (Ctrl+Scroll or pinch)
    const handleWheel = useCallback((e: React.WheelEvent) => {
        // Only zoom if Ctrl key is pressed (standard browser zoom behavior)
        if (!e.ctrlKey && !e.metaKey) return;

        e.preventDefault();
        const delta = e.deltaY > 0 ? -zoomStep : zoomStep;
        setZoomLevel(prev => constrainZoom(prev + delta));
    }, [constrainZoom, zoomStep]);

    // Pan handlers
    const handleMouseDown = useCallback((e: React.MouseEvent) => {
        // Only pan with middle mouse button or Shift+Left click
        if (e.button === 1 || (e.button === 0 && e.shiftKey)) {
            e.preventDefault();
            setIsPanning(true);
            lastMousePos.current = { x: e.clientX, y: e.clientY };
        }
    }, []);

    const handleMouseMove = useCallback((e: React.MouseEvent) => {
        if (!isPanning) return;

        const deltaX = e.clientX - lastMousePos.current.x;
        const deltaY = e.clientY - lastMousePos.current.y;

        setPanOffset(prev => ({
            x: prev.x + deltaX,
            y: prev.y + deltaY,
        }));

        lastMousePos.current = { x: e.clientX, y: e.clientY };
    }, [isPanning]);

    const handleMouseUp = useCallback(() => {
        setIsPanning(false);
    }, []);

    // Reset pan when zoom changes significantly
    useEffect(() => {
        if (zoomLevel === initialZoom) {
            setPanOffset({ x: 0, y: 0 });
        }
    }, [zoomLevel, initialZoom]);

    return {
        zoomLevel,
        panOffset,
        zoomIn,
        zoomOut,
        resetZoom,
        handleWheel,
        handleMouseDown,
        handleMouseMove,
        handleMouseUp,
        setZoomLevel,
    };
}
