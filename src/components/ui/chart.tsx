'use client'

import * as React from 'react'
import * as RechartsPrimitive from 'recharts'

import { cn } from '@/lib/utils'

// Format: { THEME_NAME: CSS_SELECTOR }
const THEMES = { light: '', dark: '.dark' } as const

export type ChartConfig = {
  [k in string]: {
    label?: React.ReactNode
    icon?: React.ComponentType
  } & (
    | { color?: string; theme?: never }
    | { color?: never; theme: Record<keyof typeof THEMES, string> }
  )
}

type ChartContextProps = {
  config: ChartConfig
}

const ChartContext = React.createContext<ChartContextProps | null>(null)

function useChart() {
  const context = React.useContext(ChartContext)

  if (!context) {
    throw new Error('useChart must be used within a <ChartContainer />')
  }

  return context
}

function ChartContainer({
  id,
  className,
  children,
  config,
  ...props
}: React.ComponentProps<'div'> & {
  config: ChartConfig
  children: React.ComponentProps<
    typeof RechartsPrimitive.ResponsiveContainer
  >['children']
}) {
  const uniqueId = React.useId()
  const chartId = `chart-${id || uniqueId.replace(/:/g, '')}`

  return (
    <ChartContext.Provider value={{ config }}>
      <div
        data-slot="chart"
        data-chart={chartId}
        className={cn(
          "[&_.recharts-cartesian-axis-tick_text]:fill-muted-foreground [&_.recharts-cartesian-grid_line[stroke='#ccc']]:stroke-border/50 [&_.recharts-curve.recharts-tooltip-cursor]:stroke-border [&_.recharts-polar-grid_[stroke='#ccc']]:stroke-border [&_.recharts-radial-bar-background-sector]:fill-muted [&_.recharts-rectangle.recharts-tooltip-cursor]:fill-muted [&_.recharts-reference-line_[stroke='#ccc']]:stroke-border flex justify-center text-xs [&_.recharts-dot[stroke='#fff']]:stroke-transparent [&_.recharts-layer]:outline-hidden [&_.recharts-sector]:outline-hidden [&_.recharts-sector[stroke='#fff']]:stroke-transparent [&_.recharts-surface]:outline-hidden",
          className,
        )}
        {...props}
      >
        <ChartStyle id={chartId} config={config} />
        <RechartsPrimitive.ResponsiveContainer>
          {children}
        </RechartsPrimitive.ResponsiveContainer>
      </div>
    </ChartContext.Provider>
  )
}

const ChartStyle = ({ id, config }: { id: string; config: ChartConfig }) => {
  const colorConfig = Object.entries(config).filter(
    ([, config]) => config.theme || config.color,
  )

  if (!colorConfig.length) {
    return null
  }

  return (
    <style
      dangerouslySetInnerHTML={{
        __html: Object.entries(THEMES)
          .map(
            ([theme, prefix]) => `
${prefix} [data-chart=${id}] {
${colorConfig
  .map(([key, itemConfig]) => {
    const color =
      itemConfig.theme?.[theme as keyof typeof itemConfig.theme] ||
      itemConfig.color
    return color ? `  --color-${key}: ${color};` : null
  })
  .join('\n')}
}
`,
          )
          .join('\n'),
      }}
    />
  )
}

const ChartTooltip = RechartsPrimitive.Tooltip

type TooltipItem = {
  name?: string | number
  dataKey?: string | number
  color?: string
  value?: number | string | null
  payload?: Record<string, unknown>
}

type ChartTooltipContentProps = React.ComponentProps<'div'> & {
  active?: boolean
  payload?: ReadonlyArray<TooltipItem>
  label?: React.ReactNode
  formatter?: (
    value: TooltipItem['value'],
    name: TooltipItem['name'],
    item: TooltipItem,
    index: number,
    payload: TooltipItem['payload']
  ) => React.ReactNode
  labelFormatter?: (
    label: React.ReactNode,
    payload: ReadonlyArray<TooltipItem>,
  ) => React.ReactNode
  indicator?: 'line' | 'dot' | 'dashed'
  hideLabel?: boolean
  hideIndicator?: boolean
  labelClassName?: string
  color?: string
  nameKey?: string
  labelKey?: string
}

function ChartTooltipContent({
  active,
  payload,
  className,
  indicator = 'dot',
  hideLabel = false,
  hideIndicator = false,
  label,
  labelFormatter,
  labelClassName,
  formatter,
  color,
  nameKey,
  labelKey,
}: ChartTooltipContentProps) {
  const { config } = useChart()
  const items: TooltipItem[] = React.useMemo(
    () =>
      Array.isArray(payload)
        ? (payload.filter((item): item is TooltipItem => !!item && typeof item === 'object') as TooltipItem[])
        : [],
    [payload]
  )

  const tooltipLabel = React.useMemo(() => {
    if (hideLabel || items.length === 0) {
      return null
    }

    const [item] = items
    const key = `${labelKey || item?.dataKey || item?.name || 'value'}`
    const itemConfig = getPayloadConfigFromPayload(config, item, key)
    const baseLabel =
      itemConfig?.label ||
      (typeof item?.name === 'string' ? item.name : undefined) ||
      (typeof item?.dataKey === 'string' ? item.dataKey : undefined) ||
      (typeof label === 'string' ? label : undefined)

    if (labelFormatter) {
      try {
        const formattedLabel = labelFormatter(label ?? baseLabel ?? null, items)

        if (formattedLabel == null || formattedLabel === false) {
          return null
        }

        return (
          <div className={cn('font-medium', labelClassName)}>
            {formattedLabel}
          </div>
        )
      } catch (error) {
        console.warn('Tooltip labelFormatter failed', error)
      }
    }

    if (!baseLabel && !label) {
      return null
    }

    return (
      <div className={cn('font-medium', labelClassName)}>
        {baseLabel ?? label}
      </div>
    )
  }, [
    labelFormatter,
    items,
    hideLabel,
    labelClassName,
    label,
    config,
    labelKey,
  ])

  if (!active || items.length === 0) {
    return null
  }

  const nestLabel = items.length === 1 && indicator !== 'dot'

  return (
    <div
      className={cn(
        'border-border/50 bg-background grid min-w-[12rem] items-start gap-2 rounded-lg border px-3 py-2 text-xs shadow-xl',
        className,
      )}
    >
      {!nestLabel ? tooltipLabel : null}
      <div className="grid gap-1.5">
        {items.map((item, index) => {
          const key = `${nameKey || item.name || item.dataKey || 'value'}`
          const itemConfig = getPayloadConfigFromPayload(config, item, key)
          const payloadRecord = (item.payload ?? {}) as { fill?: string }
          const indicatorColor =
            color || payloadRecord.fill || item.color

          let displayLabel: React.ReactNode = itemConfig?.label || item.name
          let displayValue: React.ReactNode = null

          const normalizeOutput = (value: unknown): React.ReactNode => {
            if (value == null || value === false) return null
            if (typeof value === 'number') return Number.isFinite(value) ? value.toLocaleString() : String(value)
            if (typeof value === 'string') return value
            if (React.isValidElement(value)) return value
            return String(value)
          }

          if (formatter && item?.value !== undefined) {
            try {
              const formatted = formatter(
                item.value,
                item.name,
                item,
                index,
                item.payload,
              )

              if (Array.isArray(formatted)) {
                displayValue = normalizeOutput(formatted[0])
                if (formatted.length > 1 && formatted[1] !== undefined) {
                  displayLabel = normalizeOutput(formatted[1])
                }
              } else {
                displayValue = normalizeOutput(formatted)
              }
            } catch (error) {
              console.warn('Tooltip formatter failed', error)
              displayValue = normalizeOutput(item.value)
            }
          } else if (item.value !== undefined && item.value !== null) {
            displayValue = normalizeOutput(item.value)
          }

          if (displayLabel == null && displayValue == null) {
            return null
          }

          return (
            <div
              key={`${item.dataKey ?? index}-${item.name ?? 'value'}`}
              className={cn(
                'flex w-full items-center gap-2',
              )}
            >
              {itemConfig?.icon ? (
                <itemConfig.icon />
              ) : (
                !hideIndicator && (
                  <div
                    className={cn(
                      'h-2.5 w-2.5 shrink-0 rounded-full border-[1.5px]',
                      indicator === 'line' && 'w-4 rounded-full h-1',
                      indicator === 'dashed' && 'w-4 rounded-full border-dashed bg-transparent',
                    )}
                    style={
                      {
                        borderColor: indicatorColor,
                        backgroundColor:
                          indicator === 'line' || indicator === 'dashed'
                            ? 'transparent'
                            : indicatorColor,
                      } as React.CSSProperties
                    }
                  />
                )
              )}
              <div className="flex flex-1 items-center justify-between gap-4">
                <span className="text-muted-foreground whitespace-nowrap">
                  {displayLabel}
                </span>
                <span className="text-foreground font-mono font-semibold tabular-nums">
                  {displayValue ?? '—'}
                </span>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

const ChartLegend = RechartsPrimitive.Legend

type LegendMarkerShape = 'square' | 'circle' | 'pill' | 'line'

type ChartLegendContentProps = React.ComponentProps<'div'> & {
  payload?: ReadonlyArray<{
    value?: string | number
    dataKey?: string
    color?: string
    payload?: Record<string, unknown>
  }>
  verticalAlign?: React.ComponentProps<typeof RechartsPrimitive.Legend>['verticalAlign']
  hideIcon?: boolean
  nameKey?: string
  markerShape?: LegendMarkerShape
  justify?: 'center' | 'start' | 'end'
}

function ChartLegendContent({
  className,
  payload,
  verticalAlign = 'bottom',
  hideIcon = false,
  nameKey,
  markerShape = 'square',
  justify = 'center',
}: ChartLegendContentProps) {
  const { config } = useChart()
  const items = Array.isArray(payload) ? Array.from(payload) : []

  if (items.length === 0) {
    return null
  }

  return (
    <div
      className={cn(
        'flex items-center gap-4 text-xs sm:text-sm',
        verticalAlign === 'top' ? 'pb-3' : 'pt-3',
        justify === 'start' && 'justify-start',
        justify === 'end' && 'justify-end',
        justify === 'center' && 'justify-center',
        className,
      )}
    >
      {items.map((item, index) => {
        const key = `${nameKey || item.dataKey || 'value'}`
        const itemConfig = getPayloadConfigFromPayload(config, item, key)
        const swatchColor = item.color || itemConfig?.color || 'currentColor'

        return (
          <div
            key={item.dataKey ?? `${item.value ?? index}`}
            className={
              '[&>svg]:text-muted-foreground flex items-center gap-1.5 [&>svg]:h-3 [&>svg]:w-3'
            }
          >
            {itemConfig?.icon && !hideIcon ? (
              <itemConfig.icon />
            ) : (
              <div
                className={cn(
                  'h-2 shrink-0 bg-current',
                  markerShape === 'square' && 'w-2 rounded-[2px]',
                  markerShape === 'circle' && 'w-2 rounded-full',
                  markerShape === 'pill' && 'w-4 rounded-full',
                  markerShape === 'line' && 'w-4 rounded-full h-0.5',
                )}
                style={{
                  backgroundColor: swatchColor,
                  color: swatchColor,
                }}
              />
            )}
            {itemConfig?.label}
          </div>
        )
      })}
    </div>
  )
}

// Helper to extract item config from a payload.
function getPayloadConfigFromPayload(
  config: ChartConfig,
  payload: unknown,
  key: string,
) {
  if (typeof payload !== 'object' || payload === null) {
    return undefined
  }

  const payloadPayload =
    'payload' in payload &&
    typeof payload.payload === 'object' &&
    payload.payload !== null
      ? payload.payload
      : undefined

  let configLabelKey: string = key

  if (
    key in payload &&
    typeof payload[key as keyof typeof payload] === 'string'
  ) {
    configLabelKey = payload[key as keyof typeof payload] as string
  } else if (
    payloadPayload &&
    key in payloadPayload &&
    typeof payloadPayload[key as keyof typeof payloadPayload] === 'string'
  ) {
    configLabelKey = payloadPayload[
      key as keyof typeof payloadPayload
    ] as string
  }

  return configLabelKey in config
    ? config[configLabelKey]
    : config[key as keyof typeof config]
}

export {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
  ChartStyle,
}
