import React from 'react';
import { Info } from 'lucide-react';
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

interface InfoTooltipProps {
    content: string | React.ReactNode;
    className?: string;
    iconClassName?: string;
    side?: 'top' | 'right' | 'bottom' | 'left';
}

export function InfoTooltip({
    content,
    className,
    iconClassName,
    side = 'top',
}: InfoTooltipProps) {
    return (
        <TooltipProvider delayDuration={200}>
            <Tooltip>
                <TooltipTrigger asChild>
                    <button
                        type="button"
                        className={cn(
                            'inline-flex items-center justify-center rounded-full text-muted-foreground hover:text-foreground transition-colors focus:outline-none focus:ring-2 focus:ring-primary/20',
                            className
                        )}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <Info className={cn('h-3.5 w-3.5', iconClassName)} />
                        <span className="sr-only">Info</span>
                    </button>
                </TooltipTrigger>
                <TooltipContent
                    side={side}
                    className="max-w-[280px] bg-card text-card-foreground border border-border shadow-xl p-3 text-xs leading-relaxed"
                >
                    {content}
                </TooltipContent>
            </Tooltip>
        </TooltipProvider>
    );
}
