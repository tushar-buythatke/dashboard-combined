import { useState } from 'react';
import type { PanelConfig } from '@/types/analytics';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Combine } from 'lucide-react';

interface PanelCombineModalProps {
    isOpen: boolean;
    onClose: () => void;
    sourcePanel: PanelConfig;
    availablePanels: PanelConfig[];
    onCombine: (sourcePanelId: string, targetPanelId: string) => void;
}

export function PanelCombineModal({
    isOpen,
    onClose,
    sourcePanel,
    availablePanels,
    onCombine
}: PanelCombineModalProps) {
    const [selectedTargetId, setSelectedTargetId] = useState<string | null>(null);

    const handleCombine = () => {
        if (selectedTargetId) {
            onCombine(sourcePanel.panelId, selectedTargetId);
            onClose();
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-2xl">
                <DialogHeader>
                    <DialogTitle>Combine Panels</DialogTitle>
                </DialogHeader>

                <div className="space-y-4">
                    <div>
                        <p className="text-sm text-muted-foreground mb-2">
                            Select a panel to combine with <strong>{sourcePanel.panelName}</strong>
                        </p>
                    </div>

                    <div className="grid gap-3 max-h-96 overflow-y-auto">
                        {availablePanels
                            .filter(p => p.panelId !== sourcePanel.panelId)
                            .map(panel => (
                                <Card
                                    key={panel.panelId}
                                    className={`cursor-pointer transition-all ${selectedTargetId === panel.panelId
                                            ? 'ring-2 ring-primary'
                                            : 'hover:bg-accent'
                                        }`}
                                    onClick={() => setSelectedTargetId(panel.panelId)}
                                >
                                    <CardHeader className="pb-2">
                                        <CardTitle className="text-base flex items-center gap-2">
                                            {panel.panelName}
                                            {selectedTargetId === panel.panelId && (
                                                <Combine className="h-4 w-4 text-primary" />
                                            )}
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="flex flex-wrap gap-1">
                                            {panel.events.map(e => (
                                                <span
                                                    key={e.eventId}
                                                    className="text-xs px-2 py-1 rounded bg-secondary"
                                                    style={{ borderLeft: `3px solid ${e.color}` }}
                                                >
                                                    {e.eventName}
                                                </span>
                                            ))}
                                        </div>
                                    </CardContent>
                                </Card>
                            ))}
                    </div>

                    {selectedTargetId && (
                        <div className="p-3 bg-muted rounded-lg">
                            <p className="text-sm font-medium mb-1">Result:</p>
                            <p className="text-xs text-muted-foreground">
                                Events from both panels will be merged into a single combined panel
                            </p>
                        </div>
                    )}
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={onClose}>
                        Cancel
                    </Button>
                    <Button onClick={handleCombine} disabled={!selectedTargetId}>
                        Combine Panels
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
