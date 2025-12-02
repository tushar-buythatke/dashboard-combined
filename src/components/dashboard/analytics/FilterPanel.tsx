import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface FilterOption {
    id: number;
    name: string;
}

interface FilterPanelProps {
    type: 'platform' | 'pos' | 'source' | 'event';
    options: FilterOption[];
    value: number;
    onChange: (value: number) => void;
}

export function FilterPanel({ type, options, value, onChange }: FilterPanelProps) {
    // Get human-readable label
    const getLabel = (): string => {
        switch (type) {
            case 'platform': return 'Platform';
            case 'pos': return 'POS';
            case 'source': return 'Source';
            case 'event': return 'Event';
            default: return type;
        }
    };

    // Find current option name
    const currentOption = options.find(opt => opt.id === value);
    const displayValue = currentOption?.name || `Select ${getLabel()}`;

    return (
        <div className="flex flex-col space-y-1.5">
            <Label>{getLabel()}</Label>
            <Select
                value={value.toString()}
                onValueChange={(val) => onChange(parseInt(val))}
            >
                <SelectTrigger>
                    <SelectValue>
                        {displayValue}
                    </SelectValue>
                </SelectTrigger>
                <SelectContent>
                    {options.map(opt => (
                        <SelectItem key={opt.id} value={opt.id.toString()}>
                            {opt.name}
                        </SelectItem>
                    ))}
                </SelectContent>
            </Select>
        </div>
    );
}
