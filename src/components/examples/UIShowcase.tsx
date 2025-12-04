/**
 * UI Showcase Component
 * Demonstrates all the new UI enhancements in action
 * This is an example/reference component - use it as a guide!
 */

import { BentoGrid, BentoStatsCard, BentoChartCard } from '@/components/ui/bento-grid';
import { EnhancedCard, CardHeader, StatsRow } from '@/components/ui/enhanced-card';
import { InteractiveButton, IconButton, FAB } from '@/components/ui/interactive-button';
import { StatBadge, CompactStatBadge, StatsGrid } from '@/components/ui/stat-badge';
import { DashboardHeader, CompactDashboardHeader } from '@/components/ui/dashboard-header';
import { 
  Activity, 
  TrendingUp, 
  Users, 
  DollarSign, 
  BarChart3,
  Plus,
  RefreshCw,
  Download,
  Settings,
  Zap
} from 'lucide-react';

export function UIShowcase() {
  return (
    <div className="space-y-8 p-4 md:p-6 lg:p-8">
      {/* Dashboard Header Example */}
      <section>
        <h2 className="text-2xl font-bold mb-4 text-foreground">Dashboard Headers</h2>
        
        {/* Full Header with Gradient */}
        <DashboardHeader
          title="Analytics Overview"
          subtitle="Real-time insights and metrics for your dashboard"
          icon={<BarChart3 className="h-8 w-8 text-white" />}
          badge={
            <span className="px-3 py-1 rounded-full bg-green-100 dark:bg-green-500/20 text-green-700 dark:text-green-300 text-xs font-medium">
              Live
            </span>
          }
          actions={
            <>
              <InteractiveButton variant="outline" size="sm" icon={<RefreshCw className="h-4 w-4" />}>
                Refresh
              </InteractiveButton>
              <InteractiveButton variant="gradient" size="sm" icon={<Download className="h-4 w-4" />}>
                Export
              </InteractiveButton>
            </>
          }
          stats={
            <StatsGrid
              columns={4}
              stats={[
                { label: "Active Users", value: "12.5K", icon: <Users className="h-4 w-4 text-green-500" />, variant: "success", trend: { value: 12.3 } },
                { label: "Revenue", value: "$45.2K", icon: <DollarSign className="h-4 w-4 text-blue-500" />, variant: "info", trend: { value: 8.1 } },
                { label: "Conversion", value: "3.2%", icon: <TrendingUp className="h-4 w-4 text-amber-500" />, variant: "warning" },
                { label: "Total Events", value: "125K", icon: <Activity className="h-4 w-4 text-purple-500" />, variant: "purple" },
              ]}
            />
          }
          gradient
        />

        <div className="mt-4">
          <CompactDashboardHeader
            title="Compact Mobile Header"
            icon={<Zap className="h-5 w-5 text-white" />}
            actions={
              <>
                <IconButton icon={<RefreshCw className="h-4 w-4" />} variant="ghost" size="sm" />
                <IconButton icon={<Settings className="h-4 w-4" />} variant="ghost" size="sm" />
              </>
            }
          />
        </div>
      </section>

      {/* Bento Grid Example */}
      <section>
        <h2 className="text-2xl font-bold mb-4 text-foreground">Bento Grid Layout</h2>
        
        <BentoGrid>
          <BentoStatsCard
            title="Total Revenue"
            value="$125,430"
            icon={<DollarSign className="h-6 w-6 text-white" />}
            trend={{ value: 12.5, label: "vs last month", positive: true }}
            iconColor="from-green-500 to-emerald-600"
            delay={0}
          />
          
          <BentoStatsCard
            title="Active Users"
            value="8,234"
            icon={<Users className="h-6 w-6 text-white" />}
            trend={{ value: 8.2, label: "vs last month", positive: true }}
            iconColor="from-blue-500 to-cyan-600"
            delay={0.05}
          />
          
          <BentoStatsCard
            title="Conversion Rate"
            value="3.65%"
            icon={<TrendingUp className="h-6 w-6 text-white" />}
            trend={{ value: -2.1, label: "vs last month", positive: false }}
            iconColor="from-amber-500 to-orange-600"
            delay={0.1}
          />
          
          <BentoStatsCard
            title="Total Events"
            value="45.2K"
            icon={<Activity className="h-6 w-6 text-white" />}
            trend={{ value: 15.8, label: "vs last month", positive: true }}
            iconColor="from-purple-500 to-violet-600"
            delay={0.15}
          />

          <BentoChartCard
            title="Revenue Trends"
            subtitle="Last 30 days performance"
            icon={<BarChart3 className="h-6 w-6 text-white" />}
            span="md"
            variant="glass"
            delay={0.2}
          >
            <div className="h-64 flex items-center justify-center text-muted-foreground">
              Chart goes here
            </div>
          </BentoChartCard>

          <BentoChartCard
            title="User Activity"
            subtitle="Real-time metrics"
            icon={<Activity className="h-6 w-6 text-white" />}
            span="md"
            variant="gradient"
            delay={0.25}
          >
            <div className="h-64 flex items-center justify-center text-muted-foreground">
              Activity chart here
            </div>
          </BentoChartCard>
        </BentoGrid>
      </section>

      {/* Enhanced Cards Example */}
      <section>
        <h2 className="text-2xl font-bold mb-4 text-foreground">Enhanced Cards</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <EnhancedCard variant="default" hover>
            <CardHeader
              icon={<BarChart3 className="h-6 w-6 text-white" />}
              title="Default Card"
              subtitle="Standard styling"
            />
            <p className="text-sm text-muted-foreground">
              This is a default card with hover effects and animations.
            </p>
          </EnhancedCard>

          <EnhancedCard variant="glass" hover>
            <CardHeader
              icon={<Activity className="h-6 w-6 text-white" />}
              title="Glass Card"
              subtitle="Glassmorphism effect"
              iconColor="from-blue-500 to-cyan-600"
            />
            <p className="text-sm text-muted-foreground">
              Beautiful glass effect with backdrop blur.
            </p>
          </EnhancedCard>

          <EnhancedCard variant="gradient" hover glow>
            <CardHeader
              icon={<Zap className="h-6 w-6 text-white" />}
              title="Gradient Card"
              subtitle="With glow effect"
              iconColor="from-purple-500 to-violet-600"
            />
            <p className="text-sm text-muted-foreground">
              Gradient background with animated glow.
            </p>
          </EnhancedCard>
        </div>
      </section>

      {/* Buttons Example */}
      <section>
        <h2 className="text-2xl font-bold mb-4 text-foreground">Interactive Buttons</h2>
        
        <div className="flex flex-wrap gap-4">
          <InteractiveButton variant="primary" icon={<Plus className="h-4 w-4" />}>
            Primary Button
          </InteractiveButton>

          <InteractiveButton variant="gradient" icon={<Zap className="h-4 w-4" />} glow>
            Gradient Button
          </InteractiveButton>

          <InteractiveButton variant="outline" icon={<Download className="h-4 w-4" />}>
            Outline Button
          </InteractiveButton>

          <InteractiveButton variant="ghost" icon={<Settings className="h-4 w-4" />}>
            Ghost Button
          </InteractiveButton>

          <IconButton icon={<RefreshCw className="h-5 w-5" />} variant="primary" />
          <IconButton icon={<Settings className="h-5 w-5" />} variant="default" />
        </div>
      </section>

      {/* Stats Badges Example */}
      <section>
        <h2 className="text-2xl font-bold mb-4 text-foreground">Stat Badges</h2>
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatBadge
            label="Total Sales"
            value="$45.2K"
            icon={<DollarSign className="h-5 w-5 text-green-500" />}
            trend={{ value: 12.5, label: "this week" }}
            variant="success"
          />

          <StatBadge
            label="Active Users"
            value="8,234"
            icon={<Users className="h-5 w-5 text-blue-500" />}
            trend={{ value: 8.2, label: "this week" }}
            variant="info"
          />

          <StatBadge
            label="Conversion"
            value="3.65%"
            icon={<TrendingUp className="h-5 w-5 text-amber-500" />}
            trend={{ value: -2.1, label: "this week" }}
            variant="warning"
          />

          <StatBadge
            label="Total Events"
            value="45.2K"
            icon={<Activity className="h-5 w-5 text-purple-500" />}
            variant="purple"
          />
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          <CompactStatBadge value="125" label="Active" color="green" icon={<Activity className="h-3 w-3" />} />
          <CompactStatBadge value="$45K" label="Revenue" color="blue" icon={<DollarSign className="h-3 w-3" />} />
          <CompactStatBadge value="3.2%" label="Rate" color="amber" icon={<TrendingUp className="h-3 w-3" />} />
          <CompactStatBadge value="12K" label="Events" color="purple" icon={<BarChart3 className="h-3 w-3" />} />
        </div>
      </section>

      {/* Floating Action Button */}
      <FAB
        icon={<Plus className="h-6 w-6" />}
        label="Create New"
        position="bottom-right"
        onClick={() => alert('FAB clicked!')}
      />
    </div>
  );
}
