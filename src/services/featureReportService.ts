/**
 * Feature Report Service
 * Comprehensive data collection and AI-powered analysis for feature reports
 * This is the brain of the company's analytics reporting system
 */

import { callGeminiAPI } from './aiService';
import { apiService, PLATFORMS, SOURCES, getFeatureName } from './apiService';
import { firebaseConfigService } from './firebaseConfigService';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

// ==================== TYPE DEFINITIONS ====================

export interface EventMetrics {
  eventId: string;
  eventName: string;
  totalCount: number;
  successCount: number;
  failCount: number;
  successRate: number;
  avgDelay?: number;
  medianDelay?: number;
  trend: 'up' | 'down' | 'stable';
  trendPercentage: number;
  isErrorEvent: boolean;
  isAvgEvent: boolean;
  isApiEvent: boolean;
  totalUsers?: number;
  newUsers?: number;
  uniqueUsers?: number;
}

export interface PlatformMetrics {
  platformId: number;
  platformName: string;
  count: number;
  percentage: number;
  successCount: number;
  failCount: number;
  successRate: number;
}

export interface SourceMetrics {
  sourceId: number;
  sourceName: string;
  count: number;
  percentage: number;
}

export interface POSMetrics {
  posId: number;
  posName: string;
  count: number;
  percentage: number;
  successCount: number;
  failCount: number;
  successRate: number;
  failureRate: number;
  image?: string; // Logo URL from siteDetails API
  colour?: string; // Brand colour from live sites API
}

export interface DailyTrend {
  date: string;
  totalCount: number;
  successCount: number;
  failCount: number;
  successRate: number;
  avgDelay?: number;
  totalUsers?: number;
  newUsers?: number;
  uniqueUsers?: number;
}

export interface HourlyTrend {
  hour: string;
  count: number;
  successCount: number;
  failCount: number;
}

export interface CriticalAlertInfo {
  eventId: number;
  eventName: string;
  alertCount: number;
  severity: 'critical' | 'high' | 'medium' | 'low';
  lastOccurrence?: string;
  details?: string;
}

export interface FunnelStage {
  stageName: string;
  eventId: number;
  count: number;
  conversionRate: number;
  dropoffRate: number;
}

export interface ProfileSummary {
  profileId: string;
  profileName: string;
  panelCount: number;
  totalEvents: number;
  hasApiPanels: boolean;
  panelNames: string[];
}

export interface ComprehensiveFeatureReport {
  reportId: string;
  generatedAt: string;
  featureId: string;
  featureName: string;
  organizationName?: string;
  dateRange: {
    from: Date;
    to: Date;
    daysCount: number;
  };
  executiveSummary: {
    totalEvents: number;
    totalSuccessEvents: number;
    totalFailEvents: number;
    overallSuccessRate: number;
    totalUsers: number;
    newUsers: number;
    uniqueUsers: number;
    criticalAlertsCount: number;
    profilesCount: number;
    panelsCount: number;
    healthScore: number;
    healthStatus: 'excellent' | 'good' | 'warning' | 'critical';
    avgDailyEvents: number;
    peakHour: string;
    worstHour: string;
    topFailingEvent: string;
    topFailingEventRate: number;
  };
  eventMetrics: EventMetrics[];
  platformBreakdown: PlatformMetrics[];
  sourceBreakdown: SourceMetrics[];
  posBreakdown: POSMetrics[];
  dailyTrends: DailyTrend[];
  hourlyTrends: HourlyTrend[];
  criticalAlerts: CriticalAlertInfo[];
  topErrorEvents: EventMetrics[];
  funnelAnalysis?: FunnelStage[];
  profiles: ProfileSummary[];
  aiAnalysis?: AIAnalysisResult;
}

export interface AIAnalysisResult {
  executiveSummary: string;
  keySuccesses: string[];
  criticalIssues: string[];
  performanceInsights: string[];
  recommendations: string[];
  riskAssessment: {
    level: 'low' | 'medium' | 'high' | 'critical';
    factors: string[];
  };
  trendsAnalysis: string;
  userBehaviorInsights: string;
  platformPerformance: string;
  predictiveOutlook: string;
}

// ==================== DATA COLLECTION ====================

export async function collectComprehensiveFeatureData(
  featureId: string,
  organizationId: number = 0,
  dateRange?: { from: Date; to: Date }
): Promise<ComprehensiveFeatureReport> {
  const endDate = dateRange?.to || new Date();
  const startDate = dateRange?.from || new Date(endDate.getTime() - 7 * 24 * 60 * 60 * 1000);
  const daysCount = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));

  const featureName = getFeatureName(parseInt(featureId)) || `Feature ${featureId}`;
  const reportId = `report_${featureId}_${Date.now()}`;

  console.log(`📊 Collecting data for ${featureName}...`);

  const events = await apiService.getEventsList(featureId, organizationId);
  const regularEvents = events.filter(e => !e.isApiEvent);
  const apiEvents = events.filter(e => e.isApiEvent);

  const profilesResult = await firebaseConfigService.getProfiles(featureId, 'default');
  const profiles: ProfileSummary[] = profilesResult.success
    ? profilesResult.items.map(p => ({
      profileId: p.profileId,
      profileName: p.profileName,
      panelCount: p.panels?.length || 0,
      totalEvents: p.panels?.reduce((sum, panel) => sum + (panel.events?.length || 0), 0) || 0,
      hasApiPanels: p.panels?.some(panel => panel.filterConfig?.isApiEvent) || false,
      panelNames: p.panels?.map(panel => panel.panelName || 'Unnamed Panel') || []
    }))
    : [];

  const regularEventIds = regularEvents.map(e => parseInt(e.eventId));
  const apiEventIds = apiEvents.map(e => parseInt(e.eventId.replace('api_', '')));

  let graphData: any[] = [];
  let apiGraphData: any[] = [];

  if (regularEventIds.length > 0) {
    try {
      const regularResult = await apiService.getGraphData(regularEventIds, [], [], [], [], startDate, endDate, false);
      graphData = regularResult.data || [];
    } catch (error) {
      console.error('Failed to fetch regular graph data:', error);
    }
  }

  if (apiEventIds.length > 0) {
    try {
      const apiResult = await apiService.getGraphData(apiEventIds, [], [], [], [], startDate, endDate, true);
      apiGraphData = apiResult.data || [];
    } catch (error) {
      console.error('Failed to fetch API graph data:', error);
    }
  }

  let pieChartData: any = null;
  if (regularEventIds.length > 0) {
    try {
      pieChartData = await apiService.getPieChartData(regularEventIds, [], [], [], [], startDate, endDate, false);
    } catch (error) {
      console.error('Failed to fetch pie chart data:', error);
    }
  }

  let alertCounts: Record<string, number> = {};
  if (regularEventIds.length > 0) {
    try {
      alertCounts = await apiService.getAlertList(regularEventIds, startDate, endDate, true, 0);
    } catch (error) {
      console.error('Failed to fetch alerts:', error);
    }
  }

  const allEventMetrics = processEventMetrics(events, graphData, apiGraphData, alertCounts);

  // Filter out API events globally so they don't skew any summaries or charts
  const eventMetrics = allEventMetrics.filter(e => !e.isApiEvent);

  const platformBreakdown = processPlatformBreakdown(pieChartData);
  const sourceBreakdown = processSourceBreakdown(pieChartData);

  // Fetch site details with images
  let siteDetails: Array<{ id: number; name: string; image: string }> = [];
  try {
    siteDetails = await apiService.getSiteDetails(parseInt(featureId));
  } catch (error) {
    console.error('Failed to fetch site details:', error);
  }

  const posBreakdown = processPOSBreakdown(pieChartData, siteDetails);
  const dailyTrends = processDailyTrends(graphData, apiGraphData);
  const hourlyTrends = processHourlyTrends(graphData, apiGraphData);
  const criticalAlerts = processCriticalAlerts(events, alertCounts);
  const topErrorEvents = eventMetrics
    .filter(e => e.isErrorEvent || e.failCount > 0)
    .sort((a, b) => b.failCount - a.failCount)
    .slice(0, 10);

  const executiveSummary = calculateExecutiveSummary(eventMetrics, dailyTrends, hourlyTrends, criticalAlerts, profiles);

  return {
    reportId,
    generatedAt: new Date().toISOString(),
    featureId,
    featureName,
    dateRange: { from: startDate, to: endDate, daysCount },
    executiveSummary,
    eventMetrics,
    platformBreakdown,
    sourceBreakdown,
    posBreakdown,
    dailyTrends,
    hourlyTrends,
    criticalAlerts,
    topErrorEvents,
    profiles
  };
}

// ==================== DATA PROCESSING ====================

function processEventMetrics(events: any[], graphData: any[], apiGraphData: any[], alertCounts: Record<string, number>): EventMetrics[] {
  const metrics: EventMetrics[] = [];

  events.forEach(event => {
    const eventId = event.eventId.replace('api_', '');
    const isApi = event.isApiEvent;
    const data = isApi ? apiGraphData : graphData;
    const eventData = data.filter(d => String(d.eventId) === eventId);

    let totalCount = 0, successCount = 0, failCount = 0, totalDelay = 0, delayCount = 0;
    let totalUsers = 0, newUsers = 0, uniqueUsers = 0;

    eventData.forEach(d => {
      totalCount += d.count || 0;
      successCount += d.successCount || 0;
      failCount += d.failCount || 0;
      if (d.avgDelay) { totalDelay += d.avgDelay * (d.count || 1); delayCount += d.count || 1; }
      totalUsers += d.totalUsers || 0;
      newUsers += d.newUsers || 0;
      uniqueUsers += d.uniqueUsers || 0;
    });

    // If we have totalCount but no failCount recorded, assume 100% success for volume-only events
    const successRate = totalCount > 0
      ? (failCount === 0 ? 100 : (successCount / totalCount) * 100)
      : 0;
    const avgDelay = delayCount > 0 ? totalDelay / delayCount : undefined;

    const midPoint = Math.floor(eventData.length / 2);
    const firstHalfCount = eventData.slice(0, midPoint).reduce((sum, d) => sum + (d.count || 0), 0);
    const secondHalfCount = eventData.slice(midPoint).reduce((sum, d) => sum + (d.count || 0), 0);

    let trend: 'up' | 'down' | 'stable' = 'stable';
    let trendPercentage = 0;
    if (firstHalfCount > 0) {
      trendPercentage = ((secondHalfCount - firstHalfCount) / firstHalfCount) * 100;
      if (trendPercentage > 5) trend = 'up';
      else if (trendPercentage < -5) trend = 'down';
    }

    metrics.push({
      eventId: event.eventId,
      eventName: event.eventName,
      totalCount, successCount, failCount, successRate, avgDelay,
      trend, trendPercentage,
      isErrorEvent: event.isErrorEvent === 1,
      isAvgEvent: event.isAvgEvent === 1,
      isApiEvent: isApi,
      totalUsers, newUsers, uniqueUsers
    });
  });

  return metrics.sort((a, b) => b.totalCount - a.totalCount);
}

function processPlatformBreakdown(pieChartData: any): PlatformMetrics[] {
  // pieChartData is already transformed by apiService.getPieChartData() to { platform: [], pos: [], source: [] }
  if (!pieChartData?.platform || !Array.isArray(pieChartData.platform)) return [];

  const platformData = pieChartData.platform;
  const total = platformData.reduce((sum: number, item: any) => sum + (item.value || 0), 0);

  return platformData.map((item: any) => {
    const platformId = item.id ?? 0;
    const count = item.value || 0;
    const successCount = item.successCount || count;
    const failCount = item.failCount || 0;
    return {
      platformId,
      platformName: item.name || PLATFORMS.find(p => p.id === platformId)?.name || `Platform ${platformId}`,
      count,
      percentage: total > 0 ? (count / total) * 100 : 0,
      successCount,
      failCount,
      successRate: count > 0 ? (successCount / count) * 100 : 100
    };
  }).filter((p: PlatformMetrics) => p.count > 0).sort((a: PlatformMetrics, b: PlatformMetrics) => b.count - a.count);
}

function processSourceBreakdown(pieChartData: any): SourceMetrics[] {
  // pieChartData is already transformed by apiService.getPieChartData() to { platform: [], pos: [], source: [] }
  if (!pieChartData?.source || !Array.isArray(pieChartData.source)) return [];

  const sourceData = pieChartData.source;
  const total = sourceData.reduce((sum: number, item: any) => sum + (item.value || 0), 0);

  return sourceData.map((item: any) => {
    const sourceId = item.id ?? 0;
    const count = item.value || 0;
    return {
      sourceId,
      sourceName: item.name || SOURCES.find(s => s.id === sourceId)?.name || `Source ${sourceId}`,
      count,
      percentage: total > 0 ? (count / total) * 100 : 0
    };
  }).filter((s: SourceMetrics) => s.count > 0).sort((a: SourceMetrics, b: SourceMetrics) => b.count - a.count);
}

function processPOSBreakdown(pieChartData: any, siteDetails: Array<{ id: number; name: string; image: string; colour?: string }>): POSMetrics[] {
  // pieChartData is already transformed by apiService.getPieChartData() to { platform: [], pos: [], source: [] }
  // The pos array contains objects with { id, name, value, metricType, successCount, failCount }
  if (!pieChartData?.pos || !Array.isArray(pieChartData.pos)) return [];

  const posData = pieChartData.pos;
  const total = posData.reduce((sum: number, item: any) => sum + (item.value || 0), 0);

  // Create maps for posId -> image and colour for quick lookup
  const siteImageMap = new Map<number, string>();
  const siteColourMap = new Map<number, string>();
  siteDetails.forEach(site => {
    if (site.image) {
      siteImageMap.set(site.id, site.image);
    }
    if (site.colour) {
      siteColourMap.set(site.id, site.colour);
    }
  });

  return posData.map((item: any) => {
    const posId = item.id ?? 0;
    const count = item.value || 0;
    const successCount = item.successCount || count; // Default to count if not provided
    const failCount = item.failCount || 0;
    const posName = item.name || `POS ${posId}`;
    return {
      posId,
      posName,
      count,
      percentage: total > 0 ? (count / total) * 100 : 0,
      successCount,
      failCount,
      successRate: count > 0 ? (successCount / count) * 100 : 100,
      failureRate: count > 0 ? (failCount / count) * 100 : 0,
      image: siteImageMap.get(posId) || '', // Include image from siteDetails
      colour: siteColourMap.get(posId) || '' // Include colour from live sites
    };
  }).filter((p: POSMetrics) => p.count > 0).sort((a: POSMetrics, b: POSMetrics) => b.count - a.count).slice(0, 20);
}

function processDailyTrends(graphData: any[], apiGraphData: any[]): DailyTrend[] {
  const allData = [...graphData, ...apiGraphData];
  const dailyMap = new Map<string, DailyTrend>();

  allData.forEach(item => {
    const date = item.timestamp?.split(' ')[0] || item.timestamp;
    if (!date) return;
    const existing = dailyMap.get(date) || { date, totalCount: 0, successCount: 0, failCount: 0, successRate: 0, totalUsers: 0, newUsers: 0, uniqueUsers: 0 };
    existing.totalCount += item.count || 0;
    existing.successCount += item.successCount || 0;
    existing.failCount += item.failCount || 0;
    existing.totalUsers += item.totalUsers || 0;
    existing.newUsers += item.newUsers || 0;
    existing.uniqueUsers += item.uniqueUsers || 0;
    dailyMap.set(date, existing);
  });

  return Array.from(dailyMap.values())
    .map(d => ({ ...d, successRate: d.totalCount > 0 ? (d.successCount / d.totalCount) * 100 : 0 }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

function processHourlyTrends(graphData: any[], apiGraphData: any[]): HourlyTrend[] {
  const allData = [...graphData, ...apiGraphData];
  const hourlyMap = new Map<string, HourlyTrend>();
  for (let i = 0; i < 24; i++) {
    const hour = i.toString().padStart(2, '0') + ':00';
    hourlyMap.set(hour, { hour, count: 0, successCount: 0, failCount: 0 });
  }
  allData.forEach(item => {
    const timestamp = item.timestamp;
    if (!timestamp) return;
    const hourMatch = timestamp.match(/(\d{2}):\d{2}:\d{2}/);
    if (hourMatch) {
      const hour = hourMatch[1] + ':00';
      const existing = hourlyMap.get(hour)!;
      existing.count += item.count || 0;
      existing.successCount += item.successCount || 0;
      existing.failCount += item.failCount || 0;
    }
  });
  return Array.from(hourlyMap.values());
}

function processCriticalAlerts(events: any[], alertCounts: Record<string, number>): CriticalAlertInfo[] {
  const alerts: CriticalAlertInfo[] = [];
  Object.entries(alertCounts).forEach(([eventId, count]) => {
    if (count > 0) {
      const event = events.find(e => e.eventId === eventId || e.eventId === `api_${eventId}`);
      let severity: 'critical' | 'high' | 'medium' | 'low' = 'low';
      if (count >= 100) severity = 'critical';
      else if (count >= 50) severity = 'high';
      else if (count >= 10) severity = 'medium';
      alerts.push({ eventId: parseInt(eventId), eventName: event?.eventName || `Event ${eventId}`, alertCount: count, severity });
    }
  });
  return alerts.sort((a, b) => b.alertCount - a.alertCount);
}

function calculateExecutiveSummary(
  eventMetrics: EventMetrics[],
  dailyTrends: DailyTrend[],
  hourlyTrends: HourlyTrend[],
  criticalAlerts: CriticalAlertInfo[],
  profiles: ProfileSummary[]
): ComprehensiveFeatureReport['executiveSummary'] {
  const totalEvents = eventMetrics.reduce((sum, e) => sum + e.totalCount, 0);
  const totalSuccessEvents = eventMetrics.reduce((sum, e) => sum + e.successCount, 0);
  const totalFailEvents = eventMetrics.reduce((sum, e) => sum + e.failCount, 0);
  const overallSuccessRate = totalEvents > 0 ? (totalSuccessEvents / totalEvents) * 100 : 0;

  const totalUsers = eventMetrics.reduce((sum, e) => sum + (e.totalUsers || 0), 0);
  const newUsers = eventMetrics.reduce((sum, e) => sum + (e.newUsers || 0), 0);
  const uniqueUsers = eventMetrics.reduce((sum, e) => sum + (e.uniqueUsers || 0), 0);

  const criticalAlertsCount = criticalAlerts.reduce((sum, a) => sum + a.alertCount, 0);
  const profilesCount = profiles.length;
  const panelsCount = profiles.reduce((sum, p) => sum + p.panelCount, 0);

  const avgDailyEvents = dailyTrends.length > 0 ? Math.round(totalEvents / dailyTrends.length) : 0;
  const sortedHours = [...hourlyTrends].sort((a, b) => b.count - a.count);
  const peakHour = sortedHours[0]?.hour || '12:00';
  const sortedByFailure = [...hourlyTrends].sort((a, b) => b.failCount - a.failCount);
  const worstHour = sortedByFailure[0]?.hour || '00:00';

  const failingEvents = eventMetrics.filter(e => e.failCount > 0).sort((a, b) => b.failCount - a.failCount);
  const topFailingEvent = failingEvents[0]?.eventName || 'None';
  const topFailingEventRate = failingEvents[0] ? (failingEvents[0].failCount / failingEvents[0].totalCount) * 100 : 0;

  // Comprehensive health score calculation (more nuanced - rarely 100)
  let healthScore = 100;

  // 1. Success rate impact (max -40 points)
  if (overallSuccessRate < 99.9) healthScore -= (99.9 - overallSuccessRate) * 4; // Even 99% success = -3.6 points
  if (overallSuccessRate < 95) healthScore -= (95 - overallSuccessRate) * 3; // Extra penalty below 95%

  // 2. Critical alerts impact (max -20 points)
  healthScore -= Math.min(20, criticalAlertsCount * 2);

  // 3. Error rate impact (max -15 points)
  const errorRate = totalEvents > 0 ? (totalFailEvents / totalEvents) * 100 : 0;
  if (errorRate > 0.1) healthScore -= Math.min(15, (errorRate - 0.1) * 5);

  // 4. Event stability (max -10 points) - penalize if too many events have failures
  const eventsWithFailures = eventMetrics.filter(e => e.failCount > 0).length;
  const failureEventRatio = eventMetrics.length > 0 ? (eventsWithFailures / eventMetrics.length) * 100 : 0;
  if (failureEventRatio > 10) healthScore -= Math.min(10, (failureEventRatio - 10) * 0.5);

  // 5. Volume stability (max -5 points) - penalize high variance in daily trends
  if (dailyTrends.length > 2) {
    const counts = dailyTrends.map(d => d.totalCount);
    const avgCount = counts.reduce((a, b) => a + b, 0) / counts.length;
    const variance = counts.reduce((sum, c) => sum + Math.pow(c - avgCount, 2), 0) / counts.length;
    const cv = avgCount > 0 ? Math.sqrt(variance) / avgCount : 0; // Coefficient of variation
    if (cv > 0.3) healthScore -= Math.min(5, (cv - 0.3) * 10);
  }

  // 6. Platform diversity bonus (+3 points if multiple platforms healthy)
  const healthyPlatforms = profiles.filter(p => p.panelCount > 0).length;
  if (healthyPlatforms >= 3) healthScore += 2;

  healthScore = Math.max(0, Math.min(100, Math.round(healthScore)));

  let healthStatus: 'excellent' | 'good' | 'warning' | 'critical' = 'excellent';
  if (healthScore < 60) healthStatus = 'critical';
  else if (healthScore < 75) healthStatus = 'warning';
  else if (healthScore < 90) healthStatus = 'good';

  return {
    totalEvents, totalSuccessEvents, totalFailEvents, overallSuccessRate,
    totalUsers, newUsers, uniqueUsers,
    criticalAlertsCount, profilesCount, panelsCount,
    healthScore, healthStatus,
    avgDailyEvents, peakHour, worstHour, topFailingEvent, topFailingEventRate
  };
}

// ==================== AI ANALYSIS ====================

export async function generateComprehensiveAIAnalysis(report: ComprehensiveFeatureReport): Promise<AIAnalysisResult> {
  const failingEvents = report.eventMetrics.filter(e => e.failCount > 0);
  const highFailureEvents = failingEvents.filter(e => (e.failCount / e.totalCount) * 100 > 10);
  const growingEvents = report.eventMetrics.filter(e => e.trend === 'up');
  const decliningEvents = report.eventMetrics.filter(e => e.trend === 'down');
  const posWithHighFailures = report.posBreakdown.filter(p => p.failureRate > 5).sort((a, b) => b.failureRate - a.failureRate);

  const prompt = `
You are the Chief Data Scientist at Buyhatke. Analyze with surgical precision. Every point MUST have specific numbers.

## FEATURE: ${report.featureName}
## PERIOD: ${report.dateRange.daysCount} days

## HARD NUMBERS
- Total: ${report.executiveSummary.totalEvents.toLocaleString()} events
- Success: ${report.executiveSummary.overallSuccessRate.toFixed(3)}%
- Failures: ${report.executiveSummary.totalFailEvents.toLocaleString()} (${((report.executiveSummary.totalFailEvents / report.executiveSummary.totalEvents) * 100).toFixed(3)}%)
- Health: ${report.executiveSummary.healthScore}/100
- Avg Daily: ${report.executiveSummary.avgDailyEvents.toLocaleString()}/day
- Peak: ${report.executiveSummary.peakHour} | Worst: ${report.executiveSummary.worstHour}

## EVENTS (${report.eventMetrics.length} total)
Growing: ${growingEvents.length} | Declining: ${decliningEvents.length} | High-fail (>10%): ${highFailureEvents.length}

## TOP 5 BY VOLUME
${report.eventMetrics.slice(0, 5).map((e, i) => `${i + 1}. ${e.eventName}: ${e.totalCount.toLocaleString()} (${e.successRate.toFixed(2)}% success, ${e.trend} ${e.trendPercentage > 0 ? '+' : ''}${e.trendPercentage.toFixed(1)}%)`).join('\n')}

## TOP FAILURES
${report.topErrorEvents.slice(0, 5).map((e, i) => `${i + 1}. ${e.eventName}: ${e.failCount.toLocaleString()} fails / ${e.totalCount.toLocaleString()} (${(100 - e.successRate).toFixed(2)}% fail rate)`).join('\n') || 'None'}

## PLATFORMS
${report.platformBreakdown.map(p => `- ${p.platformName}: ${p.count.toLocaleString()} (${p.percentage.toFixed(1)}%, ${p.successRate.toFixed(2)}% success)`).join('\n') || 'No data'}

## SITES (Top 10)
${report.posBreakdown.slice(0, 10).map(p => `- ${p.posName}: ${p.count.toLocaleString()} (${p.successRate.toFixed(2)}% success, ${p.failCount.toLocaleString()} fails)`).join('\n') || 'No data'}

## HIGH-FAILURE SITES
${posWithHighFailures.slice(0, 5).map(p => `- ${p.posName}: ${p.failureRate.toFixed(2)}% fail rate (${p.failCount.toLocaleString()} failures)`).join('\n') || 'None'}

Respond ONLY with this JSON:
{
  "executiveSummary": "3 sentences max. Exact numbers only. Format: X events, Y% success, health Z/100. Top concern: [specific issue with number]",
  "keySuccesses": ["4-5 items. Each MUST have event name + exact number. e.g. 'PA_SELF_ZERO_PRICE: 100% success across 671.9K events'"],
  "criticalIssues": ["3-5 items. Each MUST name event + failure count + rate. e.g. 'PA_SENT: 32.3K failures (19.1% fail rate)'"],
  "performanceInsights": ["4-5 analytical points with numbers"],
  "recommendations": ["5-6 specific actions with expected impact"],
  "riskAssessment": {"level": "low|medium|high|critical", "factors": ["3-4 specific factors with numbers"]},
  "trendsAnalysis": "2 sentences with trend direction and magnitude",
  "userBehaviorInsights": "Peak patterns based on hourly data",
  "platformPerformance": "Best vs worst platform with specific rates",
  "predictiveOutlook": "7-day forecast based on trends"
}`;

  try {
    const result = await callGeminiAPI(prompt, { temperature: 0.2, maxOutputTokens: 3000, response_mime_type: "application/json" });
    const text = result.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) throw new Error('No response');
    return JSON.parse(text.trim()) as AIAnalysisResult;
  } catch (error) {
    console.error('AI Analysis failed:', error);
    return generateFallbackAnalysis(report);
  }
}

function generateFallbackAnalysis(report: ComprehensiveFeatureReport): AIAnalysisResult {
  const s = report.executiveSummary;
  const failRate = ((s.totalFailEvents / s.totalEvents) * 100).toFixed(2);
  const topFail = report.topErrorEvents[0];
  const topEvent = report.eventMetrics[0];

  return {
    executiveSummary: `${report.featureName}: ${s.totalEvents.toLocaleString()} events, ${s.overallSuccessRate.toFixed(2)}% success, health ${s.healthScore}/100. ${topFail ? `Top issue: ${topFail.eventName} (${topFail.failCount.toLocaleString()} failures)` : 'No critical issues.'}`,
    keySuccesses: [
      `${s.totalSuccessEvents.toLocaleString()} successful events (${s.overallSuccessRate.toFixed(2)}%)`,
      topEvent ? `${topEvent.eventName}: ${topEvent.totalCount.toLocaleString()} events at ${topEvent.successRate.toFixed(2)}%` : 'Stable processing',
      `Peak at ${s.peakHour} with sustained throughput`,
      report.platformBreakdown[0] ? `${report.platformBreakdown[0].platformName}: ${report.platformBreakdown[0].successRate.toFixed(2)}% success` : 'Platform stability'
    ],
    criticalIssues: topFail ? [
      `${topFail.eventName}: ${topFail.failCount.toLocaleString()} failures (${(100 - topFail.successRate).toFixed(2)}% rate)`,
      `Total: ${s.totalFailEvents.toLocaleString()} failures (${failRate}%)`,
      s.criticalAlertsCount > 0 ? `${s.criticalAlertsCount} active alerts` : 'Alerts nominal'
    ] : ['No critical issues'],
    performanceInsights: [
      `Daily avg: ${s.avgDailyEvents.toLocaleString()} events`,
      `Peak: ${s.peakHour}, Worst: ${s.worstHour}`,
      `${report.eventMetrics.filter(e => e.trend === 'up').length} growing, ${report.eventMetrics.filter(e => e.trend === 'down').length} declining`,
      `${report.posBreakdown.length} sites, ${report.platformBreakdown.length} platforms`
    ],
    recommendations: [
      topFail ? `Fix ${topFail.eventName} - ${((topFail.failCount / s.totalFailEvents) * 100).toFixed(1)}% of failures` : 'Continue monitoring',
      `Monitor ${s.worstHour} hour`,
      `Scale for ${s.peakHour} peak`,
      'Alert on <95% success'
    ],
    riskAssessment: {
      level: s.healthStatus === 'critical' ? 'critical' : s.healthStatus === 'warning' ? 'high' : s.overallSuccessRate < 98 ? 'medium' : 'low',
      factors: [`Failure rate: ${failRate}%`, topFail ? `${topFail.eventName}: ${(100 - topFail.successRate).toFixed(2)}%` : 'No high-fail events', s.criticalAlertsCount > 0 ? `${s.criticalAlertsCount} alerts` : 'Nominal']
    },
    trendsAnalysis: `${report.dateRange.daysCount} days, ${s.totalEvents.toLocaleString()} events avg ${s.avgDailyEvents.toLocaleString()}/day. ${report.eventMetrics.filter(e => e.trend === 'up').length} events growing.`,
    userBehaviorInsights: `Peak at ${s.peakHour}. ${s.totalUsers.toLocaleString()} interactions.`,
    platformPerformance: report.platformBreakdown[0] ? `${report.platformBreakdown[0].platformName} leads: ${report.platformBreakdown[0].percentage.toFixed(1)}% at ${report.platformBreakdown[0].successRate.toFixed(2)}%` : 'No platform data',
    predictiveOutlook: `Expect ${s.healthStatus === 'excellent' || s.healthStatus === 'good' ? 'stable' : 'continued challenges'}. ${topFail ? `Priority: ${topFail.eventName}` : ''}`
  };
}

// ==================== PDF GENERATION ====================

/**
 * Comprehensive oklch color conversion for html2canvas compatibility
 * html2canvas doesn't support oklch(), oklab(), or color-mix() color functions - we need to convert all instances
 */
function convertColorsForPDF(element: HTMLElement): void {
  const allElements = element.querySelectorAll('*');
  const elementsToProcess = [element, ...Array.from(allElements)] as HTMLElement[];

  // Color fallbacks for modern CSS color functions
  const colorFallbacks: Record<string, string> = {
    'background': '#ffffff',
    'backgroundColor': '#ffffff',
    'color': '#1f2937',
    'borderColor': '#e5e7eb',
    'borderTopColor': '#e5e7eb',
    'borderRightColor': '#e5e7eb',
    'borderBottomColor': '#e5e7eb',
    'borderLeftColor': '#e5e7eb',
    'outlineColor': '#e5e7eb',
    'fill': '#6366f1',
    'stroke': '#6366f1',
    'caretColor': '#1f2937',
    'textDecorationColor': '#1f2937',
  };

  // Check for unsupported color functions
  const hasUnsupportedColor = (value: string | null): boolean => {
    if (!value) return false;
    return value.includes('oklch') ||
      value.includes('oklab') ||
      value.includes('color-mix') ||
      value.includes('color(') ||
      value.includes('lch(') ||
      value.includes('lab(');
  };

  elementsToProcess.forEach(el => {
    try {
      const computed = window.getComputedStyle(el);

      // Check all color-related properties
      Object.entries(colorFallbacks).forEach(([prop, fallback]) => {
        const hyphenProp = prop.replace(/([A-Z])/g, '-$1').toLowerCase();
        const value = computed.getPropertyValue(hyphenProp);

        if (hasUnsupportedColor(value)) {
          el.style.setProperty(hyphenProp, fallback, 'important');
        }
      });

      // Also check inline styles and CSS variables
      const inlineStyle = el.getAttribute('style') || '';
      if (hasUnsupportedColor(inlineStyle)) {
        const cleanedStyle = inlineStyle
          .replace(/oklch\([^)]+\)/g, '#6366f1')
          .replace(/oklab\([^)]+\)/g, '#6366f1')
          .replace(/color-mix\([^)]+\)/g, 'currentColor')
          .replace(/color\([^)]+\)/g, '#6366f1')
          .replace(/lch\([^)]+\)/g, '#6366f1')
          .replace(/lab\([^)]+\)/g, '#6366f1');
        el.setAttribute('style', cleanedStyle);
      }

      // Handle SVG elements specifically
      if (el instanceof SVGElement) {
        const fill = el.getAttribute('fill');
        const stroke = el.getAttribute('stroke');
        if (hasUnsupportedColor(fill)) el.setAttribute('fill', '#6366f1');
        if (hasUnsupportedColor(stroke)) el.setAttribute('stroke', '#6366f1');
      }

      // Special check for box-shadow which often contains color-mix in modern themes
      const boxShadow = computed.getPropertyValue('box-shadow');
      if (hasUnsupportedColor(boxShadow)) {
        el.style.setProperty('box-shadow', 'none', 'important');
      }
    } catch (e) {
      // Silently continue if element can't be processed
    }
  });
}

export const generatePDFFromElement = async (
  elementId: string,
  fileName: string,
  autoPrint: boolean = false
): Promise<{ blob: Blob; url: string }> => {
  const element = document.getElementById(elementId);
  if (!element) throw new Error(`Element with id ${elementId} not found`);

  // Force scroll to top to ensure capturing full content if needed
  const originalScrollPos = window.scrollY;
  window.scrollTo(0, 0);

  try {
    const canvas = await html2canvas(element, {
      scale: 2,
      useCORS: true,
      logging: false,
      backgroundColor: '#ffffff',
      onclone: (clonedDoc) => {
        const clonedElement = clonedDoc.getElementById(elementId);
        if (!clonedElement) return;

        // 1. Globally clean ALL style tags in the cloned document
        const styleSheets = clonedDoc.getElementsByTagName('style');
        for (let i = 0; i < styleSheets.length; i++) {
          const style = styleSheets[i];
          if (style.textContent) {
            style.textContent = style.textContent
              .replace(/oklch\([^)]+\)/g, '#6366f1')
              .replace(/oklab\([^)]+\)/g, '#6366f1')
              .replace(/color-mix\([^)]+\)/g, '#6366f1')
              .replace(/lch\([^)]+\)/g, '#6366f1')
              .replace(/lab\([^)]+\)/g, '#6366f1');
          }
        }

        // 2. Aggressively strip problematic attributes from the HTML string before processing
        let html = clonedElement.innerHTML;
        html = html
          .replace(/backdrop-blur-[a-z0-9]+/g, '')
          .replace(/bg-(white|gray|indigo|rose|emerald|amber|blue|violet|fuchsia)-\d+\/\d+/g, 'bg-white')
          .replace(/bg-gradient-to-[a-z-]+/g, 'bg-white')
          .replace(/oklch\([^)]+\)/g, '#6366f1')
          .replace(/oklab\([^)]+\)/g, '#6366f1')
          .replace(/color-mix\([^)]+\)/g, '#6366f1')
          .replace(/lch\([^)]+\)/g, '#6366f1')
          .replace(/lab\([^)]+\)/g, '#6366f1');
        clonedElement.innerHTML = `<div class="hide-animations">${html}</div>`;

        // 3. Force clean styles on all elements
        const allElements = clonedElement.getElementsByTagName('*');
        for (let i = 0; i < allElements.length; i++) {
          const el = allElements[i] as HTMLElement;

          // Remove problematic filters
          el.style.backdropFilter = 'none';
          (el.style as any).webkitBackdropFilter = 'none';
          el.style.filter = 'none';
          el.style.boxShadow = 'none';

          // Safe class name extraction (handles SVGAnimatedString)
          const rawClass = el.className;
          const className = (typeof rawClass === 'string' ? rawClass : (rawClass as any)?.baseVal) || '';

          // Force white backgrounds on anything that looks like a card or container
          if (className.includes('bg-') || className.includes('rounded-')) {
            el.style.backgroundColor = '#ffffff';
            el.style.backgroundImage = 'none';
            el.style.borderColor = 'rgba(0,0,0,0.1)';
          }

          // Ensure text is dark for readability on white
          if (className.includes('text-gray-500') || className.includes('text-gray-400')) {
            el.style.color = '#6b7280';
          } else if (className.includes('text-white')) {
            // Keep white text if it's explicitly styled as white on a colored background (which we just made white)
            // But usually we want high contrast
            const parentBg = el.parentElement?.style.backgroundColor;
            if (parentBg === '#ffffff' || parentBg === 'rgb(255, 255, 255)') {
              el.style.color = '#111827';
            }
          }
        }

        // 4. Clean root formatting
        clonedElement.style.padding = '40px';
        clonedElement.style.background = '#ffffff';
        clonedElement.style.color = '#111827';
        clonedElement.style.borderRadius = '0';
      }
    });

    const imgData = canvas.toDataURL('image/jpeg', 0.9);
    const pdf = new jsPDF({
      orientation: 'p',
      unit: 'mm',
      format: 'a4',
      compress: true
    });

    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

    // Multi-page support
    let heightLeft = pdfHeight;
    const pageHeight = pdf.internal.pageSize.getHeight();
    let position = 0;

    pdf.addImage(imgData, 'JPEG', 0, position, pdfWidth, pdfHeight);
    heightLeft -= pageHeight;

    while (heightLeft >= 20) {
      position = heightLeft - pdfHeight;
      pdf.addPage();
      pdf.addImage(imgData, 'JPEG', 0, position, pdfWidth, pdfHeight);
      heightLeft -= pageHeight;
    }

    const blob = pdf.output('blob');
    const url = URL.createObjectURL(blob);

    if (autoPrint) {
      window.open(url, '_blank');
    }

    return { blob, url };
  } finally {
    window.scrollTo(0, originalScrollPos);
  }
};

export function downloadPDF(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${fileName}.pdf`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

// ==================== UTILITIES ====================

export function formatNumber(num: number): string {
  if (num >= 1_000_000) return (num / 1_000_000).toFixed(1) + 'M';
  if (num >= 1_000) return (num / 1_000).toFixed(1) + 'K';
  return num.toLocaleString();
}

export function formatPercentage(num: number): string {
  return num.toFixed(1) + '%';
}

export function getHealthColor(score: number): string {
  if (score >= 90) return '#10b981';
  if (score >= 75) return '#f59e0b';
  if (score >= 60) return '#f97316';
  return '#ef4444';
}

export function getHealthBgClass(status: string): string {
  switch (status) {
    case 'excellent': return 'bg-emerald-500';
    case 'good': return 'bg-blue-500';
    case 'warning': return 'bg-amber-500';
    case 'critical': return 'bg-red-500';
    default: return 'bg-gray-500';
  }
}

export function getTrendIcon(trend: 'up' | 'down' | 'stable'): string {
  switch (trend) {
    case 'up': return '↑';
    case 'down': return '↓';
    default: return '→';
  }
}

export function getTrendColor(trend: 'up' | 'down' | 'stable'): string {
  switch (trend) {
    case 'up': return '#10b981';
    case 'down': return '#ef4444';
    default: return '#6b7280';
  }
}
