import { useState, useEffect, useMemo, useCallback, memo, useRef } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
    Tag,
    Save,
    X,
    RefreshCw,
    Search as SearchIcon,
    Sparkles,
    Activity,
    CheckCircle2,
    Command,
    ArrowRight,
    Zap
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

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
                "group relative p-3.5 rounded-xl border-2 transition-all",
                hasValue
                    ? "bg-gradient-to-r from-purple-50/80 to-pink-50/80 dark:from-purple-900/20 dark:to-pink-900/20 border-purple-300 dark:border-purple-500/40 shadow-sm"
                    : "bg-white dark:bg-gray-900/60 border-gray-200 dark:border-gray-700/60 hover:border-purple-200 dark:hover:border-purple-700/40"
            )}
        >
            <div className="flex items-center gap-4">
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1.5">
                        <span className="text-[10px] font-bold uppercase tracking-widest text-gray-500 dark:text-gray-400">
                            Source Event
                        </span>
                    </div>
                    <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-purple-100 to-pink-100 dark:from-purple-900/40 dark:to-pink-900/40 flex items-center justify-center shrink-0 border border-purple-200/50 dark:border-purple-700/30">
                            <span className="text-[10px] font-mono font-bold text-purple-700 dark:text-purple-300">{event.eventId}</span>
                        </div>
                        <div className="min-w-0">
                            <h4 className="text-sm font-bold text-gray-900 dark:text-gray-100 truncate">
                                {event.eventName}
                            </h4>
                            {event.isApiEvent && (
                                <p className="text-[10px] font-mono font-medium text-pink-600 dark:text-pink-400 truncate">
                                    {event.host}{event.url}
                                </p>
                            )}
                        </div>
                    </div>
                </div>

                <ArrowRight className="w-4 h-4 text-purple-300 dark:text-purple-600 shrink-0" />

                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1.5">
                        <span className="text-[10px] font-bold uppercase tracking-widest text-purple-600 dark:text-purple-400">
                            Display Name
                        </span>
                    </div>
                    <div className="relative">
                        <input
                            ref={inputRef}
                            type="text"
                            defaultValue={initialValue}
                            onInput={handleInput}
                            onBlur={handleBlur}
                            onKeyDown={(e) => e.stopPropagation()}
                            placeholder="Enter custom name..."
                            className={cn(
                                "w-full h-9 px-3.5 text-sm font-semibold rounded-lg border-2 transition-all outline-none",
                                "bg-white dark:bg-gray-900 placeholder:text-gray-400 placeholder:font-medium",
                                "focus:ring-2 focus:ring-purple-500/30 focus:border-purple-500",
                                hasValue
                                    ? "border-purple-400 dark:border-purple-500/50 text-purple-900 dark:text-purple-100"
                                    : "border-gray-200 dark:border-gray-700 text-gray-900 dark:text-gray-100"
                            )}
                        />
                        {hasValue && (
                            <button
                                onClick={handleClear}
                                className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 rounded-md text-gray-400 hover:text-pink-600 hover:bg-pink-50 dark:hover:bg-pink-900/30 transition-colors"
                            >
                                <X className="w-3.5 h-3.5" />
                            </button>
                        )}
                    </div>
                </div>
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
                            <div className="w-5 h-5 rounded-full bg-emerald-500 flex items-center justify-center">
                                <CheckCircle2 className="w-3 h-3 text-white" />
                            </div>
                            <span className="font-bold text-sm">Labels Updated!</span>
                        </div>
                    ) as any,
                    description: (
                        <p className="text-xs text-muted-foreground mt-1 font-medium">
                            {Object.values(customLabels).filter(Boolean).length} labels saved. Refresh for full sync.
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

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-3xl max-h-[85vh] p-0 overflow-hidden flex flex-col gap-0 border-0 shadow-2xl rounded-2xl [&>button]:hidden">
                {/* Purple-Pink Gradient Header */}
                <div className="relative shrink-0 overflow-hidden bg-gradient-to-r from-purple-600 via-fuchsia-600 to-pink-600 p-6 text-white">
                    <div className="absolute inset-0 opacity-40">
                        <div className="absolute top-[-40%] left-[-15%] w-[70%] h-[180%] bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.2)_0,transparent_50%)] blur-2xl" />
                        <div className="absolute bottom-[-40%] right-[-15%] w-[70%] h-[180%] bg-[radial-gradient(circle_at_center,rgba(236,72,153,0.4)_0,transparent_50%)] blur-2xl" />
                    </div>

                    <div className="relative z-10 flex items-start justify-between">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-xl bg-white/20 backdrop-blur-sm border border-white/30 flex items-center justify-center shadow-lg">
                                <Tag className="w-6 h-6 text-white" />
                            </div>
                            <div>
                                <DialogTitle className="text-xl font-black tracking-tight text-white mb-1">
                                    Event Labels
                                </DialogTitle>
                                <DialogDescription className="text-pink-100 text-sm font-semibold flex items-center gap-2">
                                    <Command className="w-3.5 h-3.5" />
                                    Personalize your analytics dashboard workspace
                                </DialogDescription>
                            </div>
                        </div>
                        <button
                            onClick={() => onOpenChange(false)}
                            className="p-2.5 rounded-xl hover:bg-white/20 text-white/80 hover:text-white transition-all"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>

                    {/* Search & Stats Bar */}
                    <div className="relative z-10 mt-5 flex gap-3 items-center">
                        <div className="relative flex-1">
                            <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/60" />
                            <input
                                ref={searchInputRef}
                                type="text"
                                placeholder="Search by name, ID, or custom label..."
                                defaultValue=""
                                onInput={handleSearchInput}
                                onKeyDown={(e) => e.stopPropagation()}
                                className="w-full h-11 pl-11 pr-10 bg-white/15 border-2 border-white/20 text-white text-sm font-semibold rounded-xl placeholder:text-white/50 focus:outline-none focus:ring-2 focus:ring-white/30 focus:border-white/40 transition-all backdrop-blur-sm"
                            />
                            {searchQuery && (
                                <button
                                    onClick={() => {
                                        if (searchInputRef.current) {
                                            searchInputRef.current.value = '';
                                            setSearchQuery('');
                                        }
                                    }}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 hover:bg-white/20 rounded-lg text-white/60 hover:text-white"
                                >
                                    <X className="w-3.5 h-3.5" />
                                </button>
                            )}
                        </div>
                        <Badge className="h-11 px-5 bg-white/20 border-2 border-white/25 text-white text-sm rounded-xl flex items-center gap-2 font-bold backdrop-blur-sm">
                            <Sparkles className="w-4 h-4 text-yellow-300" />
                            {events.length} Total
                        </Badge>
                    </div>
                </div>

                {/* Content Area */}
                <div className="flex-1 overflow-y-auto bg-gradient-to-b from-purple-50/50 to-pink-50/30 dark:from-gray-950 dark:to-gray-900 p-5 space-y-5 custom-scrollbar">
                    {/* Summary Info */}
                    {!searchQuery && (
                        <div className="bg-gradient-to-r from-purple-100/80 to-pink-100/80 dark:from-purple-900/20 dark:to-pink-900/20 border-2 border-purple-200/60 dark:border-purple-700/30 rounded-xl p-4 flex items-start gap-3.5">
                            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center shrink-0 shadow-md">
                                <Zap className="w-5 h-5 text-white" />
                            </div>
                            <div>
                                <h4 className="text-sm font-bold text-purple-900 dark:text-purple-100 mb-0.5">How it works</h4>
                                <p className="text-xs text-purple-700 dark:text-purple-300 leading-relaxed font-medium">
                                    Changes saved here will instantly reflect across your session. Refresh for complex data charts.
                                </p>
                            </div>
                        </div>
                    )}

                    {/* Regular Events Section */}
                    {regularEvents.length > 0 && (
                        <div className="space-y-3">
                            <div className="flex items-center gap-2.5 px-1">
                                <div className="w-2 h-2 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 shadow-sm" />
                                <h3 className="text-xs font-black uppercase tracking-widest text-purple-700 dark:text-purple-300">
                                    System Events
                                </h3>
                                <Badge className="text-[10px] font-bold bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-700/40 h-5 px-2">
                                    {regularEvents.length}
                                </Badge>
                            </div>
                            <div className="space-y-2.5">
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
                            <div className="flex items-center gap-2.5 px-1 pt-3">
                                <div className="w-2 h-2 rounded-full bg-gradient-to-r from-pink-500 to-rose-500 shadow-sm" />
                                <h3 className="text-xs font-black uppercase tracking-widest text-pink-700 dark:text-pink-300">
                                    API Endpoints
                                </h3>
                                <Badge className="text-[10px] font-bold bg-pink-100 dark:bg-pink-900/40 text-pink-700 dark:text-pink-300 border-pink-200 dark:border-pink-700/40 h-5 px-2">
                                    {apiEvents.length}
                                </Badge>
                            </div>
                            <div className="space-y-2.5">
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

                    {filteredEvents.length === 0 && (
                        <div className="flex flex-col items-center justify-center py-16 text-center">
                            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-purple-100 to-pink-100 dark:from-purple-900/30 dark:to-pink-900/30 flex items-center justify-center mb-4 border-2 border-purple-200/50 dark:border-purple-700/30">
                                <Activity className="w-8 h-8 text-purple-400" />
                            </div>
                            <h3 className="text-base font-bold text-gray-800 dark:text-gray-200 mb-1">No results found</h3>
                            <p className="text-sm text-gray-500 font-medium max-w-xs">
                                No events matching "{searchQuery}". Try a different term.
                            </p>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-4 bg-white dark:bg-gray-900 border-t-2 border-purple-100 dark:border-purple-900/30 flex items-center justify-between">
                    <div className="hidden sm:flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 animate-pulse" />
                        <p className="text-xs font-bold text-purple-600 dark:text-purple-400 uppercase tracking-wider">
                            {Object.values(customLabels).filter(Boolean).length} Active overrides
                        </p>
                    </div>

                    <div className="flex items-center gap-3 w-full sm:w-auto">
                        <Button
                            variant="ghost"
                            onClick={() => {
                                if (isSaved) window.location.reload();
                                else onOpenChange(false);
                            }}
                            className={cn(
                                "h-10 px-6 font-bold text-sm transition-all rounded-xl flex-1 sm:flex-none",
                                isSaved
                                    ? "bg-emerald-50 text-emerald-600 hover:bg-emerald-100 dark:bg-emerald-900/20 dark:text-emerald-400"
                                    : "hover:bg-purple-50 dark:hover:bg-purple-900/20 text-gray-600 dark:text-gray-300"
                            )}
                        >
                            {isSaved ? (
                                <div className="flex items-center gap-2">
                                    <RefreshCw className="w-4 h-4" />
                                    Refresh
                                </div>
                            ) : (
                                "Dismiss"
                            )}
                        </Button>

                        <Button
                            onClick={saveCustomLabels}
                            disabled={isSaving}
                            className={cn(
                                "h-10 px-7 font-bold text-sm transition-all rounded-xl shadow-lg flex-1 sm:flex-none",
                                !isSaved
                                    ? "bg-gradient-to-r from-purple-600 via-fuchsia-600 to-pink-600 hover:from-purple-700 hover:via-fuchsia-700 hover:to-pink-700 text-white shadow-purple-500/25"
                                    : "bg-emerald-500 hover:bg-emerald-600 text-white shadow-emerald-500/25"
                            )}
                        >
                            {isSaving ? (
                                <div className="flex items-center gap-2">
                                    <RefreshCw className="w-4 h-4 animate-spin" />
                                    Saving...
                                </div>
                            ) : isSaved ? (
                                <div className="flex items-center gap-2">
                                    <CheckCircle2 className="w-4 h-4" />
                                    Saved!
                                </div>
                            ) : (
                                <div className="flex items-center gap-2">
                                    <Save className="w-4 h-4" />
                                    Save Changes
                                </div>
                            )}
                        </Button>
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
                    background: linear-gradient(to bottom, rgba(168, 85, 247, 0.3), rgba(236, 72, 153, 0.3));
                    border-radius: 10px;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb:hover {
                    background: linear-gradient(to bottom, rgba(168, 85, 247, 0.5), rgba(236, 72, 153, 0.5));
                }
            `}} />
        </Dialog>
    );
}
