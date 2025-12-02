import { AnalyticsAuthProvider } from '@/contexts/AnalyticsAuthContext';
import { AnalyticsLayout } from '@/components/dashboard/analytics/AnalyticsLayout';

export default function AnalyticsPage() {
  return (
    <AnalyticsAuthProvider>
      <AnalyticsLayout />
    </AnalyticsAuthProvider>
  );
}
