import type { PanelConfig, AnalyticsDataResponse } from '@/types/analytics';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, PieChart, Pie, Cell, BarChart, Bar } from 'recharts';

interface CombinedPanelProps {
    panel: PanelConfig;
    data: AnalyticsDataResponse | null;
}

const COLORS = ['#4ECDC4', '#FF6B6B', '#FFE66D', '#1A535C', '#FF9F1C', '#2EC4B6'];

export function CombinedPanel({ panel, data }: CombinedPanelProps) {
    if (!data) return <div className="h-64 flex items-center justify-center">Loading data...</div>;

    const graphData = data.graphData || [];
    const pieChartData = data.pieChartData || {};

    // Check if we have any data
    const hasData = graphData.length > 0;

    return (
        <Card className="h-full flex flex-col">
            <CardHeader className="pb-2">
                <CardTitle className="text-lg">{panel.panelName}</CardTitle>
            </CardHeader>
            <CardContent className="flex-1 flex flex-col gap-4">
                {/* Line/Bar Graph */}
                {panel.visualizations.lineGraph.enabled && (
                    <div className="h-64 w-full">
                        {hasData ? (
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={graphData}>
                                    <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                                    <XAxis
                                        dataKey="timestamp"
                                        fontSize={12}
                                        tick={{ fontSize: 10 }}
                                    />
                                    <YAxis fontSize={12} />
                                    <Tooltip
                                        contentStyle={{ 
                                            backgroundColor: 'rgba(255, 255, 255, 0.95)', 
                                            borderRadius: '8px', 
                                            border: 'none', 
                                            boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' 
                                        }}
                                    />
                                    <Legend />
                                    <Bar dataKey="count" name="Count" fill="#4ECDC4" />
                                    <Bar dataKey="successCount" name="Success" fill="#22c55e" />
                                    <Bar dataKey="failCount" name="Fail" fill="#ef4444" />
                                </BarChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="h-full flex items-center justify-center text-muted-foreground">
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
                            <div key={idx} className="flex flex-col items-center justify-center h-full">
                                <h4 className="text-sm font-medium mb-2 text-muted-foreground">{title} Distribution</h4>
                                <div className="w-full h-full min-h-[150px]">
                                    {hasPieData ? (
                                        <ResponsiveContainer width="100%" height="100%">
                                            <PieChart>
                                                <Pie
                                                    data={pieData}
                                                    cx="50%"
                                                    cy="50%"
                                                    innerRadius={40}
                                                    outerRadius={60}
                                                    paddingAngle={5}
                                                    dataKey="value"
                                                    nameKey="name"
                                                >
                                                    {pieData.map((_entry: any, index: number) => (
                                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                                    ))}
                                                </Pie>
                                                <Tooltip 
                                                    formatter={(value: number) => [value.toLocaleString(), 'Count']}
                                                />
                                                <Legend 
                                                    iconSize={8} 
                                                    layout="vertical" 
                                                    verticalAlign="middle" 
                                                    align="right" 
                                                    wrapperStyle={{ fontSize: '10px' }} 
                                                />
                                            </PieChart>
                                        </ResponsiveContainer>
                                    ) : (
                                        <div className="h-full flex items-center justify-center text-muted-foreground text-sm">
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
