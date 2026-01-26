import { useState, useEffect, useMemo, useCallback, memo, useRef } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
    Save,
    X,
    RefreshCw,
    Search as SearchIcon,
    Activity,
    Check,
    ArrowRight,
    Bookmark
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { useAccentTheme } from '@/contexts/AccentThemeContext';

interface EventDefinition {
    eventId: string;
    eventName: string;
    isApiEvent?: boolean;
    host?: string;
    url?: string;
}

interface CustomEventLabelsModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    events: EventDefinition[];
    featureId: string;
    onLabelsUpdated?: () => void;
}

// Sub-component for individual event row - using uncontrolled input for instant response
const EventLabelRow = memo(({
    event,
    initialValue,
    onBlur,
    onClear,
    index
}: {
    event: EventDefinition;
    initialValue: string;
    onBlur: (val: string) => void;
    onClear: () => void;
    index: number;
}) => {
    const inputRef = useRef<HTMLInputElement>(null);
    const [hasValue, setHasValue] = useState(Boolean(initialValue));
    const [isFocused, setIsFocused] = useState(false);

    // Only sync on mount or when modal reopens with new values
    useEffect(() => {
        if (inputRef.current) {
            inputRef.current.value = initialValue;
            setHasValue(Boolean(initialValue));
        }
    }, [initialValue]);

    const handleInput = () => {
        setHasValue(Boolean(inputRef.current?.value));
    };

    const handleBlur = () => {
        setIsFocused(false);
        if (inputRef.current) {
            onBlur(inputRef.current.value);
        }
    };

    const handleClear = () => {
        if (inputRef.current) {
            inputRef.current.value = '';
            setHasValue(false);
            onClear();
        }
    };

    return (
        <div
            className={cn(
                "group relative rounded-2xl transition-all duration-300 overflow-hidden",
                "bg-white/70 dark:bg-gray-800/50 backdrop-blur-xl",
                "border border-gray-200/60 dark:border-gray-700/50",
                "hover:shadow-lg hover:shadow-indigo-100/50 dark:hover:shadow-gray-900/30",
                "hover:border-indigo-200/80 dark:hover:border-indigo-600/40",
                hasValue && "ring-2 ring-indigo-500/20 border-indigo-300/60 dark:border-indigo-500/40"
            )}
            style={{
                animationDelay: `${index * 30}ms`,
            }}
        >
            {/* Subtle gradient accent for items with values */}
            {hasValue && (
                <div className="absolute inset-0 bg-gradient-to-r from-indigo-50/60 via-blue-50/40 to-transparent dark:from-indigo-900/15 dark:via-blue-900/10 dark:to-transparent pointer-events-none" />
            )}

            <div className="relative p-4 flex items-center gap-4">
                {/* Event ID Badge - Clean numeric display */}
                <div className={cn(
                    "w-11 h-11 rounded-xl flex items-center justify-center shrink-0 transition-all duration-300",
                    "font-mono font-bold text-sm",
                    event.isApiEvent
                        ? "bg-gradient-to-br from-violet-100 to-purple-50 dark:from-violet-900/40 dark:to-purple-900/20 text-violet-600 dark:text-violet-400 border border-violet-200/50 dark:border-violet-700/30"
                        : "bg-gradient-to-br from-indigo-100 to-blue-50 dark:from-indigo-900/40 dark:to-blue-900/20 text-indigo-600 dark:text-indigo-400 border border-indigo-200/50 dark:border-indigo-700/30"
                )}>
                    {event.eventId}
                </div>

                {/* Event Info */}
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                        <span className={cn(
                            "text-[10px] font-semibold uppercase tracking-wider",
                            event.isApiEvent ? "text-gray-400 dark:text-gray-500" : "text-indigo-400 dark:text-indigo-500"
                        )}>
                            {event.isApiEvent ? 'Endpoint' : 'Event'}
                        </span>
                    </div>
                    <h4 className="text-sm font-semibold text-gray-800 dark:text-gray-100 truncate leading-tight">
                        {event.eventName}
                    </h4>
                    {event.isApiEvent && (
                        <p className="text-[11px] font-mono text-gray-400 dark:text-gray-500 truncate mt-0.5">
                            {event.host}{event.url}
                        </p>
                    )}
                </div>

                {/* Arrow Indicator */}
                <div className={cn(
                    "w-8 h-8 rounded-full flex items-center justify-center shrink-0 transition-all duration-300",
                    "bg-gray-100/80 dark:bg-gray-700/50",
                    isFocused && "bg-indigo-100 dark:bg-indigo-900/40"
                )}>
                    <ArrowRight className={cn(
                        "w-4 h-4 transition-all duration-300",
                        isFocused ? "text-indigo-600 dark:text-indigo-400" : "text-gray-400 dark:text-gray-500"
                    )} />
                </div>

                {/* Custom Label Input - Clean, no icon */}
                <div className="flex-1 min-w-0 max-w-[220px]">
                    <div className="relative">
                        <input
                            ref={inputRef}
                            type="text"
                            defaultValue={initialValue}
                            onInput={handleInput}
                            onFocus={() => setIsFocused(true)}
                            onBlur={handleBlur}
                            onKeyDown={(e) => e.stopPropagation()}
                            placeholder="Enter label..."
                            className={cn(
                                "w-full h-10 px-4 pr-9 text-sm font-medium rounded-xl transition-all duration-200 outline-none",
                                "bg-gray-50/80 dark:bg-gray-900/50 placeholder:text-gray-300 dark:placeholder:text-gray-600",
                                "border-2",
                                isFocused
                                    ? "border-indigo-400 dark:border-indigo-500/60 ring-4 ring-indigo-500/10 bg-white dark:bg-gray-900"
                                    : hasValue
                                        ? "border-indigo-300 dark:border-indigo-600/40 text-indigo-700 dark:text-indigo-300"
                                        : "border-gray-200 dark:border-gray-700/60 text-gray-700 dark:text-gray-200"
                            )}
                        />
                        {hasValue && (
                            <button
                                onClick={handleClear}
                                className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 rounded-md text-gray-300 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                            >
                                <X className="w-3.5 h-3.5" />
                            </button>
                        )}
                    </div>
                </div>

                {/* Status Indicator */}
                {hasValue && (
                    <div className="shrink-0">
                        <div className="w-6 h-6 rounded-full bg-gradient-to-br from-indigo-500 to-blue-600 flex items-center justify-center shadow-sm shadow-indigo-500/30">
                            <Check className="w-3.5 h-3.5 text-white" strokeWidth={3} />
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
});

EventLabelRow.displayName = 'EventLabelRow';

export function CustomEventLabelsModal({
    open,
    onOpenChange,
    events,
    featureId,
    onLabelsUpdated
}: CustomEventLabelsModalProps) {
    const [customLabels, setCustomLabels] = useState<Record<string, string>>({});
    const [isSaving, setIsSaving] = useState(false);
    const [isSaved, setIsSaved] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const searchInputRef = useRef<HTMLInputElement>(null);
    const { toast } = useToast();
    const { t: themeClasses } = useAccentTheme();

    useEffect(() => {
        if (open && events.length > 0) {
            const initialLabels: Record<string, string> = {};
            events.forEach(event => {
                const key = `${event.eventId}_${event.isApiEvent ? '1' : '0'}`;
                const customName = (event as any).customName || (event as any).custom_name || '';
                initialLabels[key] = customName;
            });
            setCustomLabels(initialLabels);
            setIsSaved(false);
            setSearchQuery('');
        }
    }, [open, events]);

    const saveCustomLabels = async () => {
        setIsSaving(true);
        try {
            const myHeaders = new Headers();
            myHeaders.append('Content-Type', 'application/json');

            const raw = JSON.stringify({
                eventList: customLabels
            });

            const requestOptions: RequestInit = {
                method: 'POST',
                headers: myHeaders,
                body: raw,
            };

            const response = await fetch('https://ext1.buyhatke.com/feature-tracking/dashboard/eventCustomNames', requestOptions);

            if (response.ok) {
                setIsSaved(true);
                toast({
                    title: (
                        <div className="flex items-center gap-2">
                            <div className="w-5 h-5 rounded-full bg-gradient-to-br from-indigo-500 to-blue-600 flex items-center justify-center">
                                <Check className="w-3 h-3 text-white" strokeWidth={3} />
                            </div>
                            <span className="font-semibold text-sm">Labels Saved</span>
                        </div>
                    ) as any,
                    description: (
                        <p className="text-xs text-muted-foreground mt-1">
                            {Object.values(customLabels).filter(Boolean).length} custom labels applied. Refresh to sync charts.
                        </p>
                    ) as any,
                    duration: 4000,
                });
                if (onLabelsUpdated) onLabelsUpdated();
            } else {
                throw new Error('Failed to save');
            }
        } catch (error) {
            console.error('Failed to save custom labels:', error);
            toast({
                title: 'Save Failed',
                description: 'Could not save labels. Please try again.',
                variant: 'destructive',
            });
        } finally {
            setIsSaving(false);
        }
    };

    const updateLabel = useCallback((eventId: string, isApi: boolean, value: string) => {
        const key = `${eventId}_${isApi ? '1' : '0'}`;
        setCustomLabels(prev => ({
            ...prev,
            [key]: value
        }));
    }, []);

    const removeLabel = useCallback((eventId: string, isApi: boolean) => {
        const key = `${eventId}_${isApi ? '1' : '0'}`;
        setCustomLabels(prev => ({
            ...prev,
            [key]: ''
        }));
    }, []);

    const filteredEvents = useMemo(() => {
        if (!searchQuery.trim()) return events;
        const q = searchQuery.toLowerCase().trim();
        return events.filter(e =>
            e.eventName.toLowerCase().includes(q) ||
            e.eventId.toString().includes(q) ||
            (customLabels[`${e.eventId}_${e.isApiEvent ? '1' : '0'}`] || '').toLowerCase().includes(q) ||
            (e.host || '').toLowerCase().includes(q)
        );
    }, [events, searchQuery, customLabels]);

    const regularEvents = useMemo(() => filteredEvents.filter(e => !e.isApiEvent), [filteredEvents]);
    const apiEvents = useMemo(() => filteredEvents.filter(e => e.isApiEvent), [filteredEvents]);

    const handleSearchInput = () => {
        setSearchQuery(searchInputRef.current?.value || '');
    };

    const activeLabelsCount = Object.values(customLabels).filter(Boolean).length;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-3xl max-h-[88vh] p-0 overflow-hidden flex flex-col gap-0 border-0 shadow-2xl rounded-3xl [&>button]:hidden bg-gradient-to-br from-slate-50 via-gray-50 to-slate-100 dark:from-gray-900 dark:via-gray-900 dark:to-gray-950">
                {/* Glassmorphism Header */}
                <div className="relative shrink-0 overflow-hidden">
                    {/* Background Gradient Orbs - Theme aware */}
                    <div className="absolute inset-0 overflow-hidden">
                        <div className={cn("absolute -top-20 -left-20 w-60 h-60 rounded-full blur-3xl", themeClasses.orbPrimary, themeClasses.orbPrimaryDark)} />
                        <div className={cn("absolute -top-10 right-10 w-40 h-40 rounded-full blur-3xl", themeClasses.orbSecondary, themeClasses.orbSecondaryDark)} />
                        <div className={cn("absolute top-20 right-0 w-32 h-32 rounded-full blur-3xl", themeClasses.orbTertiary, themeClasses.orbTertiaryDark)} />
                    </div>

                    {/* Header Content */}
                    <div className="relative z-10 p-6 pb-5">
                        <div className="flex items-start justify-between mb-5">
                            <div className="flex items-center gap-4">
                                {/* Icon Container with Glassmorphism */}
                                <div className="w-14 h-14 rounded-2xl bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl border border-white/50 dark:border-gray-700/50 shadow-lg flex items-center justify-center">
                                    <div className={cn("w-10 h-10 rounded-xl bg-gradient-to-br flex items-center justify-center shadow-inner", themeClasses.buttonGradient)}>
                                        <Bookmark className="w-5 h-5 text-white" />
                                    </div>
                                </div>
                                <div>
                                    <DialogTitle className="text-xl font-bold tracking-tight text-gray-800 dark:text-gray-100 mb-1">
                                        Custom Event Labels
                                    </DialogTitle>
                                    <DialogDescription className="text-gray-500 dark:text-gray-400 text-sm font-medium">
                                        Personalize how events appear in your dashboard
                                    </DialogDescription>
                                </div>
                            </div>
                            <button
                                onClick={() => onOpenChange(false)}
                                className="p-2.5 rounded-xl bg-white/60 dark:bg-gray-800/60 backdrop-blur-xl border border-gray-200/60 dark:border-gray-700/50 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-white dark:hover:bg-gray-800 transition-all shadow-sm"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>

                        {/* Search Bar & Stats */}
                        <div className="flex gap-3 items-center">
                            <div className="relative flex-1">
                                <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                <input
                                    ref={searchInputRef}
                                    type="text"
                                    placeholder="Search events..."
                                    defaultValue=""
                                    onInput={handleSearchInput}
                                    onKeyDown={(e) => e.stopPropagation()}
                                    className="w-full h-12 pl-11 pr-10 bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl border border-gray-200/80 dark:border-gray-700/60 text-gray-700 dark:text-gray-200 text-sm font-medium rounded-xl placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400 dark:focus:border-indigo-500/50 transition-all shadow-sm"
                                />
                                {searchQuery && (
                                    <button
                                        onClick={() => {
                                            if (searchInputRef.current) {
                                                searchInputRef.current.value = '';
                                                setSearchQuery('');
                                            }
                                        }}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg text-gray-400 hover:text-gray-600"
                                    >
                                        <X className="w-3.5 h-3.5" />
                                    </button>
                                )}
                            </div>

                            {/* Stats Pills */}
                            <div className="flex gap-2">
                                <div className="h-12 px-4 bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl border border-gray-200/80 dark:border-gray-700/60 rounded-xl flex items-center gap-2.5 shadow-sm">
                                    <div className="w-2 h-2 rounded-full bg-indigo-500" />
                                    <span className="text-sm font-semibold text-gray-700 dark:text-gray-200">{events.length}</span>
                                    <span className="text-xs text-gray-400 hidden sm:inline">Events</span>
                                </div>
                                {activeLabelsCount > 0 && (
                                    <div className="h-12 px-4 bg-gradient-to-r from-indigo-50 to-blue-50 dark:from-indigo-900/30 dark:to-blue-900/30 border border-indigo-200/80 dark:border-indigo-700/40 rounded-xl flex items-center gap-2.5 shadow-sm">
                                        <div className="w-2 h-2 rounded-full bg-gradient-to-r from-indigo-500 to-blue-500" />
                                        <span className="text-sm font-semibold text-indigo-700 dark:text-indigo-300">{activeLabelsCount}</span>
                                        <span className="text-xs text-indigo-500 hidden sm:inline">Labeled</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Subtle Divider */}
                    <div className="h-px bg-gradient-to-r from-transparent via-gray-200/80 dark:via-gray-700/60 to-transparent" />
                </div>

                {/* Content Area */}
                <div className="flex-1 overflow-y-auto p-5 space-y-6 custom-scrollbar">
                    {/* Regular Events Section */}
                    {regularEvents.length > 0 && (
                        <div className="space-y-3">
                            <div className="flex items-center gap-3 px-1">
                                <div className="flex items-center gap-2.5">
                                    <div className="w-2.5 h-2.5 rounded-full bg-gradient-to-r from-indigo-500 to-blue-500" />
                                    <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-200">
                                        System Events
                                    </h3>
                                </div>
                                <div className="h-px flex-1 bg-gradient-to-r from-gray-200 dark:from-gray-700 to-transparent" />
                                <span className="text-xs font-medium text-gray-400 dark:text-gray-500 bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded">
                                    {regularEvents.length}
                                </span>
                            </div>
                            <div className="space-y-2">
                                {regularEvents.map((event, idx) => (
                                    <EventLabelRow
                                        key={`${event.eventId}_0`}
                                        index={idx}
                                        event={event}
                                        initialValue={customLabels[`${event.eventId}_0`] || ''}
                                        onBlur={(val) => updateLabel(event.eventId, false, val)}
                                        onClear={() => removeLabel(event.eventId, false)}
                                    />
                                ))}
                            </div>
                        </div>
                    )}

                    {/* API Events Section */}
                    {apiEvents.length > 0 && (
                        <div className="space-y-3">
                            <div className="flex items-center gap-3 px-1">
                                <div className="flex items-center gap-2.5">
                                    <div className="w-2.5 h-2.5 rounded-full bg-gradient-to-r from-gray-500 to-slate-500" />
                                    <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-200">
                                        API Endpoints
                                    </h3>
                                </div>
                                <div className="h-px flex-1 bg-gradient-to-r from-gray-200 dark:from-gray-700 to-transparent" />
                                <span className="text-xs font-medium text-gray-400 dark:text-gray-500 bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded">
                                    {apiEvents.length}
                                </span>
                            </div>
                            <div className="space-y-2">
                                {apiEvents.map((event, idx) => (
                                    <EventLabelRow
                                        key={`${event.eventId}_1`}
                                        index={idx}
                                        event={event}
                                        initialValue={customLabels[`${event.eventId}_1`] || ''}
                                        onBlur={(val) => updateLabel(event.eventId, true, val)}
                                        onClear={() => removeLabel(event.eventId, true)}
                                    />
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Empty State */}
                    {filteredEvents.length === 0 && (
                        <div className="flex flex-col items-center justify-center py-16 text-center">
                            <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-gray-100 to-gray-50 dark:from-gray-800 dark:to-gray-900 flex items-center justify-center mb-5 border border-gray-200/60 dark:border-gray-700/50 shadow-inner">
                                <Activity className="w-9 h-9 text-gray-300 dark:text-gray-600" />
                            </div>
                            <h3 className="text-base font-semibold text-gray-700 dark:text-gray-200 mb-1.5">No matching events</h3>
                            <p className="text-sm text-gray-400 dark:text-gray-500 max-w-xs">
                                No events found for "<span className="font-medium text-gray-500">{searchQuery}</span>"
                            </p>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="relative shrink-0">
                    {/* Top Border Gradient */}
                    <div className="h-px bg-gradient-to-r from-transparent via-gray-200/80 dark:via-gray-700/60 to-transparent" />

                    <div className="p-4 bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl flex items-center justify-between gap-4">
                        {/* Status Indicator */}
                        <div className="hidden sm:flex items-center gap-3">
                            <div className={cn(
                                "w-2 h-2 rounded-full transition-colors duration-300",
                                activeLabelsCount > 0
                                    ? "bg-gradient-to-r from-indigo-500 to-blue-600"
                                    : "bg-gray-300 dark:bg-gray-600"
                            )} />
                            <p className="text-xs font-medium text-gray-500 dark:text-gray-400">
                                {activeLabelsCount > 0 ? (
                                    <span className="text-indigo-600 dark:text-indigo-400">{activeLabelsCount} label{activeLabelsCount !== 1 ? 's' : ''} active</span>
                                ) : (
                                    <span>No labels set</span>
                                )}
                            </p>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex items-center gap-3 w-full sm:w-auto">
                            <Button
                                variant="ghost"
                                onClick={() => {
                                    if (isSaved) window.location.reload();
                                    else onOpenChange(false);
                                }}
                                className={cn(
                                    "h-11 px-5 font-medium text-sm transition-all rounded-xl flex-1 sm:flex-none border",
                                    isSaved
                                        ? "bg-indigo-50 border-indigo-200 text-indigo-600 hover:bg-indigo-100 dark:bg-indigo-900/20 dark:border-indigo-700/40 dark:text-indigo-400"
                                        : "border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-300"
                                )}
                            >
                                {isSaved ? (
                                    <div className="flex items-center gap-2">
                                        <RefreshCw className="w-4 h-4" />
                                        Refresh
                                    </div>
                                ) : (
                                    "Cancel"
                                )}
                            </Button>

                            <Button
                                onClick={saveCustomLabels}
                                disabled={isSaving}
                                className={cn(
                                    "h-11 px-6 font-semibold text-sm transition-all rounded-xl shadow-lg flex-1 sm:flex-none",
                                    "bg-gradient-to-r text-white",
                                    themeClasses.buttonGradient,
                                    themeClasses.buttonHover
                                )}
                            >
                                {isSaving ? (
                                    <div className="flex items-center gap-2">
                                        <RefreshCw className="w-4 h-4 animate-spin" />
                                        Saving...
                                    </div>
                                ) : isSaved ? (
                                    <div className="flex items-center gap-2">
                                        <Check className="w-4 h-4" strokeWidth={3} />
                                        Saved
                                    </div>
                                ) : (
                                    <div className="flex items-center gap-2">
                                        <Save className="w-4 h-4" />
                                        Save
                                    </div>
                                )}
                            </Button>
                        </div>
                    </div>
                </div>
            </DialogContent>

            <style dangerouslySetInnerHTML={{
                __html: `
                .custom-scrollbar::-webkit-scrollbar {
                    width: 6px;
                }
                .custom-scrollbar::-webkit-scrollbar-track {
                    background: transparent;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb {
                    background: linear-gradient(to bottom, rgba(99, 102, 241, 0.3), rgba(59, 130, 246, 0.3));
                    border-radius: 10px;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb:hover {
                    background: linear-gradient(to bottom, rgba(99, 102, 241, 0.5), rgba(59, 130, 246, 0.5));
                }
            `}} />
        </Dialog>
    );
}
