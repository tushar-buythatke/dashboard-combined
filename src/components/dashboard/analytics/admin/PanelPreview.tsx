import { useState, useEffect } from 'react';
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { apiService } from '@/services/apiService';
import type { EventConfig } from '@/types/analytics';

interface PanelPreviewProps {
    events: EventConfig[];
    filters: {
        events: number[];
        platforms: number[];
        pos: number[];
        sources: number[];
    };
    graphType: 'line' | 'bar';
}

export function PanelPreview({ events, filters, graphType }: PanelPreviewProps) {
    const [data, setData] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const loadData = async () => {
            setLoading(true);
            try {
                // Use last 7 days for preview
                const endDate = new Date();
                const startDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

                // Get valid event IDs (numeric)
                const eventIdsToFetch = filters.events.length > 0
                    ? filters.events
                    : events.map(e => parseInt(e.eventId)).filter(id => !isNaN(id));

                if (eventIdsToFetch.length === 0) {
                    setData([]);
                    setLoading(false);
                    return;
                }

                const analyticsData = await apiService.getGraphData(
                    eventIdsToFetch,
                    filters.platforms.length > 0 ? filters.platforms : [0],
                    filters.pos.length > 0 ? filters.pos : [2],
                    filters.sources.length > 0 ? filters.sources : [1],
                    startDate,
                    endDate
                );

                const records = analyticsData.data || [];

                // Group by timestamp
                const groupedByTime: Record<string, any> = {};
                records.forEach((record: any) => {
                    const date = new Date(record.timestamp);
                    const timeKey = date.toLocaleString('en-US', {
                        month: 'short',
                        day: 'numeric'
                    });

                    if (!groupedByTime[timeKey]) {
                        groupedByTime[timeKey] = { 
                            timestamp: timeKey, 
                            count: 0, 
                            successCount: 0, 
                            failCount: 0 
                        };
                    }

                    groupedByTime[timeKey].count += record.count || 0;
                    groupedByTime[timeKey].successCount += record.successCount || 0;
                    groupedByTime[timeKey].failCount += record.failCount || 0;
                });

                const chartData = Object.values(groupedByTime);
                setData(chartData);
            } catch (error) {
                console.error('Failed to load preview data:', error);
                setData([]);
            }
            setLoading(false);
        };

        loadData();
    }, [events, filters]);

    if (loading) {
        return (
            <div className="border rounded-lg p-8 text-center text-muted-foreground bg-muted/20">
                <p className="text-sm">Loading preview...</p>
            </div>
        );
    }

    if (data.length === 0) {
        return (
            <div className="border rounded-lg p-8 text-center text-muted-foreground bg-muted/20">
                <p className="text-sm">No data available for selected filters</p>
                <p className="text-xs mt-2 opacity-60">
                    Events: {filters.events.join(', ')} | Platform: {filters.platforms.join(', ')} | 
                    POS: {filters.pos.join(', ')} | Source: {filters.sources.join(', ')}
                </p>
            </div>
        );
    }

    return (
        <div className="border rounded-lg p-4 bg-gradient-to-br from-background to-muted/30">
            <ResponsiveContainer width="100%" height={280}>
                {graphType === 'bar' ? (
                    <BarChart data={data}>
                        <defs>
                            <linearGradient id="countGrad" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stopColor="#6366f1" stopOpacity={0.8}/>
                                <stop offset="100%" stopColor="#6366f1" stopOpacity={0.3}/>
                            </linearGradient>
                            <linearGradient id="successGrad" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stopColor="#22c55e" stopOpacity={0.8}/>
                                <stop offset="100%" stopColor="#22c55e" stopOpacity={0.3}/>
                            </linearGradient>
                            <linearGradient id="failGrad" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stopColor="#ef4444" stopOpacity={0.8}/>
                                <stop offset="100%" stopColor="#ef4444" stopOpacity={0.3}/>
                            </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" opacity={0.4} />
                        <XAxis dataKey="timestamp" tick={{ fontSize: 11, fill: '#6b7280' }} />
                        <YAxis tick={{ fontSize: 11, fill: '#6b7280' }} />
                        <Tooltip 
                            contentStyle={{ 
                                backgroundColor: 'rgba(255,255,255,0.95)', 
                                borderRadius: '8px', 
                                border: 'none',
                                boxShadow: '0 4px 20px rgba(0,0,0,0.1)'
                            }} 
                        />
                        <Legend />
                        <Bar dataKey="count" name="Total" fill="url(#countGrad)" radius={[4, 4, 0, 0]} />
                        <Bar dataKey="successCount" name="Success" fill="url(#successGrad)" radius={[4, 4, 0, 0]} />
                        <Bar dataKey="failCount" name="Fail" fill="url(#failGrad)" radius={[4, 4, 0, 0]} />
                    </BarChart>
                ) : (
                    <AreaChart data={data}>
                        <defs>
                            <linearGradient id="areaCount" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3}/>
                                <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                            </linearGradient>
                            <linearGradient id="areaSuccess" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3}/>
                                <stop offset="95%" stopColor="#22c55e" stopOpacity={0}/>
                            </linearGradient>
                            <linearGradient id="areaFail" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3}/>
                                <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                            </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" opacity={0.4} />
                        <XAxis dataKey="timestamp" tick={{ fontSize: 11, fill: '#6b7280' }} />
                        <YAxis tick={{ fontSize: 11, fill: '#6b7280' }} />
                        <Tooltip 
                            contentStyle={{ 
                                backgroundColor: 'rgba(255,255,255,0.95)', 
                                borderRadius: '8px', 
                                border: 'none',
                                boxShadow: '0 4px 20px rgba(0,0,0,0.1)'
                            }} 
                        />
                        <Legend />
                        <Area type="monotone" dataKey="count" name="Total" stroke="#6366f1" strokeWidth={2} fillOpacity={1} fill="url(#areaCount)" />
                        <Area type="monotone" dataKey="successCount" name="Success" stroke="#22c55e" strokeWidth={2} fillOpacity={1} fill="url(#areaSuccess)" />
                        <Area type="monotone" dataKey="failCount" name="Fail" stroke="#ef4444" strokeWidth={2} fillOpacity={1} fill="url(#areaFail)" />
                    </AreaChart>
                )}
            </ResponsiveContainer>
        </div>
    );
}
