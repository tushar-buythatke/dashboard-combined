import { useAccentTheme } from '@/contexts/AccentThemeContext';
import { cn } from '@/lib/utils';
import type { PanelConfig, AnalyticsDataResponse } from '@/types/analytics';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ResponsiveContainer, XAxis, YAxis, CartesianGrid, Tooltip, Legend, PieChart, Pie, Cell, BarChart, Bar } from 'recharts';

interface CombinedPanelProps {
    panel: PanelConfig;
    data: AnalyticsDataResponse | null;
}

const COLORS = ['#0D9488', '#DC2626', '#F59E0B', '#0F766E', '#EA580C', '#0891B2'];

export function CombinedPanel({ panel, data }: CombinedPanelProps) {
    const { t: themeClasses } = useAccentTheme();

    if (!data) return <div className="h-64 flex items-center justify-center">Loading data...</div>;

    const graphData = data.graphData || [];
    const pieChartData = data.pieChartData || {};

    // Check if we have any data
    const hasData = graphData.length > 0;

    return (
        <Card className={cn("h-full flex flex-col border-slate-200/60 dark:border-indigo-500/20 overflow-hidden relative group backdrop-blur-xl shadow-[0_8px_30px_rgba(0,0,0,0.12)] dark:shadow-[0_15px_50px_rgba(0,0,0,0.5)]", themeClasses.cardBg)}>
            {/* Thematic Accent Bar */}
            <div className={cn("absolute top-0 left-0 right-0 h-1.5 transition-all duration-500 z-30", themeClasses.headerGradient)} />

            <CardHeader className="pb-2 relative z-10">
                <CardTitle className="text-lg font-bold tracking-tight text-slate-800 dark:text-slate-100">{panel.panelName}</CardTitle>
            </CardHeader>
            <CardContent className="flex-1 flex flex-col gap-4 relative z-10">
                {/* Line/Bar Graph */}
                {panel.visualizations.lineGraph.enabled && (
                    <div className="h-64 w-full bg-slate-50/30 dark:bg-slate-950/20 rounded-2xl p-2 border border-slate-100 dark:border-indigo-500/10">
                        {hasData ? (
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={graphData}>
                                    <CartesianGrid strokeDasharray="3 3" opacity={0.15} vertical={false} />
                                    <XAxis
                                        dataKey="timestamp"
                                        fontSize={10}
                                        tick={{ fontSize: 10, fill: 'currentColor', opacity: 0.6 }}
                                        axisLine={false}
                                        tickLine={false}
                                    />
                                    <YAxis
                                        fontSize={10}
                                        axisLine={false}
                                        tickLine={false}
                                        tick={{ fill: 'currentColor', opacity: 0.6 }}
                                    />
                                    <Tooltip
                                        contentStyle={{
                                            backgroundColor: 'rgba(255, 255, 255, 0.95)',
                                            borderRadius: '12px',
                                            border: 'none',
                                            boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
                                            padding: '8px 12px'
                                        }}
                                    />
                                    <Legend iconType="circle" wrapperStyle={{ fontSize: '10px', paddingTop: '10px' }} />
                                    <Bar dataKey="count" name="Count" fill="#4ECDC4" radius={[4, 4, 0, 0]} />
                                    <Bar dataKey="successCount" name="Success" fill="#22c55e" radius={[4, 4, 0, 0]} />
                                    <Bar dataKey="failCount" name="Fail" fill="#ef4444" radius={[4, 4, 0, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="h-full flex items-center justify-center text-muted-foreground text-sm font-medium">
                                No data available for the selected filters
                            </div>
                        )}
                    </div>
                )}

                {/* Pie Charts */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 flex-1 min-h-[200px]">
                    {panel.visualizations.pieCharts.map((pieConfig, idx) => {
                        if (!pieConfig.enabled) return null;

                        const pieData = pieChartData?.[pieConfig.type] || [];
                        const title = pieConfig.type.charAt(0).toUpperCase() + pieConfig.type.slice(1);
                        const hasPieData = pieData.length > 0;

                        return (
                            <div key={idx} className="flex flex-col items-center justify-center h-full bg-slate-50/20 dark:bg-slate-950/10 rounded-2xl p-4 border border-slate-100/50 dark:border-indigo-500/5">
                                <h4 className="text-[10px] font-extrabold mb-3 text-slate-500 dark:text-slate-400 uppercase tracking-widest">{title} Distribution</h4>
                                <div className="w-full h-full min-h-[150px]">
                                    {hasPieData ? (
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
                                                    nameKey="name"
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
                                                    formatter={(value: number) => [value.toLocaleString(), 'Count']}
                                                    contentStyle={{
                                                        backgroundColor: 'rgba(255, 255, 255, 0.95)',
                                                        borderRadius: '10px',
                                                        border: 'none',
                                                        boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'
                                                    }}
                                                />
                                                <Legend
                                                    iconSize={6}
                                                    layout="vertical"
                                                    verticalAlign="middle"
                                                    align="right"
                                                    wrapperStyle={{ fontSize: '9px', fontWeight: 'bold' }}
                                                />
                                            </PieChart>
                                        </ResponsiveContainer>
                                    ) : (
                                        <div className="h-full flex items-center justify-center text-muted-foreground text-[10px] font-bold">
                                            No data
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </CardContent>
        </Card>
    );
}
