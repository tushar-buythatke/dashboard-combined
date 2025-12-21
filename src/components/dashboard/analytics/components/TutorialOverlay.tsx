import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { X, ChevronLeft, ChevronRight, ArrowDown, ArrowUp, ArrowLeft, ArrowRight } from 'lucide-react';

export interface TutorialStep {
    id: string;
    title: string;
    description: string;
    targetId: string; // The ID of the element to highlight/point to
    position?: 'top' | 'bottom' | 'left' | 'right';
    arrow?: 'down' | 'up' | 'left' | 'right';
}

interface TutorialOverlayProps {
    steps: TutorialStep[];
    currentStep: number;
    onNext: () => void;
    onPrevious: () => void;
    onExit: () => void;
    isOpen: boolean;
}

export function TutorialOverlay({
    steps,
    currentStep,
    onNext,
    onPrevious,
    onExit,
    isOpen
}: TutorialOverlayProps) {
    const [tooltipPosition, setTooltipPosition] = useState({ top: '50%', left: '50%', transform: 'translate(-50%, -50%)' });
    const [highlightPosition, setHighlightPosition] = useState<DOMRect | null>(null);

    // Unified position calculation logic
    const updatePositions = () => {
        if (!isOpen || !steps[currentStep]) return;

        const step = steps[currentStep];
        const targetElement = document.getElementById(step.targetId);

        if (targetElement) {
            const rect = targetElement.getBoundingClientRect();

            // Only update if position has actually changed to avoid unnecessary renders
            setHighlightPosition(prev => {
                if (prev &&
                    prev.top === rect.top &&
                    prev.left === rect.left &&
                    prev.width === rect.width &&
                    prev.height === rect.height) {
                    return prev;
                }
                return rect;
            });

            const tooltipWidth = 380;
            const tooltipHeight = 250;
            const padding = 20;

            let top = '50%';
            let left = '50%';
            let transform = 'translate(-50%, -50%)';

            switch (step.position) {
                case 'top':
                    top = `${Math.max(padding, rect.top - tooltipHeight - 20)}px`;
                    left = `${Math.min(window.innerWidth - tooltipWidth - padding, Math.max(padding, rect.left + rect.width / 2))}px`;
                    transform = 'translateX(-50%)';
                    break;
                case 'bottom':
                    top = `${Math.min(window.innerHeight - tooltipHeight - padding, rect.bottom + 20)}px`;
                    left = `${Math.min(window.innerWidth - tooltipWidth - padding, Math.max(padding, rect.left + rect.width / 2))}px`;
                    transform = 'translateX(-50%)';
                    break;
                case 'left':
                    top = `${Math.min(window.innerHeight - tooltipHeight - padding, Math.max(padding, rect.top + rect.height / 2))}px`;
                    left = `${Math.max(padding, rect.left - tooltipWidth - 20)}px`;
                    transform = 'translateY(-50%)';
                    break;
                case 'right':
                    top = `${Math.min(window.innerHeight - tooltipHeight - padding, Math.max(padding, rect.top + rect.height / 2))}px`;
                    left = `${Math.min(window.innerWidth - tooltipWidth - padding, rect.right + 20)}px`;
                    transform = 'translateY(-50%)';
                    break;
            }

            setTooltipPosition(prev => {
                if (prev.top === top && prev.left === left && prev.transform === transform) {
                    return prev;
                }
                return { top, left, transform };
            });
        } else {
            setHighlightPosition(null);
            setTooltipPosition({ top: '50%', left: '50%', transform: 'translate(-50%, -50%)' });
        }
    };

    // Effect for scrolling when step changes
    useEffect(() => {
        if (!isOpen || !steps[currentStep]) return;

        const step = steps[currentStep];
        const targetElement = document.getElementById(step.targetId);

        if (targetElement) {
            // Scroll element into view smoothly - only once when step changes
            targetElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
    }, [currentStep, isOpen]);

    // Effect for continuous position tracking (fixes jitter during smooth scroll)
    useEffect(() => {
        if (!isOpen) return;

        let animationFrameId: number;

        const track = () => {
            updatePositions();
            animationFrameId = requestAnimationFrame(track);
        };

        animationFrameId = requestAnimationFrame(track);

        // Also listen to window resize to update boundaries
        window.addEventListener('resize', updatePositions);

        return () => {
            cancelAnimationFrame(animationFrameId);
            window.removeEventListener('resize', updatePositions);
        };
    }, [isOpen, currentStep, steps]);

    if (!isOpen || !steps[currentStep]) return null;

    const step = steps[currentStep];
    const ArrowIcon = step.arrow === 'down' ? ArrowDown :
        step.arrow === 'up' ? ArrowUp :
            step.arrow === 'left' ? ArrowLeft :
                step.arrow === 'right' ? ArrowRight : null;

    return (
        <>
            {/* Background overlay */}
            <div className="fixed inset-0 z-[100] pointer-events-none">
                <div
                    className="absolute inset-0 bg-black/60 backdrop-blur-[2px] pointer-events-auto transition-opacity duration-300"
                    onClick={onExit}
                    style={{
                        clipPath: highlightPosition
                            ? `polygon(0 0, 100% 0, 100% 100%, 0 100%, 0 0, ${highlightPosition.left}px ${highlightPosition.top}px, ${highlightPosition.left}px ${highlightPosition.bottom}px, ${highlightPosition.right}px ${highlightPosition.bottom}px, ${highlightPosition.right}px ${highlightPosition.top}px, ${highlightPosition.left}px ${highlightPosition.top}px)`
                            : undefined
                    }}
                />

                {/* Highlight ring around target element */}
                {highlightPosition && (
                    <div
                        className="absolute pointer-events-none animate-pulse"
                        style={{
                            top: `${highlightPosition.top - 4}px`,
                            left: `${highlightPosition.left - 4}px`,
                            width: `${highlightPosition.width + 8}px`,
                            height: `${highlightPosition.height + 8}px`,
                            border: '3px solid rgb(99, 102, 241)',
                            borderRadius: '8px',
                            boxShadow: '0 0 0 4px rgba(99, 102, 241, 0.2), 0 0 20px rgba(99, 102, 241, 0.4)',
                            zIndex: 101
                        }}
                    />
                )}
            </div>

            {/* Tutorial tooltip */}
            <div
                className={cn(
                    "fixed z-[102] pointer-events-auto w-[380px] bg-white dark:bg-slate-900 rounded-xl shadow-2xl border-2 border-primary/30 p-6 animate-in fade-in zoom-in duration-300",
                    step.position ? "" : "-translate-x-1/2 -translate-y-1/2"
                )}
                style={{
                    top: tooltipPosition.top,
                    left: tooltipPosition.left,
                    transform: tooltipPosition.transform
                }}
            >
                {/* Arrow pointing to target */}
                {ArrowIcon && (
                    <div className="absolute -top-8 left-1/2 -translate-x-1/2 text-primary animate-bounce">
                        <ArrowIcon className="h-6 w-6" />
                    </div>
                )}

                <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                        <div className="flex items-center justify-center w-8 h-8 rounded-full bg-gradient-to-br from-violet-600 to-indigo-600 text-white text-sm font-bold ring-4 ring-indigo-100 dark:ring-indigo-900/30">
                            {currentStep + 1}
                        </div>
                        <h3 className="font-bold text-base text-foreground">{step.title}</h3>
                    </div>
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 rounded-full -mr-2 -mt-1 hover:bg-muted"
                        onClick={onExit}
                    >
                        <X className="h-4 w-4" />
                    </Button>
                </div>

                <p className="text-sm text-muted-foreground leading-relaxed mb-6">
                    {step.description}
                </p>

                <div className="flex items-center justify-between">
                    <div className="text-[11px] text-muted-foreground font-semibold uppercase tracking-wider">
                        Step {currentStep + 1} of {steps.length}
                    </div>
                    <div className="flex items-center gap-2">
                        {currentStep > 0 && (
                            <Button
                                variant="outline"
                                size="sm"
                                className="h-9 px-4 text-sm"
                                onClick={onPrevious}
                            >
                                <ChevronLeft className="h-4 w-4 mr-1" />
                                Back
                            </Button>
                        )}
                        <Button
                            variant="default"
                            size="sm"
                            className="h-9 px-4 text-sm bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 shadow-lg shadow-indigo-500/20"
                            onClick={onNext}
                        >
                            {currentStep === steps.length - 1 ? 'Finish Tour' : (
                                <>
                                    Next
                                    <ChevronRight className="h-4 w-4 ml-1" />
                                </>
                            )}
                        </Button>
                    </div>
                </div>
            </div>
        </>
    );
}
