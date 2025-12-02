import * as React from 'react';
import { Check, ChevronsUpDown, X, Search } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';

interface MultiSelectDropdownProps<T extends string | number = string> {
    options: { value: T; label: string }[];
    selected: T[];
    onChange: (selected: T[]) => void;
    placeholder?: string;
    className?: string;
    showAllOption?: boolean;
    maxDisplayItems?: number;
    searchable?: boolean;
}

export function MultiSelectDropdown<T extends string | number = string>({
    options,
    selected,
    onChange,
    placeholder = 'Select...',
    className,
    showAllOption = true, // Now defaults to true
    maxDisplayItems = 2,
    searchable = true // Now defaults to true
}: MultiSelectDropdownProps<T>) {
    const [open, setOpen] = React.useState(false);
    const [searchQuery, setSearchQuery] = React.useState('');

    // Filter options based on search query (searches both label and value)
    const filteredOptions = React.useMemo(() => {
        if (!searchQuery.trim()) return options;
        
        const query = searchQuery.toLowerCase().trim();
        return options.filter(option => {
            const labelMatch = option.label.toLowerCase().includes(query);
            const valueMatch = String(option.value).toLowerCase().includes(query);
            return labelMatch || valueMatch;
        });
    }, [options, searchQuery]);

    const handleSelectAll = () => {
        const allValues = options.map(o => o.value);
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
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={open}
                    className={cn(
                        'w-full justify-between min-h-[40px] h-auto',
                        selected.length === 0 && 'text-muted-foreground',
                        className
                    )}
                >
                    <span className="truncate flex-1 text-left">{displayText}</span>
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-full min-w-[250px] p-0" align="start">
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
                            className="flex-1 h-8 text-xs font-medium hover:bg-primary/10 hover:text-primary"
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
                        {filteredOptions.map((option) => (
                            <div
                                key={String(option.value)}
                                className={cn(
                                    "flex items-center space-x-2 p-2 hover:bg-accent rounded cursor-pointer transition-colors",
                                    selected.includes(option.value) && "bg-accent/50"
                                )}
                                onClick={() => handleToggle(option.value)}
                            >
                                <Checkbox
                                    id={`option-${option.value}`}
                                    checked={selected.includes(option.value)}
                                    className="pointer-events-none"
                                />
                                <Label className="flex-1 cursor-pointer text-sm">
                                    {option.label}
                                </Label>
                                {selected.includes(option.value) && (
                                    <Check className="h-4 w-4 text-primary shrink-0" />
                                )}
                            </div>
                        ))}

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
