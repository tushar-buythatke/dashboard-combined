import { AnalyticsAuthProvider } from '@/contexts/AnalyticsAuthContext';
import { OrganizationProvider } from '@/contexts/OrganizationContext';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { FirebaseConfigProvider } from '@/contexts/FirebaseConfigContext';
import { AnalyticsLayout } from '@/components/dashboard/analytics/AnalyticsLayout';

export default function AnalyticsPage() {
  return (
    <AnalyticsAuthProvider>
      <OrganizationProvider>
        <ThemeProvider>
          <FirebaseConfigProvider>
            <AnalyticsLayout />
          </FirebaseConfigProvider>
        </ThemeProvider>
      </OrganizationProvider>
    </AnalyticsAuthProvider>
  );
}
