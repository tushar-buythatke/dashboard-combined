export type PlatformBreakdown = {
  success?: string | number | null
  errors?: string | number | null
  success_rate?: number | null
}

export type NotificationBreakdownEntry = {
  pos: number
  pos_name?: string
  platform: number
  platform_name?: string
  total_notifications?: string | number | null
  successful_notifications?: string | number | null
  failed_notifications?: string | number | null
  success_rate?: number | null
  avg_delay_hours?: number | null
  avg_delay_minutes?: number | null
  android?: PlatformBreakdown
  chrome?: PlatformBreakdown
  email?: PlatformBreakdown
}

export type NotificationSummaryData = {
  breakdown?: NotificationBreakdownEntry[]
} | null

export type NotificationAggregate = {
  total_notifications: number
  total_success: number
  total_errors: number
  total_delay: number
  count: number
}

export const parseNumber = (value: string | number | null | undefined): number => {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : 0
  }

  if (typeof value === 'string') {
    const parsed = Number(value)
    return Number.isFinite(parsed) ? parsed : 0
  }

  return 0
}

export const computeNotificationStats = (data: NotificationBreakdownEntry[]): NotificationAggregate =>
  data.reduce<NotificationAggregate>(
    (acc, item) => {
      const totalNotifications = parseNumber(item.total_notifications)

      const directSuccess = parseNumber(item.successful_notifications)
      const fallbackSuccess =
        parseNumber(item.android?.success) +
        parseNumber(item.chrome?.success) +
        parseNumber(item.email?.success)
      const successfulNotifications = directSuccess || fallbackSuccess

      const directFailures = parseNumber(item.failed_notifications)
      const fallbackFailures =
        parseNumber(item.android?.errors) +
        parseNumber(item.chrome?.errors) +
        parseNumber(item.email?.errors)
      const failedNotifications = directFailures || fallbackFailures

      const avgDelayHours =
        parseNumber(item.avg_delay_hours) || parseNumber(item.avg_delay_minutes) / 60

      return {
        total_notifications: acc.total_notifications + totalNotifications,
        total_success: acc.total_success + successfulNotifications,
        total_errors: acc.total_errors + failedNotifications,
        total_delay: acc.total_delay + avgDelayHours * totalNotifications,
        count: acc.count + 1,
      }
    },
    { total_notifications: 0, total_success: 0, total_errors: 0, total_delay: 0, count: 0 },
  )
