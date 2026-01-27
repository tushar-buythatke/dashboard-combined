import * as React from 'react';
import { Check, ChevronsUpDown, X, Search } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useAccentTheme } from '@/contexts/AccentThemeContext';

const brandLogoMemoryCache = new Map<string, string>();

const getBrandLogoEndpoint = (brand: string) => {
    const url = new URL('https://search-new.bitbns.com/buyhatke/wrapper/brandLogo');
    url.searchParams.set('brand', brand);
    return url.toString();
};

const BRAND_LOGO_TTL_MS = 7 * 24 * 60 * 60 * 1000;

const readCachedBrandLogo = (brand: string): string | null => {
    const mem = brandLogoMemoryCache.get(brand);
    if (mem) return mem;

    try {
        const raw = localStorage.getItem(`brandLogoCache:v1:${brand}`);
        if (!raw) return null;
        const parsed = JSON.parse(raw) as { dataUrl?: string; ts?: number };
        if (!parsed?.dataUrl || !parsed?.ts) return null;
        if (Date.now() - parsed.ts > BRAND_LOGO_TTL_MS) return null;
        brandLogoMemoryCache.set(brand, parsed.dataUrl);
        return parsed.dataUrl;
    } catch {
        return null;
    }
};

const writeCachedBrandLogo = (brand: string, dataUrl: string) => {
    brandLogoMemoryCache.set(brand, dataUrl);
    try {
        localStorage.setItem(
            `brandLogoCache:v1:${brand}`,
            JSON.stringify({ dataUrl, ts: Date.now() })
        );
    } catch {
        // ignore
    }
};

async function fetchBrandLogoAsDataUrl(brand: string): Promise<string> {
    const response = await fetch(getBrandLogoEndpoint(brand));
    if (!response.ok) {
        throw new Error(`Failed to fetch brand logo: ${response.status}`);
    }

    const blob = await response.blob();
    return await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result));
        reader.onerror = () => reject(new Error('Failed to read logo'));
        reader.readAsDataURL(blob);
    });
}

function BrandLogo({ brand }: { brand: string }) {
    const [src, setSrc] = React.useState<string | null>(null);

    React.useEffect(() => {
        let cancelled = false;

        const cached = readCachedBrandLogo(brand);
        if (cached) {
            setSrc(cached);
            return;
        }

        fetchBrandLogoAsDataUrl(brand)
            .then((dataUrl) => {
                if (cancelled) return;
                writeCachedBrandLogo(brand, dataUrl);
                setSrc(dataUrl);
            })
            .catch(() => {
                if (cancelled) return;
                setSrc(null);
            });

        return () => {
            cancelled = true;
        };
    }, [brand]);

    if (!src) {
        return (
            <div className="w-5 h-5 rounded bg-muted flex items-center justify-center text-[9px] font-semibold text-muted-foreground">
                {brand.slice(0, 2).toUpperCase()}
            </div>
        );
    }

    return (
        <img
            src={src}
            alt={brand}
            className="w-5 h-5 rounded object-contain bg-white"
            loading="lazy"
        />
    );
}

interface MultiSelectDropdownProps<T extends string | number = string> {
    options: { value: T; label: string; tooltip?: string; brand?: string }[];
    selected: T[];
    onChange: (selected: T[]) => void;
    placeholder?: string;
    className?: string;
    showAllOption?: boolean;
    maxDisplayItems?: number;
    searchable?: boolean;
    disabled?: boolean;
}

export function MultiSelectDropdown<T extends string | number = string>({
    options,
    selected,
    onChange,
    placeholder: _placeholder = 'Select...',
    className,
    showAllOption = true, // Now defaults to true
    maxDisplayItems = 2,
    searchable = true, // Now defaults to true
    disabled = false
}: MultiSelectDropdownProps<T>) {
    const { t: themeClasses } = useAccentTheme();
    const [open, setOpen] = React.useState(false);
    const [searchQuery, setSearchQuery] = React.useState('');

    // Filter options based on search query (searches both label and value)
    const filteredOptions = React.useMemo(() => {
        let optionsToFilter = options;
        if (searchQuery.trim()) {
            const query = searchQuery.toLowerCase().trim();
            optionsToFilter = options.filter(option => {
                const labelMatch = option.label.toLowerCase().includes(query);
                const valueMatch = String(option.value).toLowerCase().includes(query);
                return labelMatch || valueMatch;
            });
        }

        // Sort: Selected items first
        return [...optionsToFilter].sort((a, b) => {
            const aSelected = selected.includes(a.value);
            const bSelected = selected.includes(b.value);
            if (aSelected && !bSelected) return -1;
            if (!aSelected && bSelected) return 1;
            return 0;
        });
    }, [options, searchQuery, selected]);

    const handleSelectAll = () => {
        const allValues = filteredOptions.map(o => o.value);
        onChange(allValues);
    };

    const handleDeselectAll = () => {
        onChange([]);
    };

    const handleToggle = (value: T) => {
        const newSelected = selected.includes(value)
            ? selected.filter(v => v !== value)
            : [...selected, value];
        onChange(newSelected);
    };

    const removeItem = (value: T, e: React.MouseEvent) => {
        e.stopPropagation();
        onChange(selected.filter(v => v !== value));
    };

    // Display text - empty selection means "All" (API treats [] as all)
    const displayText = React.useMemo(() => {
        if (selected.length === 0) {
            return 'All'; // Empty = All for API
        }
        if (selected.length === options.length && options.length > 0) {
            return 'All Selected';
        }
        if (selected.length <= maxDisplayItems) {
            return selected.map(v => {
                const option = options.find(opt => opt.value === v);
                return option?.label || String(v);
            }).join(', ');
        }
        return `${selected.length} selected`;
    }, [selected, options, maxDisplayItems]);

    const isAllSelected = selected.length === options.length && options.length > 0;
    const isNoneSelected = selected.length === 0;

    // Reset search when popover closes
    React.useEffect(() => {
        if (!open) {
            setSearchQuery('');
        }
    }, [open]);

    return (
        <Popover open={open} onOpenChange={disabled ? undefined : setOpen}>
            <PopoverTrigger asChild>
                <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={open}
                    disabled={disabled}
                    className={cn(
                        'w-full justify-between min-h-[44px] h-auto text-sm',
                        selected.length === 0 && 'text-muted-foreground',
                        themeClasses.borderAccent,
                        themeClasses.borderAccentDark,
                        themeClasses.borderHover,
                        themeClasses.borderHoverDark,
                        'hover:bg-accent/30',
                        className
                    )}
                >
                    <span className="truncate flex-1 text-left">{displayText}</span>
                    <ChevronsUpDown className={cn("ml-2 h-4 w-4 shrink-0 opacity-50", themeClasses.textPrimary, themeClasses.textPrimaryDark)} />
                </Button>
            </PopoverTrigger>
            <PopoverContent
                className="w-full min-w-[250px] max-w-[400px] p-0"
                align="start"
                side="bottom"
                sideOffset={4}
                avoidCollisions={true}
                onOpenAutoFocus={(e) => e.preventDefault()}
            >
                {/* Search Input */}
                {searchable && (
                    <div className="p-2 border-b">
                        <div className="relative">
                            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="Search by name or ID..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="pl-8 h-9 text-sm"
                            />
                        </div>
                    </div>
                )}

                {/* Select All / Deselect All Buttons */}
                {showAllOption && (
                    <div className="flex items-center gap-2 p-2 border-b bg-muted/30">
                        <Button
                            variant="ghost"
                            size="sm"
                            className={cn("flex-1 h-8 text-xs font-medium", themeClasses.textPrimary, themeClasses.textPrimaryDark, "hover:bg-accent")}
                            onClick={handleSelectAll}
                            disabled={isAllSelected}
                        >
                            Select All
                        </Button>
                        <div className="w-px h-4 bg-border" />
                        <Button
                            variant="ghost"
                            size="sm"
                            className="flex-1 h-8 text-xs font-medium hover:bg-destructive/10 hover:text-destructive"
                            onClick={handleDeselectAll}
                            disabled={isNoneSelected}
                        >
                            Deselect All
                        </Button>
                    </div>
                )}

                <div className="max-h-64 overflow-y-auto p-2">
                    <div className="space-y-1">
                        {/* Individual options */}
                        {filteredOptions.map((option) => {
                            const optionContent = (
                                <div
                                    key={String(option.value)}
                                    className={cn(
                                        "flex items-center space-x-2 p-2 rounded cursor-pointer transition-colors",
                                        "hover:bg-accent/50",
                                        selected.includes(option.value) && cn("bg-accent/50", themeClasses.badgeBg, themeClasses.badgeBgDark)
                                    )}
                                    onClick={() => handleToggle(option.value)}
                                >
                                    <Checkbox
                                        id={`option-${option.value}`}
                                        checked={selected.includes(option.value)}
                                        className="pointer-events-none"
                                    />
                                    <Label className="flex-1 cursor-pointer text-sm flex items-center gap-2">
                                        {option.brand ? <BrandLogo brand={option.brand} /> : null}
                                        <span className="min-w-0 truncate">{option.label}</span>
                                    </Label>
                                    {selected.includes(option.value) && (
                                        <Check className={cn("h-4 w-4 shrink-0", themeClasses.textPrimary, themeClasses.textPrimaryDark)} />
                                    )}
                                </div>
                            );

                            if (option.tooltip) {
                                return (
                                    <TooltipProvider key={String(option.value)} delayDuration={300}>
                                        <Tooltip>
                                            <TooltipTrigger asChild>
                                                {optionContent}
                                            </TooltipTrigger>
                                            <TooltipContent side="right" className="bg-slate-900 text-white border-slate-700 px-3 py-2 max-w-md">
                                                <div className="text-xs font-mono">{option.tooltip}</div>
                                            </TooltipContent>
                                        </Tooltip>
                                    </TooltipProvider>
                                );
                            }

                            return optionContent;
                        })}

                        {filteredOptions.length === 0 && searchQuery && (
                            <div className="text-center text-muted-foreground py-4 text-sm">
                                No matches for "{searchQuery}"
                            </div>
                        )}

                        {options.length === 0 && (
                            <div className="text-center text-muted-foreground py-4 text-sm">
                                No options available
                            </div>
                        )}
                    </div>
                </div>

                {/* Selected items badges (shown below dropdown when multiple selected) */}
                {selected.length > maxDisplayItems && (
                    <div className="border-t p-2">
                        <div className="flex flex-wrap gap-1">
                            {selected.slice(0, 5).map((value) => {
                                const option = options.find(opt => opt.value === value);
                                return (
                                    <Badge
                                        key={String(value)}
                                        variant="secondary"
                                        className="text-xs flex items-center gap-1"
                                    >
                                        {option?.label || String(value)}
                                        <X
                                            className="h-3 w-3 cursor-pointer hover:text-destructive"
                                            onClick={(e) => removeItem(value, e)}
                                        />
                                    </Badge>
                                );
                            })}
                            {selected.length > 5 && (
                                <Badge variant="outline" className="text-xs">
                                    +{selected.length - 5} more
                                </Badge>
                            )}
                        </div>
                    </div>
                )}
            </PopoverContent>
        </Popover>
    );
}
