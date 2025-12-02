import { AnalyticsAuthProvider } from '@/contexts/AnalyticsAuthContext';
import { OrganizationProvider } from '@/contexts/OrganizationContext';
import { AnalyticsLayout } from '@/components/dashboard/analytics/AnalyticsLayout';

export default function AnalyticsPage() {
  return (
    <AnalyticsAuthProvider>
      <OrganizationProvider>
        <AnalyticsLayout />
      </OrganizationProvider>
    </AnalyticsAuthProvider>
  );
}
