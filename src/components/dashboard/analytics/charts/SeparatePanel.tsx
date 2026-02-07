import { useAccentTheme } from '@/contexts/AccentThemeContext';
import { cn } from '@/lib/utils';
import type { PanelConfig, AnalyticsDataResponse } from '@/types/analytics';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, PieChart, Pie, Cell } from 'recharts';

interface SeparatePanelProps {
    panel: PanelConfig;
    data: AnalyticsDataResponse | null;
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d'];

export function SeparatePanel({ panel, data }: SeparatePanelProps) {
    const { t: themeClasses } = useAccentTheme();

    if (!data) return <div className="h-64 flex items-center justify-center">Loading data...</div>;

    const { graphData, pieChartData } = data;
    // For separate panel, we usually expect one event, but the config allows array. 
    // We'll take the first one or map all if multiple are present (though "Separate" implies one).
    // The spec says: "Option A: Keep Events Separate - Each event gets its own panel".
    // So this component likely renders ONE event.
    const event = panel.events[0];

    return (
        <Card className={cn("h-full flex flex-col border-slate-200/60 dark:border-indigo-500/20 overflow-hidden relative group backdrop-blur-xl shadow-[0_8px_30px_rgba(0,0,0,0.12)] dark:shadow-[0_15px_50px_rgba(0,0,0,0.5)]", themeClasses.cardBg)}>
            {/* Thematic Accent Bar */}
            <div className={cn("absolute top-0 left-0 right-0 h-1.5 transition-all duration-500 z-30", themeClasses.headerGradient)} />

            <CardHeader className="pb-2 relative z-10">
                <CardTitle className="text-lg flex items-center gap-3">
                    <div
                        className="w-4 h-4 rounded-full shadow-[0_0_10px_rgba(0,0,0,0.1)] ring-2 ring-white/20"
                        style={{ backgroundColor: event.color }}
                    />
                    <span className="font-bold tracking-tight text-slate-800 dark:text-slate-100">{event.eventName}</span>
                </CardTitle>
            </CardHeader>
            <CardContent className="flex-1 flex flex-col gap-4 relative z-10">
                {/* Line Graph */}
                {panel.visualizations.lineGraph.enabled && (
                    <div className="h-64 w-full bg-slate-50/30 dark:bg-slate-950/20 rounded-2xl p-2 border border-slate-100 dark:border-indigo-500/10">
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={graphData}>
                                <CartesianGrid strokeDasharray="3 3" opacity={0.15} vertical={false} />
                                <XAxis
                                    dataKey="timestamp"
                                    tickFormatter={(val) => new Date(val).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    fontSize={10}
                                    axisLine={false}
                                    tickLine={false}
                                    tick={{ fill: 'currentColor', opacity: 0.6 }}
                                />
                                <YAxis
                                    fontSize={10}
                                    label={{ value: panel.visualizations.lineGraph.yAxisLabel, angle: -90, position: 'insideLeft', fontSize: 10, offset: 10 }}
                                    axisLine={false}
                                    tickLine={false}
                                    tick={{ fill: 'currentColor', opacity: 0.6 }}
                                />
                                <Tooltip
                                    labelFormatter={(val) => new Date(val).toLocaleString()}
                                    contentStyle={{
                                        backgroundColor: 'rgba(255, 255, 255, 0.95)',
                                        borderRadius: '12px',
                                        border: 'none',
                                        boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
                                        padding: '8px 12px'
                                    }}
                                />
                                <Line
                                    type="monotone"
                                    dataKey={event.eventId}
                                    stroke={event.color}
                                    strokeWidth={3}
                                    dot={false}
                                    activeDot={{ r: 6, strokeWidth: 0, fill: event.color }}
                                />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                )}

                {/* Pie Charts */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 flex-1 min-h-[200px]">
                    {panel.visualizations.pieCharts.map((pieConfig, idx) => {
                        if (!pieConfig.enabled) return null;

                        const pieData = pieChartData[pieConfig.type] || [];
                        const title = pieConfig.type.charAt(0).toUpperCase() + pieConfig.type.slice(1);

                        return (
                            <div key={idx} className="flex flex-col items-center justify-center h-full bg-slate-50/20 dark:bg-slate-950/10 rounded-2xl p-4 border border-slate-100/50 dark:border-indigo-500/5">
                                <h4 className="text-xs font-extrabold mb-3 text-slate-500 dark:text-slate-400 uppercase tracking-wider">{title} Distribution</h4>
                                <div className="w-full h-full min-h-[150px]">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <PieChart>
                                            <Pie
                                                data={pieData}
                                                cx="50%"
                                                cy="50%"
                                                innerRadius={35}
                                                outerRadius={55}
                                                paddingAngle={4}
                                                dataKey="value"
                                                stroke="none"
                                            >
                                                {pieData.map((_entry: any, index: number) => (
                                                    <Cell
                                                        key={`cell-${index}`}
                                                        fill={COLORS[index % COLORS.length]}
                                                        className="hover:opacity-80 transition-opacity cursor-pointer shadow-lg"
                                                    />
                                                ))}
                                            </Pie>
                                            <Tooltip
                                                contentStyle={{
                                                    backgroundColor: 'rgba(255, 255, 255, 0.95)',
                                                    borderRadius: '10px',
                                                    border: 'none',
                                                    boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'
                                                }}
                                            />
                                        </PieChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </CardContent>
        </Card>
    );
}
