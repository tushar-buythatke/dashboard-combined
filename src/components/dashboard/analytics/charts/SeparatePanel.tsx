import type { PanelConfig, AnalyticsDataResponse } from '@/types/analytics';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, PieChart, Pie, Cell } from 'recharts';

interface SeparatePanelProps {
    panel: PanelConfig;
    data: AnalyticsDataResponse | null;
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d'];

export function SeparatePanel({ panel, data }: SeparatePanelProps) {
    if (!data) return <div className="h-64 flex items-center justify-center">Loading data...</div>;

    const { graphData, pieChartData } = data;
    // For separate panel, we usually expect one event, but the config allows array. 
    // We'll take the first one or map all if multiple are present (though "Separate" implies one).
    // The spec says: "Option A: Keep Events Separate - Each event gets its own panel".
    // So this component likely renders ONE event.
    const event = panel.events[0];

    return (
        <Card className="h-full flex flex-col">
            <CardHeader className="pb-2">
                <CardTitle className="text-lg flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: event.color }} />
                    {event.eventName}
                </CardTitle>
            </CardHeader>
            <CardContent className="flex-1 flex flex-col gap-4">
                {/* Line Graph */}
                {panel.visualizations.lineGraph.enabled && (
                    <div className="h-64 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={graphData}>
                                <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                                <XAxis
                                    dataKey="timestamp"
                                    tickFormatter={(val) => new Date(val).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    fontSize={12}
                                />
                                <YAxis fontSize={12} label={{ value: panel.visualizations.lineGraph.yAxisLabel, angle: -90, position: 'insideLeft' }} />
                                <Tooltip
                                    labelFormatter={(val) => new Date(val).toLocaleString()}
                                    contentStyle={{ backgroundColor: 'rgba(255, 255, 255, 0.9)', borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                />
                                <Line
                                    type="monotone"
                                    dataKey={event.eventId}
                                    stroke={event.color}
                                    strokeWidth={2}
                                    dot={false}
                                    activeDot={{ r: 6 }}
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
                            <div key={idx} className="flex flex-col items-center justify-center h-full">
                                <h4 className="text-sm font-medium mb-2 text-muted-foreground">{title}</h4>
                                <div className="w-full h-full min-h-[150px]">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <PieChart>
                                            <Pie
                                                data={pieData}
                                                cx="50%"
                                                cy="50%"
                                                innerRadius={30}
                                                outerRadius={50}
                                                paddingAngle={5}
                                                dataKey="value"
                                            >
                                                {pieData.map((_entry: any, index: number) => (
                                                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                                ))}
                                            </Pie>
                                            <Tooltip />
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
