/**
 * Firebase Admin Panel
 * Admin-only component for managing centralized configurations.
 * Allows admins to sync, manage, and configure features, profiles, and panels.
 */

import { useState } from 'react';
// Removed framer-motion for performance
import { useFirebaseConfig } from '@/contexts/FirebaseConfigContext';
import { useAnalyticsAuth } from '@/contexts/AnalyticsAuthContext';
import { useOrganization } from '@/contexts/OrganizationContext';
import { mockService } from '@/services/mockData';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Cloud,
  CloudOff,
  RefreshCw,
  Upload,
  Download,
  Settings,
  Database,
  LayoutDashboard,
  Layers,
  Zap,
  Check,
  X,
  Loader2,
  AlertTriangle,
  Plus,
  Trash2,
  Copy,
  Star,
  Edit,
} from 'lucide-react';
import type { DashboardProfileConfig, FeatureConfig, EventDefinitionConfig } from '@/types/firebaseConfig';

interface FirebaseAdminPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export function FirebaseAdminPanel({ isOpen, onClose }: FirebaseAdminPanelProps) {
  const { user } = useAnalyticsAuth();
  const { selectedOrganization } = useOrganization();
  const {
    isConnected,
    isLoading,
    error,
    globalConfig,
    features,
    profiles,
    events,
    isAdmin,
    saveFeature,
    deleteFeature,
    saveProfile,
    deleteProfile,
    setDefaultProfile,
    cloneProfile,
    saveEvent,
    updateGlobalConfig,
    refreshFeatures,
    refreshProfiles,
  } = useFirebaseConfig();

  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<{ synced: number; failed: number; error?: string } | null>(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [writeAccessStatus, setWriteAccessStatus] = useState<{ tested: boolean; canWrite: boolean; error?: string }>({ tested: false, canWrite: false });

  // Feature editing
  const [editingFeature, setEditingFeature] = useState<Partial<FeatureConfig> | null>(null);
  const [showFeatureModal, setShowFeatureModal] = useState(false);

  // Profile actions
  const [cloneProfileName, setCloneProfileName] = useState('');
  const [cloningProfileId, setCloningProfileId] = useState<string | null>(null);

  // Event editing
  const [editingEvent, setEditingEvent] = useState<Partial<EventDefinitionConfig> | null>(null);
  const [showEventModal, setShowEventModal] = useState(false);

  const orgId = selectedOrganization?.id?.toString() || 'default';

  if (!isAdmin) {
    return null;
  }

  const handleTestWriteAccess = async () => {
    const { firebaseConfigService } = await import('@/services/firebaseConfigService');
    const result = await firebaseConfigService.testWriteAccess();
    setWriteAccessStatus({ tested: true, canWrite: result.canWrite, error: result.error });
  };

  const handleSyncToFirebase = async () => {
    if (!user) return;

    setSyncing(true);
    setSyncResult(null);

    try {
      // Just try to sync directly - the actual sync will reveal any permission issues
      const result = await mockService.syncToFirebase(orgId, user.username);
      setSyncResult(result);

      // If sync succeeded, mark write access as working
      if (result.synced > 0) {
        setWriteAccessStatus({ tested: true, canWrite: true });
      }
    } catch (error: any) {
      console.error('Sync failed:', error);
      setSyncResult({ synced: 0, failed: 0, error: error?.message || 'Sync failed' });
    } finally {
      setSyncing(false);
    }
  };

  const handleSaveFeature = async () => {
    if (!editingFeature?.featureName) return;

    const feature: FeatureConfig = {
      featureId: editingFeature.featureId || `feature_${Date.now()}`,
      featureName: editingFeature.featureName,
      description: editingFeature.description || '',
      orgId,
      isActive: true,
      order: editingFeature.order || features.length,
      createdAt: editingFeature.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      createdBy: user?.username || 'admin',
    };

    const success = await saveFeature(feature);
    if (success) {
      setShowFeatureModal(false);
      setEditingFeature(null);
    }
  };

  const handleCloneProfile = async (profileId: string) => {
    if (!cloneProfileName.trim()) return;

    const result = await cloneProfile(profileId, cloneProfileName);
    if (result) {
      setCloningProfileId(null);
      setCloneProfileName('');
    }
  };

  const handleSaveEvent = async () => {
    if (!editingEvent?.eventName) return;

    const event: EventDefinitionConfig = {
      eventId: editingEvent.eventId || `event_${Date.now()}`,
      eventName: editingEvent.eventName,
      description: editingEvent.description,
      featureId: editingEvent.featureId || '',
      orgId,
      defaultColor: editingEvent.defaultColor || '#4ECDC4',
      isErrorEvent: editingEvent.isErrorEvent || false,
      isAvgEvent: editingEvent.isAvgEvent || false,
      category: editingEvent.category,
      order: editingEvent.order || events.length,
      isActive: true,
      createdAt: editingEvent.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const success = await saveEvent(event);
    if (success) {
      setShowEventModal(false);
      setEditingEvent(null);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-4xl max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Firebase Configuration Panel
          </DialogTitle>
          <DialogDescription>
            Manage centralized dashboard configurations. Changes sync to all builds automatically.
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col overflow-hidden">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview" className="gap-2">
              <Database className="h-4 w-4" />
              Overview
            </TabsTrigger>
            <TabsTrigger value="features" className="gap-2">
              <Zap className="h-4 w-4" />
              Features
            </TabsTrigger>
            <TabsTrigger value="profiles" className="gap-2">
              <LayoutDashboard className="h-4 w-4" />
              Profiles
            </TabsTrigger>
            <TabsTrigger value="events" className="gap-2">
              <Layers className="h-4 w-4" />
              Events
            </TabsTrigger>
          </TabsList>

          <ScrollArea className="flex-1 pr-4">
            {/* Overview Tab */}
            <TabsContent value="overview" className="mt-4 space-y-4">
              {/* Connection Status Card */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    {isConnected ? (
                      <Cloud className="h-4 w-4 text-green-500" />
                    ) : (
                      <CloudOff className="h-4 w-4 text-red-500" />
                    )}
                    Connection Status
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {/* Project Info */}
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Project ID</span>
                    <span className="text-sm font-mono">
                      {import.meta.env.VITE_FIREBASE_PROJECT_ID || '❌ Not configured'}
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Firebase Connection</span>
                    <Badge variant={isConnected ? 'default' : 'destructive'}>
                      {isConnected ? 'Connected' : 'Disconnected'}
                    </Badge>
                  </div>

                  {/* Write Access Test */}
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Write Access</span>
                    <div className="flex items-center gap-2">
                      {writeAccessStatus.tested ? (
                        <Badge variant={writeAccessStatus.canWrite ? 'default' : 'destructive'}>
                          {writeAccessStatus.canWrite ? 'Allowed' : 'Blocked'}
                        </Badge>
                      ) : (
                        <Button size="sm" variant="outline" onClick={handleTestWriteAccess}>
                          Test
                        </Button>
                      )}
                    </div>
                  </div>

                  {writeAccessStatus.error && (
                    <div className="p-2 rounded bg-red-50 dark:bg-red-900/20 text-xs text-red-600 dark:text-red-400">
                      <AlertTriangle className="h-3 w-3 inline mr-1" />
                      {writeAccessStatus.error}
                      <div className="mt-1 font-medium">
                        Go to Firebase Console → Firestore → Rules → Set: allow read, write: if true;
                      </div>
                    </div>
                  )}

                  {error && (
                    <div className="flex items-center gap-2 text-sm text-red-500">
                      <AlertTriangle className="h-4 w-4" />
                      {error}
                    </div>
                  )}
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">App Version</span>
                    <span className="text-sm font-medium">{globalConfig.appVersion}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Maintenance Mode</span>
                    <Switch
                      checked={globalConfig.maintenanceMode}
                      onCheckedChange={(checked) => updateGlobalConfig({ maintenanceMode: checked })}
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Sync Card */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Sync Local to Firebase</CardTitle>
                  <CardDescription>
                    Upload your local profiles to Firebase to share across all builds
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Button
                    onClick={handleSyncToFirebase}
                    disabled={syncing}
                    className="w-full"
                  >
                    {syncing ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Upload className="h-4 w-4 mr-2" />
                    )}
                    {syncing ? 'Syncing...' : 'Sync Local Profiles to Firebase'}
                  </Button>

                  {syncResult && (
                    <div
                      className="p-3 rounded-lg bg-muted"
                    >
                      {syncResult.error ? (
                        <div className="text-sm text-red-500">
                          <AlertTriangle className="h-4 w-4 inline mr-1" />
                          {syncResult.error}
                        </div>
                      ) : (
                        <div className="flex items-center gap-4 text-sm">
                          <div className="flex items-center gap-1 text-green-500">
                            <Check className="h-4 w-4" />
                            {syncResult.synced} synced
                          </div>
                          {syncResult.failed > 0 && (
                            <div className="flex items-center gap-1 text-red-500">
                              <X className="h-4 w-4" />
                              {syncResult.failed} failed
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Stats Cards */}
              <div className="grid grid-cols-3 gap-4">
                <Card>
                  <CardContent className="pt-6">
                    <div className="text-2xl font-bold">{features.length}</div>
                    <p className="text-xs text-muted-foreground">Features</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <div className="text-2xl font-bold">{profiles.length}</div>
                    <p className="text-xs text-muted-foreground">Profiles</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <div className="text-2xl font-bold">{events.length}</div>
                    <p className="text-xs text-muted-foreground">Events</p>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* Features Tab */}
            <TabsContent value="features" className="mt-4 space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold">Features</h3>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={refreshFeatures}
                  >
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Refresh
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => {
                      setEditingFeature({});
                      setShowFeatureModal(true);
                    }}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add Feature
                  </Button>
                </div>
              </div>

              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Order</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {features.map((feature) => (
                    <TableRow key={feature.featureId}>
                      <TableCell className="font-medium">{feature.featureName}</TableCell>
                      <TableCell className="text-muted-foreground">{feature.description}</TableCell>
                      <TableCell>{feature.order}</TableCell>
                      <TableCell>
                        <Badge variant={feature.isActive ? 'default' : 'secondary'}>
                          {feature.isActive ? 'Active' : 'Inactive'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => {
                              setEditingFeature(feature);
                              setShowFeatureModal(true);
                            }}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => deleteFeature(feature.featureId)}
                          >
                            <Trash2 className="h-4 w-4 text-red-500" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                  {features.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                        No features found. Add one to get started.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TabsContent>

            {/* Profiles Tab */}
            <TabsContent value="profiles" className="mt-4 space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold">Profiles</h3>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={refreshProfiles}
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Refresh
                </Button>
              </div>

              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Feature</TableHead>
                    <TableHead>Version</TableHead>
                    <TableHead>Default</TableHead>
                    <TableHead>Panels</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {profiles.map((profile) => (
                    <TableRow key={profile.profileId}>
                      <TableCell className="font-medium">{profile.profileName}</TableCell>
                      <TableCell className="text-muted-foreground">{profile.featureId}</TableCell>
                      <TableCell>v{profile.version}</TableCell>
                      <TableCell>
                        {profile.isDefault ? (
                          <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
                        ) : (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setDefaultProfile(profile.profileId)}
                          >
                            <Star className="h-4 w-4" />
                          </Button>
                        )}
                      </TableCell>
                      <TableCell>{profile.panels?.length || 0}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          {cloningProfileId === profile.profileId ? (
                            <div className="flex items-center gap-2">
                              <Input
                                value={cloneProfileName}
                                onChange={(e) => setCloneProfileName(e.target.value)}
                                placeholder="New name"
                                className="h-8 w-32"
                              />
                              <Button
                                size="icon"
                                variant="ghost"
                                onClick={() => handleCloneProfile(profile.profileId)}
                              >
                                <Check className="h-4 w-4" />
                              </Button>
                              <Button
                                size="icon"
                                variant="ghost"
                                onClick={() => setCloningProfileId(null)}
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </div>
                          ) : (
                            <>
                              <Button
                                size="icon"
                                variant="ghost"
                                onClick={() => setCloningProfileId(profile.profileId)}
                              >
                                <Copy className="h-4 w-4" />
                              </Button>
                              <Button
                                size="icon"
                                variant="ghost"
                                onClick={() => deleteProfile(profile.profileId)}
                              >
                                <Trash2 className="h-4 w-4 text-red-500" />
                              </Button>
                            </>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                  {profiles.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                        No profiles found. Create one from the dashboard.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TabsContent>

            {/* Events Tab */}
            <TabsContent value="events" className="mt-4 space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold">Event Definitions</h3>
                <Button
                  size="sm"
                  onClick={() => {
                    setEditingEvent({});
                    setShowEventModal(true);
                  }}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Event
                </Button>
              </div>

              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Event ID</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Color</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {events.map((event) => (
                    <TableRow key={event.eventId}>
                      <TableCell className="font-mono text-sm">{event.eventId}</TableCell>
                      <TableCell className="font-medium">{event.eventName}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div
                            className="w-4 h-4 rounded"
                            style={{ backgroundColor: event.defaultColor }}
                          />
                          <span className="text-xs text-muted-foreground">{event.defaultColor}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          {event.isErrorEvent && <Badge variant="destructive">Error</Badge>}
                          {event.isAvgEvent && <Badge variant="secondary">Avg</Badge>}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => {
                              setEditingEvent(event);
                              setShowEventModal(true);
                            }}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                  {events.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                        No events defined. Add one to get started.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TabsContent>
          </ScrollArea>
        </Tabs>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </DialogFooter>

        {/* Feature Edit Modal */}
        <Dialog open={showFeatureModal} onOpenChange={setShowFeatureModal}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingFeature?.featureId ? 'Edit Feature' : 'Add Feature'}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Feature Name</Label>
                <Input
                  value={editingFeature?.featureName || ''}
                  onChange={(e) => setEditingFeature(prev => ({ ...prev, featureName: e.target.value }))}
                  placeholder="e.g., Price Alert"
                />
              </div>
              <div className="space-y-2">
                <Label>Description</Label>
                <Input
                  value={editingFeature?.description || ''}
                  onChange={(e) => setEditingFeature(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="e.g., Monitor price changes"
                />
              </div>
              <div className="space-y-2">
                <Label>Display Order</Label>
                <Input
                  type="number"
                  value={editingFeature?.order || 0}
                  onChange={(e) => setEditingFeature(prev => ({ ...prev, order: parseInt(e.target.value) }))}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowFeatureModal(false)}>
                Cancel
              </Button>
              <Button onClick={handleSaveFeature}>
                Save Feature
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Event Edit Modal */}
        <Dialog open={showEventModal} onOpenChange={setShowEventModal}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingEvent?.eventId ? 'Edit Event' : 'Add Event'}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Event ID</Label>
                <Input
                  value={editingEvent?.eventId || ''}
                  onChange={(e) => setEditingEvent(prev => ({ ...prev, eventId: e.target.value }))}
                  placeholder="e.g., PA_SET"
                />
              </div>
              <div className="space-y-2">
                <Label>Event Name</Label>
                <Input
                  value={editingEvent?.eventName || ''}
                  onChange={(e) => setEditingEvent(prev => ({ ...prev, eventName: e.target.value }))}
                  placeholder="e.g., Alert Set"
                />
              </div>
              <div className="space-y-2">
                <Label>Default Color</Label>
                <div className="flex gap-2">
                  <Input
                    type="color"
                    value={editingEvent?.defaultColor || '#4ECDC4'}
                    onChange={(e) => setEditingEvent(prev => ({ ...prev, defaultColor: e.target.value }))}
                    className="w-16 h-10 p-1"
                  />
                  <Input
                    value={editingEvent?.defaultColor || '#4ECDC4'}
                    onChange={(e) => setEditingEvent(prev => ({ ...prev, defaultColor: e.target.value }))}
                    placeholder="#4ECDC4"
                    className="flex-1"
                  />
                </div>
              </div>
              <div className="flex items-center justify-between">
                <Label>Is Error Event</Label>
                <Switch
                  checked={editingEvent?.isErrorEvent || false}
                  onCheckedChange={(checked) => setEditingEvent(prev => ({ ...prev, isErrorEvent: checked }))}
                />
              </div>
              <div className="flex items-center justify-between">
                <Label>Is Average Event</Label>
                <Switch
                  checked={editingEvent?.isAvgEvent || false}
                  onCheckedChange={(checked) => setEditingEvent(prev => ({ ...prev, isAvgEvent: checked }))}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowEventModal(false)}>
                Cancel
              </Button>
              <Button onClick={handleSaveEvent}>
                Save Event
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </DialogContent>
    </Dialog>
  );
}
