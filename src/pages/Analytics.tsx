import { AnalyticsAuthProvider } from '@/contexts/AnalyticsAuthContext';
import { OrganizationProvider } from '@/contexts/OrganizationContext';
import { FirebaseConfigProvider } from '@/contexts/FirebaseConfigContext';
import { AnalyticsLayout } from '@/components/dashboard/analytics/AnalyticsLayout';

export default function AnalyticsPage() {
  return (
    <AnalyticsAuthProvider>
      <OrganizationProvider>
        <FirebaseConfigProvider>
          <AnalyticsLayout />
        </FirebaseConfigProvider>
      </OrganizationProvider>
    </AnalyticsAuthProvider>
  );
}
