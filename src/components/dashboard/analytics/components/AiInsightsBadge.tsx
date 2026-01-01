
import React, { useState } from 'react';
import { Sparkles, X, RefreshCw, Lightbulb } from 'lucide-react';
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { generatePanelInsights, type AiInsightContext } from '../../../../services/aiService';
import { cn } from "@/lib/utils";

interface AiInsightsBadgeProps {
    panelId: string;
    panelName: string;
    data: any[];
    metricType?: 'count' | 'timing' | 'percentage' | 'funnel' | 'other';
    isHourly?: boolean;
    eventKeys?: any[];
}

export const AiInsightsBadge: React.FC<AiInsightsBadgeProps> = ({
    panelId,
    panelName,
    data,
    metricType = 'count',
    isHourly = false,
    eventKeys = []
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [insights, setInsights] = useState<string[] | null>(null);
    const [error, setError] = useState(false);

    const [credits, setCredits] = useState<number>(4);

    // Rate Limit Logic
    React.useEffect(() => {
        const checkCredits = () => {
            const now = Date.now();
            const stored = localStorage.getItem('ai_insights_usage');
            if (!stored) {
                setCredits(4);
                return;
            }

            try {
                const usage = JSON.parse(stored);
                // Reset if hour passed
                if (now - usage.lastReset > 3600000) {
                    localStorage.setItem('ai_insights_usage', JSON.stringify({ count: 0, lastReset: now }));
                    setCredits(4);
                } else {
                    setCredits(Math.max(0, 4 - usage.count));
                }
            } catch {
                // Reset on error
                localStorage.setItem('ai_insights_usage', JSON.stringify({ count: 0, lastReset: now }));
                setCredits(4);
            }
        };

        if (isOpen) {
            checkCredits();
        }
    }, [isOpen]);

    const consumeCredit = () => {
        const now = Date.now();
        const stored = localStorage.getItem('ai_insights_usage');
        let usage = { count: 0, lastReset: now };

        if (stored) {
            try {
                usage = JSON.parse(stored);
                if (now - usage.lastReset > 3600000) {
                    usage = { count: 0, lastReset: now }; // Reset
                }
            } catch { } // Keep default
        }

        usage.count += 1;
        localStorage.setItem('ai_insights_usage', JSON.stringify(usage));
        setCredits(Math.max(0, 4 - usage.count));
    };


    const handleGenerate = async () => {
        if (loading) return;
        if (credits <= 0) return; // Prevent if no credits

        setLoading(true);
        setError(false);
        setInsights(null); // Clear previous to show loading fresh

        try {
            consumeCredit(); // Deduct credit immediately

            const context: AiInsightContext = {
                panelName,
                period: isHourly ? 'Hourly (Last few days)' : 'Daily (Last 30 days)',
                metricType,
                eventNames: eventKeys?.map(e => e.eventName || e.eventKey) || []
            };

            const results = await generatePanelInsights(data, context);
            setInsights(results);
        } catch (err) {
            console.error(err);
            setError(true);
        } finally {
            setLoading(false);
        }
    };

    return (
        <Popover open={isOpen} onOpenChange={setIsOpen}>
            <PopoverTrigger asChild>
                <Button
                    variant="outline"
                    size="sm"
                    className={cn(
                        "h-8 gap-1.5 px-3 border-violet-200 dark:border-violet-800 bg-violet-50/50 dark:bg-violet-950/30 text-violet-700 dark:text-violet-300 hover:bg-violet-100 dark:hover:bg-violet-900/50 transition-all duration-300 shadow-sm",
                        "group"
                    )}
                >
                    <Sparkles className="h-4 w-4 text-violet-500 group-hover:scale-110 group-hover:rotate-12 transition-transform duration-300" />
                    <span className="font-semibold text-xs tracking-wide">AI Insights</span>
                </Button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-[380px] p-0 overflow-hidden border-violet-200 dark:border-violet-800 shadow-xl rounded-2xl">
                {/* Header */}
                <div className="bg-gradient-to-r from-violet-500 to-fuchsia-600 p-4 relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-2 opacity-10">
                        <Sparkles className="h-24 w-24 text-white" />
                    </div>
                    <div className="relative z-10 flex justify-between items-start">
                        <div>
                            <h3 className="text-white font-bold text-lg flex items-center gap-2">
                                <Lightbulb className="h-5 w-5 text-yellow-300 fill-yellow-300" />
                                Smart Analysis
                            </h3>
                            <p className="text-violet-100 text-xs mt-1">
                                Data-driven insights
                            </p>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="bg-white/20 text-white text-[10px] font-bold px-2 py-1 rounded-full backdrop-blur-sm border border-white/10">
                                {credits} / 4 credits left
                            </span>
                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6 text-violet-100 hover:bg-white/20 hover:text-white rounded-full"
                                onClick={() => setIsOpen(false)}
                            >
                                <X className="h-4 w-4" />
                            </Button>
                        </div>
                    </div>
                </div>

                {/* Content */}
                <div className="p-5 bg-white dark:bg-slate-950 min-h-[200px] flex flex-col relative">
                    {!loading && !insights && !error ? (
                        <div className="flex-1 flex flex-col items-center justify-center text-center space-y-4 py-4">
                            <div className="bg-violet-50 dark:bg-violet-900/20 p-4 rounded-full">
                                <Sparkles className="h-8 w-8 text-violet-500" />
                            </div>
                            <div>
                                <h4 className="font-semibold text-slate-800 dark:text-slate-100 mb-1">Ready to Analyze?</h4>
                                <p className="text-xs text-muted-foreground w-64 mx-auto leading-relaxed">
                                    Generate 2 highly analytical & witty insights using your credits.
                                </p>
                            </div>
                            <Button
                                onClick={handleGenerate}
                                disabled={credits <= 0}
                                className={cn(
                                    "bg-gradient-to-r from-violet-500 to-fuchsia-600 text-white shadow-md transition-all duration-300",
                                    credits > 0 ? "hover:from-violet-600 hover:to-fuchsia-700 hover:shadow-lg hover:scale-105" : "opacity-50 cursor-not-allowed grayscale"
                                )}
                            >
                                <Sparkles className="h-4 w-4 mr-2" />
                                {credits > 0 ? "Generate Insights" : "Limit Reached"}
                            </Button>
                            {credits <= 0 && (
                                <p className="text-[10px] text-red-500 font-medium">Reset in 1 hour</p>
                            )}
                        </div>
                    ) : loading ? (
                        <div className="flex-1 flex flex-col items-center justify-center space-y-4 py-8">
                            <div className="relative">
                                <div className="h-12 w-12 rounded-full border-4 border-violet-100 dark:border-violet-900 border-t-violet-500 animate-spin"></div>
                                <div className="absolute inset-0 flex items-center justify-center">
                                    <Sparkles className="h-5 w-5 text-violet-500 animate-pulse" />
                                </div>
                            </div>
                            <p className="text-xs font-medium text-violet-600 dark:text-violet-400 animate-pulse">
                                Analyzing {data.length} data points...
                            </p>
                        </div>
                    ) : error ? (
                        <div className="flex-1 flex flex-col items-center justify-center text-center py-6">
                            <div className="bg-red-50 dark:bg-red-900/20 p-3 rounded-full mb-3">
                                <X className="h-6 w-6 text-red-500" />
                            </div>
                            <p className="text-red-600 dark:text-red-400 font-semibold text-sm mb-1">Analysis Failed</p>
                            <p className="text-xs text-muted-foreground mb-4 w-60 mx-auto">
                                The AI service is currently unavailable or rate limited. Please try again later.
                            </p>
                            <Button size="sm" variant="outline" onClick={() => { setError(false); }}>
                                Close
                            </Button>
                        </div>
                    ) : (
                        <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-500">
                            {insights?.map((point, i) => (
                                <div key={i} className="flex gap-3 group">
                                    <div className="mt-1 flex-shrink-0 h-5 w-5 rounded-full bg-violet-100 dark:bg-violet-900/40 flex items-center justify-center">
                                        <span className="text-[10px] font-bold text-violet-600 dark:text-violet-400">{i + 1}</span>
                                    </div>
                                    <p className="text-sm text-slate-700 dark:text-slate-300 leading-snug group-hover:text-slate-900 dark:group-hover:text-slate-100 transition-colors">
                                        {/* Rich Text Parsing for **Bold** */}
                                        {point.split(/(\*\*.*?\*\*)/).map((part, index) => {
                                            if (part.startsWith('**') && part.endsWith('**')) {
                                                return (
                                                    <span key={index} className="font-bold text-violet-600 dark:text-violet-400 bg-violet-50 dark:bg-violet-900/40 px-1 rounded-sm">
                                                        {part.slice(2, -2)}
                                                    </span>
                                                );
                                            }
                                            return <span key={index}>{part}</span>;
                                        })}
                                    </p>
                                </div>
                            ))}
                            {insights?.length === 0 && (
                                <p className="text-sm text-muted-foreground text-center italic">No significant trends found.</p>
                            )}
                            <div className="pt-4 border-t border-slate-100 dark:border-slate-800 text-center">
                                <p className="text-[10px] text-muted-foreground italic">
                                    Generated by AI
                                </p>
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer Actions */}
                {!loading && !error && (
                    <div className="p-3 bg-slate-50 dark:bg-slate-900/50 border-t border-slate-100 dark:border-slate-800 flex justify-end">
                        <Button
                            variant="ghost"
                            size="sm"
                            className={cn(
                                "h-7 text-xs text-muted-foreground",
                                credits > 0 ? "hover:text-violet-600" : "opacity-50 cursor-not-allowed"
                            )}
                            onClick={handleGenerate}
                            disabled={credits <= 0}
                        >
                            <RefreshCw className="h-3 w-3 mr-1.5" />
                            {credits > 0 ? "Regenerate" : "Limit Reached"}
                        </Button>
                    </div>
                )}
            </PopoverContent>
        </Popover>
    );
};
