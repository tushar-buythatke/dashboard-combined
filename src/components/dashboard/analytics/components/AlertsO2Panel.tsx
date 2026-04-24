import { useEffect, useMemo, useState } from 'react'
import { BellRing, Beaker, Database, Loader2, Plus, Save, TestTube2, Trash2, XCircle, Code2, ListFilter, CheckCircle2, AlertTriangle, ArrowRight, CalendarDays, Webhook, LineChart } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Switch } from '@/components/ui/switch'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'
import { useToast } from '@/hooks/use-toast'
import { alertsO2Service, type O2AlertEvent, type O2AlertFilter, type O2AlertPayload, type O2AlertTestData } from '@/services/alertsO2Service'

interface AlertsO2PanelProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  featureId: string
  featureName: string
  canEdit: boolean
}

interface AlertDraft {
  alertEventId?: number
  alertName: string
  sourceTable: string
  queryMode: 'structured' | 'sql_override'
  eventNamesText: string
  groupByText: string
  filtersText: string
  sqlOverride: string
  recentDays: number
  baselineDays: number
  minimumBaselinePerDay: number
  comparator: string
  evaluationMode: 'aggregate' | 'daily'
  minimumChangePercent: number
  breachDaysRequired: number
  sameWeekdayBaseline: boolean
  thresholdEnabled: boolean
  thresholdType: string
  thresholdValue: number
  webhooksText: string
  status: number
  testerEnabled: boolean
}

const DEFAULT_DRAFT: AlertDraft = {
  alertName: '',
  sourceTable: 'user_analytics_logs',
  queryMode: 'structured',
  eventNamesText: '',
  groupByText: '',
  filtersText: '[]',
  sqlOverride: '',
  recentDays: 4,
  baselineDays: 21,
  minimumBaselinePerDay: 5,
  comparator: 'less_than',
  evaluationMode: 'aggregate',
  minimumChangePercent: 15,
  breachDaysRequired: 2,
  sameWeekdayBaseline: true,
  thresholdEnabled: false,
  thresholdType: 'baseline_percent',
  thresholdValue: 100,
  webhooksText: '',
  status: 1,
  testerEnabled: true,
}

const FILTERS_EXAMPLE = JSON.stringify(
  [
    { field: 'platform', operator: '=', value: 0 },
    { field: 'source', operator: '=', value: 1 },
  ],
  null,
  2
)

const COMPARATOR_OPTIONS = [
  { value: 'less_than', label: '<  Less than' },
  { value: 'less_than_or_equal', label: '<= Less than or equal' },
  { value: 'greater_than', label: '>  Greater than' },
  { value: 'greater_than_or_equal', label: '>= Greater than or equal' },
]

const THRESHOLD_TYPE_OPTIONS = [
  { value: 'baseline_percent', label: 'Percent of baseline' },
  { value: 'absolute', label: 'Absolute count' },
]

const EVALUATION_MODE_OPTIONS = [
  { value: 'aggregate', label: 'Window total' },
  { value: 'daily', label: 'Daily consistency' },
]

const STATUS_OPTIONS = [
  { value: '1', label: 'Active' },
  { value: '0', label: 'Paused' },
]

function parseCommaList(text: string) {
  return text
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)
}

function stringifyFilters(filters: O2AlertFilter[]) {
  return JSON.stringify(filters || [], null, 2)
}

function buildDraftFromAlert(alert: O2AlertEvent): AlertDraft {
  return {
    alertEventId: alert.alertEventId,
    alertName: alert.alertName,
    sourceTable: alert.sourceTable,
    queryMode: (alert.conditions.queryMode || 'structured') as 'structured' | 'sql_override',
    eventNamesText: (alert.eventNames || []).join(', '),
    groupByText: (alert.groupBy || []).join(', '),
    filtersText: stringifyFilters(alert.filters || []),
    sqlOverride: alert.sqlOverride || '',
    recentDays: alert.conditions.windows.recentDays,
    baselineDays: alert.conditions.windows.baselineDays,
    minimumBaselinePerDay: alert.conditions.windows.minimumBaselinePerDay,
    comparator: alert.conditions.evaluation.comparator,
    evaluationMode: (alert.conditions.evaluation.evaluationMode || 'aggregate') as 'aggregate' | 'daily',
    minimumChangePercent: alert.conditions.evaluation.minimumChangePercent,
    breachDaysRequired: alert.conditions.evaluation.breachDaysRequired || 2,
    sameWeekdayBaseline: alert.conditions.evaluation.sameWeekdayBaseline ?? true,
    thresholdEnabled: alert.conditions.evaluation.thresholdEnabled,
    thresholdType: alert.conditions.evaluation.thresholdType,
    thresholdValue: alert.conditions.evaluation.thresholdValue,
    webhooksText: (alert.googleChatWebhooks || []).join('\n'),
    status: alert.status,
    testerEnabled: true,
  }
}

function buildPayload(featureId: string, draft: AlertDraft): O2AlertPayload {
  let parsedFilters: O2AlertFilter[] = []
  if (draft.filtersText.trim()) {
    parsedFilters = JSON.parse(draft.filtersText)
  }

  return {
    alertEventId: draft.alertEventId,
    featureId: Number(featureId),
    alertName: draft.alertName.trim(),
    sourceTable: draft.sourceTable.trim(),
    eventNames: draft.queryMode === 'structured' ? parseCommaList(draft.eventNamesText) : [],
    groupBy: parseCommaList(draft.groupByText),
    filters: draft.queryMode === 'structured' ? parsedFilters : [],
    sqlOverride: draft.queryMode === 'sql_override' ? draft.sqlOverride.trim() : null,
    recentDays: Number(draft.recentDays),
    baselineDays: Number(draft.baselineDays),
    minimumBaselinePerDay: Number(draft.minimumBaselinePerDay),
    comparator: draft.comparator,
    evaluationMode: draft.evaluationMode,
    minimumChangePercent: Number(draft.minimumChangePercent),
    breachDaysRequired: Number(draft.breachDaysRequired),
    sameWeekdayBaseline: draft.sameWeekdayBaseline,
    thresholdEnabled: draft.thresholdEnabled,
    thresholdType: draft.thresholdType,
    thresholdValue: Number(draft.thresholdValue),
    googleChatWebhooks: draft.webhooksText
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean),
    status: draft.status,
  }
}

function getSeverityBadgeClass(severity: string) {
  if (severity === 'CRITICAL') return 'bg-red-100 text-red-700 border-red-200 dark:bg-red-950/30 dark:text-red-300 dark:border-red-800'
  if (severity === 'HIGH') return 'bg-orange-100 text-orange-700 border-orange-200 dark:bg-orange-950/30 dark:text-orange-300 dark:border-orange-800'
  if (severity === 'MEDIUM') return 'bg-yellow-100 text-yellow-700 border-yellow-200 dark:bg-yellow-950/30 dark:text-yellow-300 dark:border-yellow-800'
  return 'bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-950/30 dark:text-blue-300 dark:border-blue-800'
}

function getThresholdHelperText(draft: AlertDraft) {
  if (!draft.thresholdEnabled) {
    if (draft.evaluationMode === 'daily') {
      return draft.comparator.startsWith('less')
        ? `Daily mode: trigger when at least ${draft.breachDaysRequired} of the last ${draft.recentDays} days fall below baseline by at least ${draft.minimumChangePercent}%.`
        : `Daily mode: trigger when at least ${draft.breachDaysRequired} of the last ${draft.recentDays} days rise above baseline by at least ${draft.minimumChangePercent}%.`
    }
    return draft.comparator.startsWith('less')
      ? `Default compare mode: trigger when current count drops below the scaled baseline by at least ${draft.minimumChangePercent}%.`
      : `Default compare mode: trigger when current count rises above the scaled baseline by at least ${draft.minimumChangePercent}%.`
  }

  if (draft.thresholdType === 'absolute') {
    return draft.comparator.startsWith('less')
      ? 'Absolute count threshold. Example: trigger when current count is below 10.'
      : 'Absolute count threshold. Example: trigger when current count is above 10.'
  }

  return draft.comparator.startsWith('less')
    ? 'Percent of the scaled baseline. Example: 80 means trigger when current goes below 80% of baseline.'
    : 'Percent of the scaled baseline. Example: 120 means trigger when current goes above 120% of baseline.'
}

function getThresholdModeSetupText(draft: AlertDraft) {
  if (!draft.thresholdEnabled) {
    return draft.comparator.startsWith('less')
      ? draft.evaluationMode === 'daily'
        ? 'Use this when you want repeated day-level degradation, not just a weak aggregate dip.'
        : 'Use this when you want automatic drop detection against baseline. Example: success dropped below expected baseline.'
      : draft.evaluationMode === 'daily'
        ? 'Use this when you want repeated day-level spikes, not just one large aggregate day.'
        : 'Use this when you want automatic spike detection against baseline. Use a stronger baseline floor and change floor so low-volume noise is ignored.'
  }

  if (draft.thresholdType === 'absolute') {
    return draft.comparator.startsWith('less')
      ? 'Setup: pick Less than, turn threshold mode on, choose Absolute count, then enter a fixed number like 10. Alert triggers when current count goes below 10.'
      : 'Setup: pick Greater than, turn threshold mode on, choose Absolute count, then enter a fixed number like 20. Alert triggers when current count goes above 20.'
  }

  return draft.comparator.startsWith('less')
    ? 'Setup: pick Less than, turn threshold mode on, choose Percent of baseline, then enter a number like 80. Alert triggers when current count falls below 80% of baseline.'
    : 'Setup: pick Greater than, turn threshold mode on, choose Percent of baseline, then enter a number like 120. Alert triggers when current count rises above 120% of baseline.'
}

function applyComparatorDefaults(comparator: string, current: AlertDraft): AlertDraft {
  if (comparator.startsWith('greater')) {
    return {
      ...current,
      comparator,
      minimumBaselinePerDay: current.minimumBaselinePerDay < 7 ? 7 : current.minimumBaselinePerDay,
      minimumChangePercent: current.minimumChangePercent < 50 ? 50 : current.minimumChangePercent,
    }
  }

  return {
    ...current,
    comparator,
    minimumChangePercent: current.minimumChangePercent < 15 ? 15 : current.minimumChangePercent,
  }
}

function applyEvaluationModeDefaults(evaluationMode: 'aggregate' | 'daily', current: AlertDraft): AlertDraft {
  if (evaluationMode === 'daily') {
    return {
      ...current,
      evaluationMode,
      breachDaysRequired: Math.min(Math.max(current.breachDaysRequired, 2), current.recentDays),
      sameWeekdayBaseline: true,
    }
  }

  return {
    ...current,
    evaluationMode,
  }
}

function getSqlGroupingHelperText(testResult: O2AlertTestData | null) {
  const currentRow = testResult?.currentRows?.[0] as Record<string, unknown> | undefined
  const baselineRow = testResult?.baselineRows?.[0] as Record<string, unknown> | undefined
  const sampleRow = currentRow || baselineRow

  if (!sampleRow) {
    return 'If your SQL returns columns like `pos`, `pid`, or `platform` along with `metric_value`, the backend automatically treats those non-metric columns as the grouping keys.'
  }

  const inferredColumns = Object.keys(sampleRow).filter((key) => key !== 'metric_value' && key !== 'cnt')
  if (inferredColumns.length === 0) {
    return 'Your SQL must return at least one non-metric column if you want alerts grouped by a label such as `pos`.'
  }

  return `Current SQL shape will be grouped by: ${inferredColumns.join(', ')}.`
}

export function AlertsO2Panel({ open, onOpenChange, featureId, featureName, canEdit }: AlertsO2PanelProps) {
  const { toast } = useToast()
  const [alerts, setAlerts] = useState<O2AlertEvent[]>([])
  const [loadingAlerts, setLoadingAlerts] = useState(false)
  const [selectedAlertId, setSelectedAlertId] = useState<number | 'new'>('new')
  const [draft, setDraft] = useState<AlertDraft>(DEFAULT_DRAFT)
  const [testing, setTesting] = useState(false)
  const [saving, setSaving] = useState(false)
  const [deletingId, setDeletingId] = useState<number | null>(null)
  const [testResult, setTestResult] = useState<O2AlertTestData | null>(null)
  const [testError, setTestError] = useState<string | null>(null)

  const activeAlert = useMemo(
    () => alerts.find((alert) => alert.alertEventId === selectedAlertId) || null,
    [alerts, selectedAlertId]
  )

  async function loadAlerts() {
    setLoadingAlerts(true)
    try {
      const response = await alertsO2Service.list(Number(featureId))
      if (response.status !== 1 || !response.data) {
        throw new Error(response.error || 'Could not load alerts')
      }
      setAlerts(response.data.alertEvents)
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Failed to load alerts',
        description: error instanceof Error ? error.message : 'Unknown error',
      })
    } finally {
      setLoadingAlerts(false)
    }
  }

  useEffect(() => {
    if (!open) {
      return
    }
    loadAlerts()
  }, [open, featureId])

  useEffect(() => {
    if (!open) {
      return
    }

    if (selectedAlertId === 'new') {
      setDraft(DEFAULT_DRAFT)
      setTestResult(null)
      setTestError(null)
      return
    }

    if (activeAlert) {
      setDraft(buildDraftFromAlert(activeAlert))
      setTestResult(null)
      setTestError(null)
    }
  }, [selectedAlertId, activeAlert, open])

  async function handleTest() {
    setTesting(true)
    setTestError(null)
    setTestResult(null)

    try {
      const payload = buildPayload(featureId, draft)
      const response = await alertsO2Service.test(payload)
      if (response.status !== 1 || !response.data) {
        throw new Error(response.error || 'Test failed')
      }
      setTestResult(response.data)
      toast({
        title: 'Alert test complete',
        description: `Matched ${response.data.matchedCount} alert rows from O2`,
      })
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error'
      setTestError(message)
      toast({
        variant: 'destructive',
        title: 'Alert test failed',
        description: message,
      })
    } finally {
      setTesting(false)
    }
  }

  async function handleSave() {
    if (!canEdit) {
      return
    }

    setSaving(true)
    try {
      const payload = buildPayload(featureId, draft)
      const response = draft.alertEventId
        ? await alertsO2Service.update(payload)
        : await alertsO2Service.insert(payload)

      if (response.status !== 1 || !response.data) {
        throw new Error(response.error || 'Save failed')
      }

      await loadAlerts()
      setSelectedAlertId(response.data.alertEvent.alertEventId)
      setDraft((currentDraft) => ({ ...currentDraft, testerEnabled: true }))
      toast({
        title: draft.alertEventId ? 'Alert updated' : 'Alert created',
        description: response.data.alertEvent.alertName,
      })
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Could not save alert',
        description: error instanceof Error ? error.message : 'Unknown error',
      })
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(alertEventId: number) {
    if (!canEdit) {
      return
    }

    setDeletingId(alertEventId)
    try {
      const response = await alertsO2Service.remove(alertEventId)
      if (response.status !== 1) {
        throw new Error(response.error || 'Delete failed')
      }
      if (selectedAlertId === alertEventId) {
        setSelectedAlertId('new')
      }
      await loadAlerts()
      toast({ title: 'Alert deleted' })
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Could not delete alert',
        description: error instanceof Error ? error.message : 'Unknown error',
      })
    } finally {
      setDeletingId(null)
    }
  }

  const saveDisabled = !canEdit || draft.testerEnabled || saving || testing || !draft.alertName.trim()

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent showCloseButton className="max-w-[96vw] h-[94vh] rounded-[28px] border-0 p-0 overflow-hidden bg-transparent shadow-none">
        <div className="flex h-full min-h-0 flex-col rounded-[28px] border bg-slate-50/90 dark:bg-slate-950/90 shadow-[0_30px_120px_rgba(16,24,40,0.24)] overflow-hidden backdrop-blur-xl">
          <div className="border-b border-slate-200/80 bg-white/80 px-4 py-4 backdrop-blur-xl dark:border-slate-800 dark:bg-slate-950/80 md:px-6">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex items-start gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-blue-600 text-white shadow-lg shadow-indigo-500/20">
                  <BellRing className="h-5 w-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">Feature Alerts</h1>
                    <Badge variant="secondary" className="rounded-full px-3 py-1">featureId {featureId}</Badge>
                  </div>
                  <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Feature-scoped O2 alert builder for {featureName}</p>
                </div>
              </div>

              <Button size="sm" onClick={() => setSelectedAlertId('new')} className="gap-2 rounded-xl self-start lg:self-auto">
                <Plus className="h-4 w-4" />
                New alert
              </Button>
            </div>
          </div>

          <div className="grid h-full min-h-0 grid-cols-1 lg:grid-cols-[300px_minmax(0,1fr)]">
            <aside className="flex min-h-0 flex-col border-b border-slate-200/80 bg-white/70 backdrop-blur-xl dark:border-slate-800 dark:bg-slate-950/60 lg:border-b-0 lg:border-r">
              <div className="flex items-center justify-between gap-3 px-4 py-3">
                <div>
                  <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">Saved alerts</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Select one to edit it, or start a new draft</p>
                </div>
              </div>

<ScrollArea className="min-h-0 flex-1 px-3 pb-4">
                <div className="space-y-3" role="listbox" aria-label="Saved alerts">
                  <Card
                    className={cn('cursor-pointer border-slate-200/80 bg-white/90 transition-all shadow-sm hover:border-indigo-300 dark:border-slate-800 dark:bg-slate-900/80', selectedAlertId === 'new' && 'ring-2 ring-indigo-400/40 border-indigo-300')}
                    onClick={() => setSelectedAlertId('new')}
                    role="option"
                    aria-selected={selectedAlertId === 'new'}
                    tabIndex={0}
                    onKeyDown={(e) => e.key === 'Enter' && setSelectedAlertId('new')}
                  >
                    <CardContent className="flex items-center gap-3 p-4">
                      <div className="rounded-xl bg-indigo-500/10 p-2 text-indigo-600 dark:bg-indigo-500/20 dark:text-indigo-300">
                        <Plus className="h-4 w-4" />
                      </div>
                      <div>
                        <p className="font-medium text-slate-900 dark:text-slate-100">New alert draft</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">Start from scratch with the guided setup flow</p>
                      </div>
                    </CardContent>
                  </Card>

                  {loadingAlerts ? (
                    <AlertsListSkeleton />
                  ) : alerts.length === 0 ? (
                    <Card>
                      <CardContent className="p-4 text-sm text-muted-foreground">
                        No saved alerts yet for this feature.
                      </CardContent>
                    </Card>
                  ) : (
                    alerts.map((alert) => (
                      <Card
                        key={alert.alertEventId}
                        className={cn('cursor-pointer border-slate-200/80 bg-white/90 transition-all shadow-sm hover:border-indigo-300 dark:border-slate-800 dark:bg-slate-900/80', selectedAlertId === alert.alertEventId && 'ring-2 ring-indigo-400/40 border-indigo-300')}
                        onClick={() => setSelectedAlertId(alert.alertEventId)}
                        role="option"
                        aria-selected={selectedAlertId === alert.alertEventId}
                        tabIndex={0}
                        onKeyDown={(e) => e.key === 'Enter' && setSelectedAlertId(alert.alertEventId)}
                      >
                        <CardContent className="space-y-3 p-4">
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <p className="truncate font-medium text-slate-900 dark:text-slate-100">{alert.alertName}</p>
                              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                                {alert.conditions.queryMode === 'sql_override'
                                  ? 'SQL override'
                                  : `${alert.eventNames.length} events • ${alert.groupBy.join(', ') || 'pos'}`}
                              </p>
                            </div>
                            <Badge variant={alert.status === 1 ? 'default' : 'secondary'} className="rounded-full" role="status" aria-label={alert.status === 1 ? 'Active' : 'Paused'}>
                              {alert.status === 1 ? 'Active' : 'Paused'}
                            </Badge>
                          </div>

                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <Database className="h-3.5 w-3.5" aria-hidden="true" />
                            <span>{alert.sourceTable}</span>
                          </div>

                          <div className="flex items-center justify-between gap-2 text-xs">
                            <span className="text-slate-500 dark:text-slate-400">Last checked</span>
                            <span className="font-medium text-slate-900 dark:text-slate-100">{alert.lastCheckedAt ? new Date(alert.lastCheckedAt).toLocaleString() : 'Never'}</span>
                          </div>

                          {canEdit && (
                            <div className="flex justify-end">
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 gap-1.5 text-red-600 hover:text-red-700"
                                onClick={(event) => {
                                  event.stopPropagation()
                                  handleDelete(alert.alertEventId)
                                }}
                                disabled={deletingId === alert.alertEventId}
                                aria-label={`Delete alert ${alert.alertName}`}
                              >
                                {deletingId === alert.alertEventId ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                                Delete
                              </Button>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    ))
                  )}
                </div>
              </ScrollArea>
          </aside>

          <section className="min-h-0 overflow-y-auto bg-transparent">
            <DialogHeader className="sr-only">
              <DialogTitle>Feature Alerts</DialogTitle>
              <DialogDescription>Feature scoped alert builder</DialogDescription>
            </DialogHeader>

            <div className="space-y-4 px-4 py-4 md:px-6 md:py-4 xl:px-7">
              <DashboardCardHeader draft={draft} setDraft={setDraft} canEdit={canEdit} onTest={handleTest} testing={testing} onSave={handleSave} saveDisabled={saveDisabled} saving={saving} />

              <Tabs value={draft.queryMode} onValueChange={(value) => setDraft((current) => ({ ...current, queryMode: value as 'structured' | 'sql_override' }))}>
                <TabsList className="grid w-full max-w-md grid-cols-2">
                  <TabsTrigger value="structured" className="gap-2"><ListFilter className="h-4 w-4" /> Structured</TabsTrigger>
                  <TabsTrigger value="sql_override" className="gap-2"><Code2 className="h-4 w-4" /> SQL Override</TabsTrigger>
                </TabsList>

                <TabsContent value="structured" className="space-y-4 pt-4">
                  <StructuredForm draft={draft} setDraft={setDraft} canEdit={canEdit} />
                </TabsContent>

                <TabsContent value="sql_override" className="space-y-4 pt-4">
                  <SqlOverrideForm draft={draft} setDraft={setDraft} canEdit={canEdit} testResult={testResult} />
                </TabsContent>
              </Tabs>

              <RuleAndDeliverySection draft={draft} setDraft={setDraft} canEdit={canEdit} />

              <TesterPanel
                draft={draft}
                setDraft={setDraft}
                testResult={testResult}
                testError={testError}
                testing={testing}
                onRunTest={handleTest}
              />
            </div>
          </section>
        </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

function DashboardCardHeader({
  draft,
  setDraft,
  canEdit,
  onTest,
  testing,
  onSave,
  saveDisabled,
  saving,
}: {
  draft: AlertDraft
  setDraft: React.Dispatch<React.SetStateAction<AlertDraft>>
  canEdit: boolean
  onTest: () => void
  testing: boolean
  onSave: () => void
  saveDisabled: boolean
  saving: boolean
}) {
  return (
    <Card className="overflow-hidden border border-slate-200/80 bg-white/90 shadow-lg dark:border-slate-800 dark:bg-slate-900/80">
      <CardContent className="space-y-4 p-5">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="secondary" className="rounded-full">Alert editor</Badge>
            <Badge className={cn('rounded-full border-transparent', draft.testerEnabled ? 'bg-amber-100 text-amber-800 dark:bg-amber-500/20 dark:text-amber-200' : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-200')} role="status" aria-label={draft.testerEnabled ? 'Tester enabled - requires test before save' : 'Tester disabled - can save directly'}>
              {draft.testerEnabled ? 'Tester On' : 'Tester Off'}
            </Badge>
            <span className="text-sm text-slate-500 dark:text-slate-400">Test the config first, then switch tester lock off to save.</span>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 dark:border-slate-700 dark:bg-slate-800/80">
              <Label htmlFor="tester-enabled" className="cursor-pointer text-xs font-medium text-slate-700 dark:text-slate-200">Require tester first</Label>
              <Switch
                id="tester-enabled"
                checked={draft.testerEnabled}
                onCheckedChange={(checked) => setDraft((current) => ({ ...current, testerEnabled: checked }))}
              />
            </div>

            <Button variant="outline" className="gap-2 rounded-xl" onClick={onTest} disabled={testing}>
              {testing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Beaker className="h-4 w-4" />}
              Test Config
            </Button>

            <Button className="gap-2 rounded-xl" onClick={onSave} disabled={saveDisabled || !canEdit}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Save Alert
            </Button>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="alert-name" className="text-slate-700 dark:text-slate-200">Alert name</Label>
            <Input
              id="alert-name"
              value={draft.alertName}
              onChange={(event) => setDraft((current) => ({ ...current, alertName: event.target.value }))}
              placeholder="Auto Coupons daily drop alert"
              className="rounded-xl"
              aria-describedby="alert-name-desc"
            />
            <p id="alert-name-desc" className="text-xs text-muted-foreground">A descriptive name for this alert</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="source-table" className="text-slate-700 dark:text-slate-200">Source table</Label>
            <Input
              id="source-table"
              value={draft.sourceTable}
              onChange={(event) => setDraft((current) => ({ ...current, sourceTable: event.target.value }))}
              placeholder="user_analytics_logs"
              className="rounded-xl"
              aria-describedby="source-table-desc"
            />
            <p id="source-table-desc" className="text-xs text-muted-foreground">The O2 table to query for this alert</p>
          </div>
        </div>

      </CardContent>
    </Card>
  )
}

function StructuredForm({ draft, setDraft, canEdit }: { draft: AlertDraft; setDraft: React.Dispatch<React.SetStateAction<AlertDraft>>; canEdit: boolean }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Step 1: Choose the rows you want to monitor</CardTitle>
        <CardDescription>
          Use this mode when the alert can be described as event names + optional filters + group columns. This is the easiest and safest mode for most alerts.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="grid gap-3 md:grid-cols-3">
          <InfoTile icon={<ListFilter className="h-4 w-4" />} title="1. Pick events" body="List the event names you want to count." />
          <InfoTile icon={<LineChart className="h-4 w-4" />} title="2. Group them" body="Use `pos` or `pos, pid` depending on where you want alerts." />
          <InfoTile icon={<Webhook className="h-4 w-4" />} title="3. Add filters if needed" body="Filters are just extra WHERE clauses beyond event names." />
        </div>

        <div className="grid gap-5 md:grid-cols-2">
        <div className="space-y-2 md:col-span-2">
          <Label>Event names</Label>
          <Textarea
            value={draft.eventNamesText}
            onChange={(event) => setDraft((current) => ({ ...current, eventNamesText: event.target.value }))}
            placeholder="ACCartUrlError, ACStuck, AutoCouponError"
            disabled={!canEdit}
            className="min-h-24"
          />
          <p className="text-xs text-muted-foreground">Comma-separated event names. Example: `AutoCouponError, WaitForSelError`. The system counts these rows from the selected table.</p>
        </div>

        <div className="space-y-2">
          <Label>Group by columns</Label>
          <Input
            value={draft.groupByText}
            onChange={(event) => setDraft((current) => ({ ...current, groupByText: event.target.value }))}
            placeholder="pos, pid"
            disabled={!canEdit}
          />
          <p className="text-xs text-muted-foreground">Example: `pos` or `pos, pid`. Leave it empty if you want the default `pos` grouping.</p>
        </div>

        <div className="space-y-2">
          <Label>Webhook URLs</Label>
          <Textarea
            value={draft.webhooksText}
            onChange={(event) => setDraft((current) => ({ ...current, webhooksText: event.target.value }))}
            placeholder="One Google Chat webhook per line"
            disabled={!canEdit}
            className="min-h-24"
          />
        </div>

        <div className="space-y-2 md:col-span-2">
          <Label>Filters JSON</Label>
          <Textarea
            value={draft.filtersText}
            onChange={(event) => setDraft((current) => ({ ...current, filtersText: event.target.value }))}
            placeholder={FILTERS_EXAMPLE}
            disabled={!canEdit}
            className="min-h-32 font-mono text-xs"
          />
          <div className="space-y-1 text-xs text-muted-foreground">
            <p>Use filters only for extra `WHERE` clauses beyond event names.</p>
            <p>Example: <code>{'{"field":"platform","operator":"=","value":0}'}</code> adds <code>platform = 0</code> to the query.</p>
            <p>If you do not need more filtering, keep this as <code>[]</code>.</p>
          </div>
        </div>
        </div>
      </CardContent>
    </Card>
  )
}

function SqlOverrideForm({ draft, setDraft, canEdit, testResult }: { draft: AlertDraft; setDraft: React.Dispatch<React.SetStateAction<AlertDraft>>; canEdit: boolean; testResult: O2AlertTestData | null }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Step 1: Use custom SQL when structured mode is not enough</CardTitle>
        <CardDescription>
          Paste the exact SQL you want O2 to run. Use this only when the structured builder cannot express your alert cleanly.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="grid gap-3 md:grid-cols-3">
          <InfoTile icon={<Code2 className="h-4 w-4" />} title="Return counts" body="Your SQL must return `metric_value` or `cnt` as the numeric count." />
          <InfoTile icon={<LineChart className="h-4 w-4" />} title="Return labels" body="Columns like `pos` and `pid` become the alert grouping labels." />
          <InfoTile icon={<CalendarDays className="h-4 w-4" />} title="Daily mode" body="If you want daily consistency in SQL mode, also return `alert_day`." />
        </div>

        <div className="space-y-2">
          <Label>SQL query</Label>
          <Textarea
            value={draft.sqlOverride}
            onChange={(event) => setDraft((current) => ({ ...current, sqlOverride: event.target.value }))}
            placeholder={'SELECT pos, pid, COUNT(*) AS metric_value FROM "user_analytics_logs" WHERE event_name IN (\'ACCartUrlError\', \'ACStuck\') GROUP BY pos, pid'}
            disabled={!canEdit}
            className="min-h-48 font-mono text-xs"
          />
        </div>

        <div className="rounded-2xl border bg-muted/20 p-4 text-sm text-muted-foreground">
          <p className="font-medium text-foreground">How grouping works in SQL mode</p>
          <p className="mt-2">`SELECT pos, COUNT(*) AS metric_value ... GROUP BY pos` means alerts are checked per `pos`.</p>
          <p className="mt-2">`SELECT pos, pid, COUNT(*) AS metric_value ... GROUP BY pos, pid` means alerts are checked per `pos + pid` pair.</p>
          <p className="mt-2">If you want daily consistency in SQL mode, your query must also return `alert_day`.</p>
          <p className="mt-2">{getSqlGroupingHelperText(testResult)}</p>
        </div>

        <div className="grid gap-4 md:grid-cols-1">
          <div className="space-y-2">
            <Label>Webhook URLs</Label>
            <Textarea
              value={draft.webhooksText}
              onChange={(event) => setDraft((current) => ({ ...current, webhooksText: event.target.value }))}
              placeholder="One Google Chat webhook per line"
              disabled={!canEdit}
              className="min-h-24"
            />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function RuleAndDeliverySection({ draft, setDraft, canEdit }: { draft: AlertDraft; setDraft: React.Dispatch<React.SetStateAction<AlertDraft>>; canEdit: boolean }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Step 2: Tell the alert how to judge good vs bad</CardTitle>
        <CardDescription>
          Decide whether you want to catch a drop, catch a spike, compare whole windows, or require repeated bad days before the alert fires.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <InfoTile icon={<ArrowRight className="h-4 w-4" />} title="Comparator" body="Use less-than for drops below baseline. Use greater-than for spikes above baseline." />
          <InfoTile icon={<CalendarDays className="h-4 w-4" />} title="Evaluation mode" body="Window total checks one combined total. Daily consistency checks repeated bad recent days." />
          <InfoTile icon={<AlertTriangle className="h-4 w-4" />} title="Noise filters" body="Use minimum baseline per day and minimum change percent to ignore weak or low-volume movement." />
          <InfoTile icon={<AlertTriangle className="h-4 w-4" />} title="Threshold mode" body="Keep it off for smart baseline comparisons. Turn it on only when you want a fixed rule like above 20 or below 80%." />
        </div>

        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
          <NumberField
            label="Recent days"
            value={draft.recentDays}
            onChange={(value) => setDraft((current) => ({ ...current, recentDays: value }))}
            disabled={!canEdit}
            helperText="How many most recent days are treated as current performance."
          />
          <NumberField
            label="Baseline days"
            value={draft.baselineDays}
            onChange={(value) => setDraft((current) => ({ ...current, baselineDays: value }))}
            disabled={!canEdit}
            helperText="Cutoff for the older comparison window. With recent=4 and baseline=21, the effective baseline span is 17 days."
          />
          <NumberField
            label="Minimum baseline events per day"
            value={draft.minimumBaselinePerDay}
            onChange={(value) => setDraft((current) => ({ ...current, minimumBaselinePerDay: value }))}
            disabled={!canEdit}
            helperText="Noise filter. Example: 5 means ignore groups averaging below 5 events per day in the baseline window."
          />
          <NumberField
            label="Minimum change percent"
            value={draft.minimumChangePercent}
            onChange={(value) => setDraft((current) => ({ ...current, minimumChangePercent: value }))}
            disabled={!canEdit || draft.thresholdEnabled}
            helperText="Used only when threshold mode is off. Example: 50 means require at least 50% drop or spike vs baseline."
          />
          <NumberField
            label="Required breach days"
            value={draft.breachDaysRequired}
            onChange={(value) => setDraft((current) => ({ ...current, breachDaysRequired: value }))}
            disabled={!canEdit || draft.evaluationMode !== 'daily'}
            helperText="Used only in daily consistency mode. Example: 2 means at least 2 recent days must breach."
          />
          <NumberField
            label="Threshold value"
            value={draft.thresholdValue}
            onChange={(value) => setDraft((current) => ({ ...current, thresholdValue: value }))}
            disabled={!canEdit || !draft.thresholdEnabled}
            helperText={draft.thresholdType === 'absolute' ? 'Direct count threshold.' : 'Percent of scaled baseline when explicit threshold mode is enabled.'}
          />
        </div>

        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          <SelectField
            label="Evaluation mode"
            value={draft.evaluationMode}
            onValueChange={(value) => setDraft((current) => applyEvaluationModeDefaults(value as 'aggregate' | 'daily', current))}
            disabled={!canEdit || draft.queryMode === 'sql_override'}
            options={EVALUATION_MODE_OPTIONS}
            helperText="Pick Daily consistency for constantly-below-par alerts. Pick Window total for simpler aggregate alerts."
          />
          <SelectField
            label="Comparator"
            value={draft.comparator}
            onValueChange={(value) => setDraft((current) => applyComparatorDefaults(value, current))}
            disabled={!canEdit}
            options={COMPARATOR_OPTIONS}
            helperText="Less-than means current is worse when it goes below target. Greater-than means current is worse when it goes above target."
          />

          <SelectField
            label="Threshold type"
            value={draft.thresholdType}
            onValueChange={(value) => setDraft((current) => ({ ...current, thresholdType: value }))}
            disabled={!canEdit || !draft.thresholdEnabled}
            options={THRESHOLD_TYPE_OPTIONS}
            helperText="Only matters when explicit threshold mode is enabled."
          />

          <SelectField
            label="Alert status"
            value={String(draft.status)}
            onValueChange={(value) => setDraft((current) => ({ ...current, status: Number(value) }))}
            disabled={!canEdit}
            options={STATUS_OPTIONS}
            helperText="Active alerts run in cron. Paused alerts stay saved but do not run."
          />

          <div className="rounded-2xl border bg-muted/20 p-4">
            <p className="text-sm font-medium">Explicit threshold mode</p>
            <p className="mt-1 text-xs text-muted-foreground">Keep this off unless you know the exact limit you want. Off = compare to baseline automatically. On = compare to a fixed count or baseline percent target.</p>
            <div className="mt-4 flex items-center justify-between">
              <span className="text-sm font-medium">Enabled</span>
              <Switch checked={draft.thresholdEnabled} onCheckedChange={(checked) => setDraft((current) => ({ ...current, thresholdEnabled: checked }))} disabled={!canEdit} />
            </div>
          </div>
        </div>

        <div className="grid gap-5 md:grid-cols-1 xl:grid-cols-2">
          <div className="rounded-2xl border bg-muted/20 p-4">
            <p className="text-sm font-medium">Rule explanation</p>
            <div className="mt-3 space-y-2 text-xs text-muted-foreground">
              <p><span className="font-medium text-foreground">Minimum baseline events per day:</span> ignore low-volume groups that are too noisy to matter.</p>
              <p><span className="font-medium text-foreground">Minimum change percent:</span> require a meaningful drop or spike before triggering in automatic compare mode.</p>
              <p><span className="font-medium text-foreground">Required breach days:</span> in daily mode, how many recent days must violate the rule.</p>
              <p><span className="font-medium text-foreground">Threshold value:</span> the number you compare against when threshold mode is on.</p>
              <p><span className="font-medium text-foreground">Threshold type:</span> choose between a fixed count or a percent of baseline.</p>
              <p><span className="font-medium text-foreground">Evaluation mode:</span> choose aggregate totals or repeated day-level checks.</p>
              <p><span className="font-medium text-foreground">Comparator:</span> controls whether you are alerting on values going below or above the comparison target.</p>
              <p><span className="font-medium text-foreground">Same weekday baseline:</span> daily mode compares each recent day against earlier days with the same weekday.</p>
              <p><span className="font-medium text-foreground">Current evaluation:</span> alerts compare either the full recent window or repeated recent days against baseline, depending on mode.</p>
              <p><span className="font-medium text-foreground">How to set it up:</span> {getThresholdModeSetupText(draft)}</p>
              <p>{getThresholdHelperText(draft)}</p>
            </div>
          </div>

          <div className="rounded-2xl border border-dashed bg-background/70 p-4 text-xs text-muted-foreground">
            <p className="font-medium text-foreground">Quick reading of this config</p>
            <p className="mt-2">
              You are checking the last <span className="font-medium text-foreground">{draft.recentDays}</span> days against the earlier <span className="font-medium text-foreground">{draft.baselineDays - draft.recentDays}</span> baseline days.
            </p>
            <p className="mt-2">
              Mode: <span className="font-medium text-foreground">{draft.evaluationMode === 'daily' ? 'Daily consistency' : 'Window total'}</span>.
              Comparator: <span className="font-medium text-foreground">{draft.comparator}</span>.
              Threshold mode: <span className="font-medium text-foreground">{draft.thresholdEnabled ? 'On' : 'Off'}</span>.
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function SelectField({
  label,
  value,
  onValueChange,
  disabled,
  options,
  helperText,
}: {
  label: string
  value: string
  onValueChange: (value: string) => void
  disabled: boolean
  options: Array<{ value: string; label: string }>
  helperText?: string
}) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <Select value={value} onValueChange={onValueChange} disabled={disabled}>
        <SelectTrigger className="w-full bg-background">
          <SelectValue placeholder={`Select ${label.toLowerCase()}`} />
        </SelectTrigger>
        <SelectContent>
          {options.map((option) => (
            <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
          ))}
        </SelectContent>
      </Select>
      {helperText && <p className="text-xs text-muted-foreground">{helperText}</p>}
    </div>
  )
}

function NumberField({ label, value, onChange, disabled, helperText }: { label: string; value: number; onChange: (value: number) => void; disabled: boolean; helperText?: string }) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <Input type="number" value={String(value)} onChange={(event) => onChange(Number(event.target.value))} disabled={disabled} />
      {helperText && <p className="text-xs text-muted-foreground">{helperText}</p>}
    </div>
  )
}

function InfoTile({ icon, title, body }: { icon: React.ReactNode; title: string; body: string }) {
  return (
    <div className="rounded-2xl border border-slate-200/80 bg-slate-50/80 p-4 dark:border-slate-800 dark:bg-slate-900/60" role="region" aria-label={title}>
      <div className="flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-slate-100">
        <span className="rounded-lg bg-indigo-500/10 p-1.5 text-indigo-600 dark:bg-indigo-500/20 dark:text-indigo-300" aria-hidden="true">{icon}</span>
        {title}
      </div>
      <p className="mt-2 text-xs leading-5 text-slate-600 dark:text-slate-400">{body}</p>
    </div>
  )
}

function AlertsListSkeleton() {
  return (
    <div className="space-y-3" role="status" aria-label="Loading alerts">
      <div className="flex items-center gap-3 p-4 border rounded-xl bg-background/50 animate-pulse">
        <Skeleton className="h-10 w-10 rounded-xl" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-3 w-48" />
        </div>
      </div>
      <div className="flex items-center gap-3 p-4 border rounded-xl bg-background/50 animate-pulse">
        <Skeleton className="h-10 w-10 rounded-xl" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-4 w-40" />
          <Skeleton className="h-3 w-56" />
        </div>
      </div>
    </div>
  )
}

function TesterSkeleton() {
  return (
    <Card className="border border-slate-200/80 bg-white/90 shadow-lg dark:border-slate-800 dark:bg-slate-900/80">
      <CardHeader>
        <div className="flex items-center gap-3">
          <Skeleton className="h-5 w-32" />
          <Skeleton className="h-5 w-16" />
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 md:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="rounded-xl border p-4 animate-pulse">
              <Skeleton className="h-3 w-20 mb-2" />
              <Skeleton className="h-6 w-12" />
            </div>
          ))}
        </div>
        <Skeleton className="h-48 w-full rounded-xl" />
      </CardContent>
    </Card>
  )
}

function TesterPanel({
  draft,
  setDraft,
  testResult,
  testError,
  testing,
  onRunTest,
}: {
  draft: AlertDraft
  setDraft: React.Dispatch<React.SetStateAction<AlertDraft>>
  testResult: O2AlertTestData | null
  testError: string | null
  testing: boolean
  onRunTest: () => void
}) {
  return (
    <Card className="border border-slate-200/80 bg-white/90 shadow-lg dark:border-slate-800 dark:bg-slate-900/80">
      <CardHeader>
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-base text-slate-900 dark:text-slate-100">
              <TestTube2 className="h-4 w-4 text-amber-500 dark:text-amber-300" />
              Tester Output
            </CardTitle>
            <CardDescription className="text-slate-500 dark:text-slate-400">
              This runs the exact same logic the saved alert will use. If this section is unclear or wrong, do not save yet.
            </CardDescription>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 dark:border-slate-700 dark:bg-slate-800/80">
              <Label htmlFor="tester-lock" className="text-xs text-slate-700 dark:text-slate-200">Tester lock</Label>
              <Switch id="tester-lock" checked={draft.testerEnabled} onCheckedChange={(checked) => setDraft((current) => ({ ...current, testerEnabled: checked }))} />
            </div>
            <Button variant="outline" onClick={onRunTest} disabled={testing} className="gap-2 rounded-xl">
              {testing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Beaker className="h-4 w-4" />}
              Run Test
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-5">
        {testError && (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-4 dark:border-red-500/30 dark:bg-red-500/10">
            <div className="mb-2 flex items-center gap-2 font-medium text-red-700 dark:text-red-200">
              <AlertTriangle className="h-4 w-4" />
              <span>Test failed</span>
            </div>
            <pre className="overflow-x-auto whitespace-pre-wrap text-xs text-red-600 dark:text-red-300">{testError}</pre>
          </div>
        )}

        {!testError && !testResult && (
          <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-6 text-sm text-slate-600 dark:border-slate-700 dark:bg-slate-900/50 dark:text-slate-300">
            Run a test to preview the generated SQL, raw O2 rows, matched groups, and daily breach details before saving.
          </div>
        )}

        {testResult && (
          <div className="space-y-5">
            <div className="grid gap-3 md:grid-cols-4">
              <MetricCard label="Matched alerts" value={String(testResult.matchedCount)} icon={<CheckCircle2 className="h-4 w-4 text-emerald-500" />} />
              <MetricCard label="Current rows" value={String(testResult.currentRows.length)} icon={<Database className="h-4 w-4 text-cyan-500" />} />
              <MetricCard label="Baseline rows" value={String(testResult.baselineRows.length)} icon={<Database className="h-4 w-4 text-violet-500" />} />
              <MetricCard label="Mode" value={`${String((testResult.alertConfig as any)?.conditions?.queryMode || 'structured')} • ${String((testResult.alertConfig as any)?.conditions?.evaluation?.evaluationMode || 'aggregate')}`} icon={<Code2 className="h-4 w-4 text-amber-500" />} />
            </div>

            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950/70">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Generated SQL</p>
              <pre className="overflow-x-auto whitespace-pre-wrap text-xs text-slate-800 dark:text-slate-100">{testResult.sql}</pre>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950/70">
              <div className="mb-3 flex items-center justify-between">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Evaluated Alert Rows</p>
                <Badge className="rounded-full border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-400/20 dark:bg-emerald-400/10 dark:text-emerald-200">{testResult.evaluatedAlerts.length} matches</Badge>
              </div>

              {testResult.evaluatedAlerts.length === 0 ? (
                <p className="text-sm text-slate-500 dark:text-slate-400">No matched alert rows for this config.</p>
              ) : (
                <div className="space-y-3">
                  {testResult.evaluatedAlerts.map((row) => (
                    <div key={row.groupKey} className="rounded-xl border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-900/70">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge className={cn('border', getSeverityBadgeClass(row.severity))}>{row.severity}</Badge>
                        <span className="font-medium text-slate-900 dark:text-slate-100">{row.displayLabel}</span>
                        {row.comparisonMode === 'daily' && row.breachDays !== undefined && (
                          <Badge variant="secondary" className="rounded-full">{row.breachDays}/{row.requiredBreachDays} breach days</Badge>
                        )}
                      </div>
                      <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
                        current: <span className="font-semibold text-slate-900 dark:text-white">{row.currCount}</span> | baseline raw: <span className="font-semibold text-slate-900 dark:text-white">{row.baseRaw}</span> | baseline scaled: <span className="font-semibold text-slate-900 dark:text-white">{row.baseScaled}</span> | change: <span className="font-semibold text-slate-900 dark:text-white">{row.changePctAbs}% {row.comparisonDirection}</span>
                      </p>
                      {row.comparisonMode === 'daily' && row.worstBreachDay && (
                        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Worst breach day: {row.worstBreachDay}</p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <Tabs defaultValue="rows" className="space-y-4">
              <TabsList className="grid w-full grid-cols-3 md:w-[420px]">
                <TabsTrigger value="rows">Rows</TabsTrigger>
                <TabsTrigger value="o2">Raw O2</TabsTrigger>
                <TabsTrigger value="config">Resolved config</TabsTrigger>
              </TabsList>

              <TabsContent value="rows" className="grid gap-5 xl:grid-cols-2">
                <RawResultBlock title="Current Window Raw Rows" rows={testResult.currentRows} />
                <RawResultBlock title="Baseline Window Raw Rows" rows={testResult.baselineRows} />
              </TabsContent>

              <TabsContent value="o2" className="grid gap-5 xl:grid-cols-2">
                <RawJsonBlock title="Current O2 Raw Response" value={testResult.currentRawResponse} />
                <RawJsonBlock title="Baseline O2 Raw Response" value={testResult.baselineRawResponse} />
              </TabsContent>

              <TabsContent value="config">
                <RawJsonBlock title="Resolved alert config" value={testResult.alertConfig} />
              </TabsContent>
            </Tabs>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function MetricCard({ label, value, icon }: { label: string; value: string; icon: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
      <div className="mb-3 flex items-center gap-2 text-slate-300">{icon}<span className="text-xs uppercase tracking-wide">{label}</span></div>
      <p className="text-2xl font-bold text-slate-100">{value}</p>
    </div>
  )
}

function RawResultBlock({ title, rows }: { title: string; rows: Array<Record<string, unknown>> }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">{title}</p>
      <pre className="max-h-72 overflow-auto whitespace-pre-wrap text-xs text-slate-200 scrollbar-thin scrollbar-thumb-slate-500 scrollbar-track-transparent">{JSON.stringify(rows, null, 2)}</pre>
    </div>
  )
}

function RawJsonBlock({ title, value }: { title: string; value: unknown }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">{title}</p>
      <pre className="max-h-80 overflow-auto whitespace-pre-wrap text-xs text-slate-200 scrollbar-thin scrollbar-thumb-slate-500 scrollbar-track-transparent">{JSON.stringify(value, null, 2)}</pre>
    </div>
  )
}
