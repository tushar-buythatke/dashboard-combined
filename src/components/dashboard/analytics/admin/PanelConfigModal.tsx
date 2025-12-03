import { useState, useEffect } from 'react';
import type { PanelConfig, EventConfig, AggregationMethod } from '@/types/analytics';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface PanelConfigModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (panel: PanelConfig) => void;
    initialPanel: PanelConfig;
    availableEvents: EventConfig[]; // All available events for this feature
}

// Available filter options
const PLATFORM_OPTIONS = ['all', 'app', 'extension'];
const POS_OPTIONS = ['all', 'amazon', 'flipkart', 'myntra'];
const SOURCE_OPTIONS = ['all', 'extension_scraping', 'spidy_scraping'];

export function PanelConfigModal({ isOpen, onClose, onSave, initialPanel, availableEvents }: PanelConfigModalProps) {
    const [panel, setPanel] = useState<PanelConfig>(initialPanel);
    const [graphType, setGraphType] = useState<'line' | 'bar'>('line');

    // Filter states
    const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>(['all']);
    const [selectedPos, setSelectedPos] = useState<string[]>(['all']);
    const [selectedSources, setSelectedSources] = useState<string[]>(['all']);

    useEffect(() => {
        setPanel(initialPanel);
    }, [initialPanel, isOpen]);

    const handleSave = () => {
        // Save filter selections to panel metadata (you can extend PanelConfig type to include filters)
        const updatedPanel = {
            ...panel,
            // Store filter selections in panel for later use
            metadata: {
                graphType,
                filters: {
                    platforms: selectedPlatforms,
                    pos: selectedPos,
                    sources: selectedSources
                }
            }
        };
        onSave(updatedPanel as PanelConfig);
        onClose();
    };

    const toggleEvent = (event: EventConfig) => {
        const exists = panel.events.find(e => e.eventId === event.eventId);
        let newEvents;
        if (exists) {
            newEvents = panel.events.filter(e => e.eventId !== event.eventId);
        } else {
            newEvents = [...panel.events, event];
        }

        // Auto-detect type
        const type = newEvents.length > 1 ? 'combined' : 'separate';
        setPanel({ ...panel, events: newEvents, type });
    };

    const toggleFilter = (
        _type: 'platform' | 'pos' | 'source',
        value: string,
        currentValues: string[],
        setter: React.Dispatch<React.SetStateAction<string[]>>
    ) => {
        if (value === 'all') {
            setter(['all']);
        } else {
            const newValues = currentValues.includes(value)
                ? currentValues.filter(v => v !== value && v !== 'all')
                : [...currentValues.filter(v => v !== 'all'), value];
            setter(newValues.length === 0 ? ['all'] : newValues);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Configure Panel - Full Customization</DialogTitle>
                </DialogHeader>

                <div className="grid gap-6 py-4">
                    {/* Panel Name */}
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="name" className="text-right">Panel Name</Label>
                        <Input
                            id="name"
                            value={panel.panelName}
                            onChange={(e) => setPanel({ ...panel, panelName: e.target.value })}
                            className="col-span-3"
                        />
                    </div>

                    {/* Events Selection */}
                    <div className="grid grid-cols-4 items-start gap-4">
                        <Label className="text-right pt-2">Events</Label>
                        <div className="col-span-3 space-y-2 border p-3 rounded max-h-40 overflow-y-auto bg-muted/20">
                            {availableEvents.map(event => (
                                <div key={event.eventId} className="flex items-center space-x-2">
                                    <Checkbox
                                        id={`event-${event.eventId}`}
                                        checked={panel.events.some(e => e.eventId === event.eventId)}
                                        onCheckedChange={() => toggleEvent(event)}
                                    />
                                    <Label htmlFor={`event-${event.eventId}`} style={{ color: event.color }} className="cursor-pointer">
                                        {event.eventName}
                                    </Label>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Platform Filter */}
                    <div className="grid grid-cols-4 items-start gap-4">
                        <Label className="text-right pt-2">Platform</Label>
                        <div className="col-span-3 flex flex-wrap gap-2">
                            {PLATFORM_OPTIONS.map(opt => (
                                <div key={opt} className="flex items-center space-x-2">
                                    <Checkbox
                                        id={`platform-${opt}`}
                                        checked={selectedPlatforms.includes(opt)}
                                        onCheckedChange={() => toggleFilter('platform', opt, selectedPlatforms, setSelectedPlatforms)}
                                    />
                                    <Label htmlFor={`platform-${opt}`} className="cursor-pointer capitalize">
                                        {opt}
                                    </Label>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* POS Filter */}
                    <div className="grid grid-cols-4 items-start gap-4">
                        <Label className="text-right pt-2">POS</Label>
                        <div className="col-span-3 flex flex-wrap gap-2">
                            {POS_OPTIONS.map(opt => (
                                <div key={opt} className="flex items-center space-x-2">
                                    <Checkbox
                                        id={`pos-${opt}`}
                                        checked={selectedPos.includes(opt)}
                                        onCheckedChange={() => toggleFilter('pos', opt, selectedPos, setSelectedPos)}
                                    />
                                    <Label htmlFor={`pos-${opt}`} className="cursor-pointer capitalize">
                                        {opt}
                                    </Label>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Source Filter */}
                    <div className="grid grid-cols-4 items-start gap-4">
                        <Label className="text-right pt-2">Source</Label>
                        <div className="col-span-3 flex flex-wrap gap-2">
                            {SOURCE_OPTIONS.map(opt => (
                                <div key={opt} className="flex items-center space-x-2">
                                    <Checkbox
                                        id={`source-${opt}`}
                                        checked={selectedSources.includes(opt)}
                                        onCheckedChange={() => toggleFilter('source', opt, selectedSources, setSelectedSources)}
                                    />
                                    <Label htmlFor={`source-${opt}`} className="cursor-pointer capitalize">
                                        {opt.replace('_', ' ')}
                                    </Label>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Graph Type */}
                    <div className="grid grid-cols-4 items-start gap-4">
                        <Label className="text-right pt-2">Graph Type</Label>
                        <RadioGroup
                            value={graphType}
                            onValueChange={(val) => setGraphType(val as 'line' | 'bar')}
                            className="col-span-3 flex gap-4"
                        >
                            <div className="flex items-center space-x-2">
                                <RadioGroupItem value="line" id="r1" />
                                <Label htmlFor="r1" className="cursor-pointer">Line Chart</Label>
                            </div>
                            <div className="flex items-center space-x-2">
                                <RadioGroupItem value="bar" id="r2" />
                                <Label htmlFor="r2" className="cursor-pointer">Bar Chart</Label>
                            </div>
                        </RadioGroup>
                    </div>

                    {/* Pie Charts */}
                    <div className="grid grid-cols-4 items-start gap-4">
                        <Label className="text-right pt-2">Pie Charts</Label>
                        <div className="col-span-3 space-y-2">
                            {['platform', 'pos', 'source'].map((type) => {
                                const pieConfig = panel.visualizations.pieCharts.find(p => p.type === type);
                                return (
                                    <div key={type} className="flex items-center space-x-2">
                                        <Checkbox
                                            id={`pie-${type}`}
                                            checked={pieConfig?.enabled}
                                            onCheckedChange={(checked) => {
                                                const newPies = panel.visualizations.pieCharts.map(p =>
                                                    p.type === type ? { ...p, enabled: !!checked } : p
                                                );
                                                setPanel({ ...panel, visualizations: { ...panel.visualizations, pieCharts: newPies } });
                                            }}
                                        />
                                        <Label htmlFor={`pie-${type}`} className="cursor-pointer">
                                            Show {type.charAt(0).toUpperCase() + type.slice(1)} Distribution
                                        </Label>
                                    </div>
                                );
                            })}</div>
                    </div>

                    {/* Aggregation Method */}
                    {panel.type === 'combined' && (
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label className="text-right">Aggregation</Label>
                            <Select
                                value={panel.visualizations.lineGraph.aggregationMethod}
                                onValueChange={(val: AggregationMethod) =>
                                    setPanel({
                                        ...panel,
                                        visualizations: {
                                            ...panel.visualizations,
                                            lineGraph: { ...panel.visualizations.lineGraph, aggregationMethod: val }
                                        }
                                    })
                                }
                            >
                                <SelectTrigger className="col-span-3">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="sum">Sum</SelectItem>
                                    <SelectItem value="average">Average</SelectItem>
                                    <SelectItem value="count">Count</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    )}
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={onClose}>Cancel</Button>
                    <Button onClick={handleSave}>Save Configuration</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
