const ALERTS_API_BASE_URL = 'https://ext1.buyhatke.com/feature-tracking/alertsO2'

export interface O2AlertFilter {
  field: string
  operator: string
  value: string | number | boolean | Array<string | number | boolean>
}

export interface O2AlertConditions {
  queryMode: 'structured' | 'sql_override'
  sourceTable: string
  eventNames: string[]
  groupBy: string[]
  filters: O2AlertFilter[]
  sqlOverride: string | null
  windows: {
    recentDays: number
    baselineDays: number
    minimumBaselinePerDay: number
  }
  evaluation: {
    comparator: string
    evaluationMode: 'aggregate' | 'daily'
    minimumChangePercent: number
    breachDaysRequired: number
    sameWeekdayBaseline: boolean
    thresholdEnabled: boolean
    thresholdType: string
    thresholdValue: number
  }
}

export interface O2AlertEvent {
  alertEventId: number
  alertName: string
  featureId: number
  sourceTable: string
  status: number
  eventNames: string[]
  groupBy: string[]
  filters: O2AlertFilter[]
  googleChatWebhooks: string[]
  sqlOverride: string | null
  conditions: O2AlertConditions
  createdAt: string | null
  updatedAt: string | null
  lastCheckedAt: string | null
  lastTriggeredAt: string | null
}

export interface O2EvaluatedAlertRow {
  groupKey: string
  groupValues: Record<string, string | number | null>
  currCount: number
  baseRaw: number
  baseScaled: number
  changePct: number
  changePctAbs: number
  comparisonDirection: 'drop' | 'increase'
  comparisonMode?: 'aggregate' | 'daily'
  breachDays?: number
  requiredBreachDays?: number
  evaluableDays?: number
  worstBreachDay?: string | null
  dayComparisons?: Array<{
    alertDay: string
    currentCount: number
    baselineAvg: number
    changePct: number
    matched: boolean
    skipped: boolean
  }>
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW'
  displayLabel: string
}

export interface O2AlertTestData {
  alertConfig: O2AlertEvent | Record<string, unknown>
  sql: string
  currentRows: Array<Record<string, unknown>>
  baselineRows: Array<Record<string, unknown>>
  currentRawResponse: Record<string, unknown>
  baselineRawResponse: Record<string, unknown>
  evaluatedAlerts: O2EvaluatedAlertRow[]
  matchedCount: number
}

export interface O2AlertApiResponse<T> {
  status: number
  data?: T
  error?: string
  message?: string
}

export interface O2AlertPayload {
  alertEventId?: number
  featureId: number
  alertName: string
  sourceTable: string
  eventNames?: string[]
  groupBy?: string[]
  filters?: O2AlertFilter[]
  sqlOverride?: string | null
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
  googleChatWebhooks?: string[]
  status?: number
}

async function request<T>(path: string, init?: RequestInit): Promise<O2AlertApiResponse<T>> {
  const response = await fetch(`${ALERTS_API_BASE_URL}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers || {}),
    },
    ...init,
  })

  return response.json()
}

export const alertsO2Service = {
  async list(featureId: number, status?: number) {
    const url = new URL(`${ALERTS_API_BASE_URL}/alertEvents`)
    url.searchParams.set('featureId', String(featureId))
    if (status !== undefined) {
      url.searchParams.set('status', String(status))
    }

    const response = await fetch(url.toString())
    return response.json() as Promise<O2AlertApiResponse<{ alertEvents: O2AlertEvent[] }>>
  },

  async test(payload: O2AlertPayload) {
    return request<O2AlertTestData>('/testAlertEvent', {
      method: 'POST',
      body: JSON.stringify(payload),
    })
  },

  async insert(payload: O2AlertPayload) {
    return request<{ alertEventId: number; alertEvent: O2AlertEvent }>('/insertAlertEvent', {
      method: 'POST',
      body: JSON.stringify(payload),
    })
  },

  async update(payload: O2AlertPayload) {
    return request<{ alertEventId: number; alertEvent: O2AlertEvent }>('/alertEvent', {
      method: 'POST',
      body: JSON.stringify(payload),
    })
  },

  async remove(alertEventId: number) {
    return request<{ alertEventId: number }>('/deleteAlertEvent', {
      method: 'POST',
      body: JSON.stringify({ alertEventId }),
    })
  },
}
