'use client'

import { useEffect, useState, useRef, useMemo } from 'react';
import { Search, X, Command, ArrowRight, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAccentTheme } from '@/contexts/AccentThemeContext';
import { useEventName } from '@/hooks/useEventName';
import { apiService } from '@/services/apiService';
import { useOrganization } from '@/contexts/OrganizationContext';
import { useAnalyticsAuth } from '@/contexts/AnalyticsAuthContext';

interface PremiumSearchProps {
    isOpen: boolean;
    onClose: () => void;
    onSelectFeature?: (featureId: string) => void;
    onSelectProfile?: (featureId: string, profileId: string) => void;
    onSelectPanel?: (featureId: string, profileId: string, panelId: string) => void;
    onSelectEvent?: (eventId: string) => void;
    currentFeatureId?: string | null;
    events?: any[];
    profiles?: Array<{ profileId: string; profileName: string; featureId: string; panels?: Array<{ panelId: string; panelName?: string }> }>;
}

interface SearchResult {
    id: string;
    type: 'feature' | 'profile' | 'panel' | 'event';
    name: string;
    description?: string;
    featureId?: string;
    profileId?: string;
    panelId?: string;
    eventId?: string;
    isApiEvent?: boolean;
}

export function PremiumSearch({
    isOpen,
    onClose,
    onSelectFeature,
    onSelectProfile,
    onSelectPanel,
    onSelectEvent,
    currentFeatureId,
    events = [],
    profiles = []
}: PremiumSearchProps) {
    const { t: themeClasses } = useAccentTheme();
    const { selectedOrganization } = useOrganization();
    const { user } = useAnalyticsAuth();
    const { getEventDisplayName } = useEventName();
    const [searchQuery, setSearchQuery] = useState('');
    const [features, setFeatures] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [selectedIndex, setSelectedIndex] = useState(0);
    const inputRef = useRef<HTMLInputElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const resultsRef = useRef<HTMLDivElement>(null);

    // Load features for search
    useEffect(() => {
        if (isOpen) {
            const loadFeatures = async () => {
                setLoading(true);
                try {
                    const orgId = selectedOrganization?.id ?? 0;
                    const apiFeatures = await apiService.getFeaturesList(orgId);

                    // Filter features based on user permissions
                    let filteredFeatures = apiFeatures;
                    if (user?.role !== 1 && user?.permissions?.features && Object.keys(user.permissions.features).length > 0) {
                        filteredFeatures = apiFeatures.filter(f => !!user?.permissions?.features?.[String(f.id)]);
                    }

                    setFeatures(filteredFeatures);
                } catch (error) {
                    console.error('Failed to load features for search', error);
                    setFeatures([]);
                } finally {
                    setLoading(false);
                }
            };
            loadFeatures();
        }
    }, [isOpen, selectedOrganization?.id, user?.role, user?.permissions]);

    // Focus input when opened
    useEffect(() => {
        if (isOpen && inputRef.current) {
            setTimeout(() => {
                inputRef.current?.focus();
            }, 100);
        } else {
            setSearchQuery('');
            setSelectedIndex(0);
        }
    }, [isOpen]);

    // Search results - Must be defined before keyboard handler
    const searchResults = useMemo(() => {
        if (!searchQuery.trim()) return [];

        const query = searchQuery.toLowerCase().trim();
        const results: SearchResult[] = [];

        // Priority 1: Search features
        features.forEach(feature => {
            const nameMatch = feature.name.toLowerCase().includes(query);
            const descMatch = `${feature.name} analytics and tracking`.toLowerCase().includes(query);

            if (nameMatch || descMatch) {
                results.push({
                    id: `feature-${feature.id}`,
                    type: 'feature',
                    name: feature.name,
                    description: `${feature.name} analytics and tracking`,
                    featureId: feature.id.toString()
                });
            }
        });

        // Priority 2: Search profiles
        profiles.forEach(profile => {
            const nameMatch = profile.profileName.toLowerCase().includes(query);

            if (nameMatch) {
                results.push({
                    id: `profile-${profile.profileId}`,
                    type: 'profile',
                    name: profile.profileName,
                    description: `Dashboard profile for ${profile.featureId ? features.find(f => f.id.toString() === profile.featureId)?.name || 'feature' : 'feature'}`,
                    featureId: profile.featureId,
                    profileId: profile.profileId
                });
            }

            // Priority 3: Search panels within profiles
            if (profile.panels && profile.panels.length > 0) {
                profile.panels.forEach(panel => {
                    const panelName = panel.panelName || panel.panelId;
                    const nameMatch = panelName.toLowerCase().includes(query);

                    if (nameMatch) {
                        results.push({
                            id: `panel-${panel.panelId}`,
                            type: 'panel',
                            name: panelName,
                            description: `Panel in ${profile.profileName}`,
                            featureId: profile.featureId,
                            profileId: profile.profileId,
                            panelId: panel.panelId
                        });
                    }
                });
            }
        });

        // Priority 4: Search events (only if we have events and a current feature)
        // Only show events if user is already viewing a dashboard
        if (currentFeatureId && events.length > 0) {
            events.forEach(event => {
                const eventName = getEventDisplayName(event);
                const nameMatch = eventName.toLowerCase().includes(query);
                const idMatch = event.eventId.toString().includes(query);
                const hostMatch = (event.host || '').toLowerCase().includes(query);
                const urlMatch = (event.url || '').toLowerCase().includes(query);

                if (nameMatch || idMatch || hostMatch || urlMatch) {
                    results.push({
                        id: `event-${event.eventId}-${event.isApiEvent ? '1' : '0'}`,
                        type: 'event',
                        name: eventName,
                        description: event.isApiEvent
                            ? `${event.host || ''} ${event.url || ''}`.trim() || 'API Event'
                            : 'Event',
                        featureId: currentFeatureId,
                        eventId: event.eventId,
                        isApiEvent: event.isApiEvent
                    });
                }
            });
        }

        // Sort by priority: features > profiles > panels > events
        const typePriority: Record<string, number> = {
            'feature': 1,
            'profile': 2,
            'panel': 3,
            'event': 4
        };

        return results.sort((a, b) => {
            const priorityDiff = (typePriority[a.type] || 99) - (typePriority[b.type] || 99);
            if (priorityDiff !== 0) return priorityDiff;
            return a.name.localeCompare(b.name);
        });
    }, [searchQuery, features, profiles, events, currentFeatureId, getEventDisplayName]);

    // Reset selected index when search results change
    useEffect(() => {
        setSelectedIndex(0);
    }, [searchQuery]);

    const handleSelect = (result: SearchResult) => {
        if (result.type === 'feature' && result.featureId && onSelectFeature) {
            onSelectFeature(result.featureId);
            onClose();
        } else if (result.type === 'profile' && result.featureId && result.profileId) {
            // Navigate to profile
            if (onSelectProfile) {
                onSelectProfile(result.featureId, result.profileId);
            } else if (onSelectFeature) {
                // Fallback: navigate to feature first
                onSelectFeature(result.featureId);
            }
            onClose();
        } else if (result.type === 'panel' && result.featureId && result.profileId && result.panelId) {
            // Navigate to panel
            if (onSelectPanel) {
                onSelectPanel(result.featureId, result.profileId, result.panelId);
            } else if (onSelectProfile) {
                // Fallback: navigate to profile
                onSelectProfile(result.featureId, result.profileId);
            } else if (onSelectFeature) {
                // Fallback: navigate to feature
                onSelectFeature(result.featureId);
            }
            onClose();
        } else if (result.type === 'event' && result.featureId) {
            // For events, navigate to the feature first if not already there
            if (result.featureId !== currentFeatureId && onSelectFeature) {
                onSelectFeature(result.featureId);
            }
            onClose();
        }
    };

    // Keyboard shortcuts - Navigation and selection
    useEffect(() => {
        if (!isOpen) return;

        const handleKeyDown = (e: KeyboardEvent) => {
            // Don't handle if user is typing in input (except for navigation keys)
            const target = e.target as HTMLElement;
            if (target.tagName === 'INPUT' && e.key !== 'ArrowDown' && e.key !== 'ArrowUp' && e.key !== 'Enter' && e.key !== 'Escape') {
                return;
            }

            if (e.key === 'Escape') {
                e.preventDefault();
                e.stopPropagation();
                onClose();
            } else if (e.key === 'ArrowDown') {
                e.preventDefault();
                e.stopPropagation();
                setSelectedIndex(prev => {
                    const next = prev + 1;
                    return next >= searchResults.length ? 0 : next;
                });
            } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                e.stopPropagation();
                setSelectedIndex(prev => {
                    const next = prev - 1;
                    return next < 0 ? Math.max(0, searchResults.length - 1) : next;
                });
            } else if (e.key === 'Enter' && searchResults.length > 0) {
                e.preventDefault();
                e.stopPropagation();
                const selectedResult = searchResults[selectedIndex];
                if (selectedResult) {
                    handleSelect(selectedResult);
                }
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, onClose, searchResults, selectedIndex, currentFeatureId, onSelectFeature, onSelectProfile, onSelectPanel, handleSelect]);

    if (!isOpen) return null;

    return (
        <>
            {/* Backdrop */}
            <div
                className="fixed inset-0 z-[200] bg-black/40 backdrop-blur-md animate-in fade-in duration-200"
                onClick={onClose}
            />

            {/* Search Container */}
            <div
                ref={containerRef}
                className="fixed inset-0 z-[201] flex items-start justify-center pt-[15vh] px-4 pointer-events-none"
                onClick={(e) => e.stopPropagation()}
            >
                <div
                    className={cn(
                        "w-full max-w-2xl pointer-events-auto",
                        "animate-in fade-in zoom-in-95 duration-300"
                    )}
                >
                    {/* Main Search Box - Frosted Glass Style */}
                    <div
                        className={cn(
                            "relative rounded-2xl shadow-2xl overflow-hidden",
                            themeClasses.cardBg,
                            "backdrop-blur-2xl backdrop-saturate-150",
                            "border border-white/40 dark:border-white/10",
                            "shadow-[0_8px_32px_rgba(0,0,0,0.12),inset_0_1px_0_rgba(255,255,255,0.4)] dark:shadow-[0_8px_32px_rgba(0,0,0,0.4),inset_0_1px_0_rgba(255,255,255,0.05)]"
                        )}
                    >
                        {/* Glassmorphic gradient overlay */}
                        <div className="absolute inset-0 overflow-hidden pointer-events-none">
                            <div className={cn(
                                "absolute -top-32 -right-32 w-96 h-96 rounded-full blur-3xl opacity-30",
                                "bg-gradient-to-br",
                                themeClasses.buttonGradient
                            )} />
                            <div className={cn(
                                "absolute -bottom-24 -left-24 w-72 h-72 rounded-full blur-3xl opacity-20",
                                "bg-gradient-to-br",
                                themeClasses.buttonGradient
                            )} />
                        </div>

                        {/* Search Input */}
                        <div className="relative z-10 p-4 pb-3">
                            <div className="flex items-center gap-3">
                                <div className={cn(
                                    "flex items-center justify-center h-9 w-9 rounded-xl",
                                    "bg-gradient-to-br",
                                    themeClasses.buttonGradient,
                                    "shadow-md"
                                )}>
                                    <Search className="h-4 w-4 text-white" />
                                </div>

                                <div className="flex-1 relative">
                                    <input
                                        ref={inputRef}
                                        type="text"
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        placeholder="Search features, profiles, panels, events..."
                                        className={cn(
                                            "w-full h-11 px-4 pr-10 rounded-xl",
                                            "bg-gray-50/80 dark:bg-gray-800/60",
                                            "border border-gray-200/60 dark:border-gray-700/40",
                                            "text-base font-medium text-gray-900 dark:text-gray-100",
                                            "placeholder:text-gray-400 dark:placeholder:text-gray-500",
                                            "focus:outline-none focus:ring-2 focus:ring-opacity-40",
                                            "focus:border-transparent",
                                            "transition-all duration-200",
                                            themeClasses.ringAccent
                                        )}
                                    />
                                    {searchQuery && (
                                        <button
                                            onClick={() => setSearchQuery('')}
                                            className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-md hover:bg-gray-200/60 dark:hover:bg-gray-700/60 transition-colors"
                                        >
                                            <X className="h-3.5 w-3.5 text-gray-400" />
                                        </button>
                                    )}
                                </div>

                                <button
                                    onClick={onClose}
                                    className={cn(
                                        "h-9 px-3 rounded-lg flex items-center justify-center",
                                        "bg-gray-100/80 dark:bg-gray-800/80",
                                        "border border-gray-200/60 dark:border-gray-700/50",
                                        "hover:bg-gray-200/80 dark:hover:bg-gray-700/80",
                                        "transition-all duration-150",
                                        "text-xs font-medium text-gray-500 dark:text-gray-400"
                                    )}
                                >
                                    esc
                                </button>
                            </div>

                            {/* Keyboard Hints - Compact like Spotlight */}
                            <div className="mt-2 flex items-center gap-3 text-[10px] text-gray-400 dark:text-gray-500">
                                <div className="flex items-center gap-1">
                                    <kbd className="px-1.5 py-0.5 rounded bg-gray-100 dark:bg-gray-800 font-medium">↑↓</kbd>
                                    <span>navigate</span>
                                </div>
                                <div className="flex items-center gap-1">
                                    <kbd className="px-1.5 py-0.5 rounded bg-gray-100 dark:bg-gray-800 font-medium">↵</kbd>
                                    <span>select</span>
                                </div>
                            </div>
                        </div>

                        {/* Results */}
                        {searchQuery.trim() && (
                            <div className="relative z-10 border-t border-gray-200/50 dark:border-gray-700/50">
                                <div className="max-h-[60vh] overflow-y-auto">
                                    {loading ? (
                                        <div className="p-8 text-center text-gray-500">
                                            <div className="inline-block animate-spin rounded-full h-6 w-6 border-2 border-gray-300 border-t-gray-600"></div>
                                        </div>
                                    ) : searchResults.length > 0 ? (
                                        <div className="p-2" ref={resultsRef}>
                                            {searchResults.map((result, idx) => (
                                                <button
                                                    key={result.id}
                                                    onClick={() => handleSelect(result)}
                                                    ref={(el) => {
                                                        if (idx === selectedIndex && el) {
                                                            // Scroll into view when selected
                                                            el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                                                        }
                                                    }}
                                                    className={cn(
                                                        "w-full text-left p-4 rounded-2xl mb-2",
                                                        "backdrop-blur-xl",
                                                        "border transition-all duration-300",
                                                        "group cursor-pointer",
                                                        "shadow-md hover:shadow-xl",
                                                        idx === selectedIndex
                                                            ? cn(
                                                                "bg-white/80 dark:bg-gray-800/80",
                                                                "border-2",
                                                                themeClasses.borderAccent,
                                                                themeClasses.borderAccentDark,
                                                                "scale-[1.02] shadow-xl",
                                                                "ring-2 ring-opacity-20",
                                                                themeClasses.ringAccent
                                                            )
                                                            : cn(
                                                                "bg-white/50 dark:bg-gray-800/50",
                                                                "border border-white/30 dark:border-gray-700/30",
                                                                "hover:bg-white/70 dark:hover:bg-gray-800/70",
                                                                "hover:border-white/50 dark:hover:border-gray-600/50",
                                                                "hover:scale-[1.02]"
                                                            )
                                                    )}
                                                >
                                                    <div className="flex items-start gap-4">
                                                        <div className={cn(
                                                            "flex-shrink-0 h-10 w-10 rounded-xl flex items-center justify-center",
                                                            result.type === 'feature' || result.type === 'profile'
                                                                ? cn("bg-gradient-to-br", themeClasses.buttonGradient)
                                                                : "bg-gray-200/50 dark:bg-gray-700/50"
                                                        )}>
                                                            {result.type === 'feature' ? (
                                                                <Sparkles className="h-5 w-5 text-white" />
                                                            ) : result.type === 'profile' ? (
                                                                <Sparkles className="h-5 w-5 text-white" />
                                                            ) : result.type === 'panel' ? (
                                                                <ArrowRight className="h-4 w-4 text-gray-600 dark:text-gray-300" />
                                                            ) : (
                                                                <ArrowRight className="h-4 w-4 text-gray-600 dark:text-gray-300" />
                                                            )}
                                                        </div>
                                                        <div className="flex-1 min-w-0">
                                                            <div className="flex items-center gap-2 mb-1">
                                                                <span className="font-semibold text-gray-900 dark:text-gray-100 text-base">
                                                                    {result.name}
                                                                </span>
                                                                <span className={cn(
                                                                    "px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider",
                                                                    result.type === 'feature' || result.type === 'profile'
                                                                        ? cn("bg-gradient-to-r text-white", themeClasses.buttonGradient)
                                                                        : result.type === 'panel'
                                                                            ? "bg-blue-200 dark:bg-blue-700 text-blue-700 dark:text-blue-300"
                                                                            : "bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300"
                                                                )}>
                                                                    {result.type === 'feature' ? 'Feature' :
                                                                        result.type === 'profile' ? 'Profile' :
                                                                            result.type === 'panel' ? 'Panel' : 'Event'}
                                                                </span>
                                                            </div>
                                                            {result.description && (
                                                                <p className="text-sm text-gray-500 dark:text-gray-400 line-clamp-1">
                                                                    {result.description}
                                                                </p>
                                                            )}
                                                        </div>
                                                        <ArrowRight className="h-5 w-5 text-gray-400 group-hover:text-gray-600 dark:group-hover:text-gray-300 transition-colors flex-shrink-0 opacity-0 group-hover:opacity-100" />
                                                    </div>
                                                </button>
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="p-8 text-center">
                                            <div className="inline-flex items-center justify-center h-16 w-16 rounded-full bg-gray-100/50 dark:bg-gray-800/50 mb-4">
                                                <Search className="h-8 w-8 text-gray-400" />
                                            </div>
                                            <p className="text-gray-600 dark:text-gray-400 font-medium">No results found</p>
                                            <p className="text-sm text-gray-500 dark:text-gray-500 mt-1">
                                                Try searching for a different term
                                            </p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* Empty State */}
                        {!searchQuery.trim() && (
                            <div className="relative z-10 border-t border-gray-200/50 dark:border-gray-700/50 p-8">
                                <div className="text-center">
                                    <div className="inline-flex items-center justify-center h-16 w-16 rounded-full bg-gray-100/50 dark:bg-gray-800/50 mb-4">
                                        <Sparkles className="h-8 w-8 text-gray-400" />
                                    </div>
                                    <p className="text-gray-600 dark:text-gray-400 font-medium mb-2">Start typing to search</p>
                                    <p className="text-sm text-gray-500 dark:text-gray-500">
                                        Search for features, profiles, panels, and events across your analytics
                                    </p>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </>
    );
}
