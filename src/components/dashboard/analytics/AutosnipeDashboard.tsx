import React from 'react';
import { motion } from 'framer-motion';
import { DashboardHeader } from '@/components/ui/dashboard-header';
import { Activity, Zap, Shield, TrendingUp, Users, DollarSign, Wallet } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { EnhancedCard } from '@/components/ui/enhanced-card';
import { format } from 'date-fns';

// Define Autosnipe specific components here

export function AutosnipeDashboard({
    selectedOrganization,
    dateRange,
    setDateRange,
    handleRefresh
}: any) {
    return (
        <div className="min-h-screen bg-black text-green-500 font-mono p-4 md:p-8 space-y-6 selection:bg-green-900 selection:text-white">
            {/* Matrix/Cyberpunk Background Effect */}
            <div className="fixed inset-0 z-0 pointer-events-none opacity-20 bg-[url('https://media.giphy.com/media/oEI9uBYSzLpBK/giphy.gif')] opacity-5 bg-cover"></div>

            <div className="relative z-10">
                <header className="flex flex-col md:flex-row items-start md:items-center justify-between mb-8 border-b border-green-900/50 pb-6">
                    <div>
                        <h1 className="text-3xl md:text-4xl font-bold tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-green-400 via-emerald-500 to-green-600 animate-pulse">
                            AUTOSNIPE_COMMAND_CENTER
                        </h1>
                        <p className="text-green-700 mt-2 font-mono text-sm">
                            SYSTEM_STATUS: ONLINE | {format(new Date(), 'yyyy-MM-dd HH:mm:ss')}
                        </p>
                    </div>
                    <div className="flex gap-4 mt-4 md:mt-0">
                        <div className="px-4 py-2 border border-green-500/30 rounded bg-green-900/10 text-green-400 text-xs font-mono">
                            ORG: AUTOSNIPE (ID: 3)
                        </div>
                    </div>
                </header>

                {/* Stats Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                    {[
                        { label: 'ACTIVE_USERS', value: '1,245', icon: Users, trend: '+12%' },
                        { label: 'TOTAL_VOLUME', value: '$4.2M', icon: DollarSign, trend: '+5%' },
                        { label: 'SNIPES_EXECUTED', value: '85.4K', icon: Zap, trend: '+28%' },
                        { label: 'RUG_PULLS_AVOIDED', value: '128', icon: Shield, trend: '100%' },
                    ].map((stat, i) => (
                        <motion.div
                            key={i}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: i * 0.1 }}
                            whileHover={{ scale: 1.02 }}
                            className="bg-black/50 border border-green-500/30 p-4 rounded-lg shadow-[0_0_15px_rgba(0,255,0,0.1)] hover:shadow-[0_0_20px_rgba(0,255,0,0.2)] hover:border-green-400 transition-all group"
                        >
                            <div className="flex justify-between items-start mb-2">
                                <span className="text-green-700 text-xs tracking-widest">{stat.label}</span>
                                <stat.icon className="w-5 h-5 text-green-500 group-hover:text-green-300 transition-colors" />
                            </div>
                            <div className="text-2xl font-bold text-green-400 font-mono tracking-tight">{stat.value}</div>
                            <div className="text-green-800 text-xs mt-1 flex items-center">
                                <TrendingUp className="w-3 h-3 mr-1" /> {stat.trend} INCREASE
                            </div>
                        </motion.div>
                    ))}
                </div>

                {/* Main Content Area */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Live Feed - Left Column */}
                    <div className="lg:col-span-2 space-y-6">
                        <EnhancedCard className="bg-black/40 border-green-500/20 backdrop-blur-sm">
                            <CardHeader>
                                <CardTitle className="text-green-400 flex items-center gap-2 font-mono">
                                    <Activity className="w-5 h-5" /> LIVE_TRANSACTION_FEED
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="h-[400px] flex items-center justify-center border-t border-green-900/30">
                                <div className="text-green-800 animate-pulse">AWAITING_DATA_STREAM...</div>
                            </CardContent>
                        </EnhancedCard>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <EnhancedCard className="bg-black/40 border-green-500/20">
                                <CardHeader>
                                    <CardTitle className="text-green-400 font-mono text-sm">ERROR_LOGS</CardTitle>
                                </CardHeader>
                                <CardContent className="h-[200px] text-xs font-mono text-green-600 p-4 overflow-hidden">
                                    <div className="space-y-1">
                                        <div className="opacity-50">12:45:01: Success: Connected to Node A</div>
                                        <div className="opacity-60">12:45:05: Executing snipe #8821...</div>
                                        <div className="text-green-400">12:45:06: CONFIRMED hash:0x39...21</div>
                                        <div className="opacity-50">12:45:12: Analyzing meme pool...</div>
                                        <div className="text-red-500/70">12:45:15: WARN: Slippage high on #221</div>
                                    </div>
                                </CardContent>
                            </EnhancedCard>

                            <EnhancedCard className="bg-black/40 border-green-500/20">
                                <CardHeader>
                                    <CardTitle className="text-green-400 font-mono text-sm">WALLET_HEALTH</CardTitle>
                                </CardHeader>
                                <CardContent className="h-[200px] flex items-center justify-center">
                                    <Wallet className="w-12 h-12 text-green-800 opacity-20" />
                                </CardContent>
                            </EnhancedCard>
                        </div>
                    </div>

                    {/* Right Column - Controls/Settings */}
                    <div className="space-y-6">
                        <EnhancedCard className="bg-green-900/5 border-green-500/20 h-full">
                            <CardHeader>
                                <CardTitle className="text-green-400 font-mono text-sm">ACTIVE_BOTS</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-3">
                                    {[1, 2, 3, 4, 5].map((bot) => (
                                        <div key={bot} className="flex items-center justify-between p-2 border border-green-900/50 rounded hover:bg-green-900/20 cursor-pointer transition-colors">
                                            <div className="flex items-center gap-3">
                                                <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                                                <span className="text-green-100/70 text-sm">Sniper_Bot_0{bot}</span>
                                            </div>
                                            <span className="text-green-600 text-xs">IDLE</span>
                                        </div>
                                    ))}
                                </div>
                            </CardContent>
                        </EnhancedCard>
                    </div>
                </div>
            </div>
        </div>
    );
}
