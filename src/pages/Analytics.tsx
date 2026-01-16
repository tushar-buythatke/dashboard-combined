import { AnalyticsAuthProvider } from '@/contexts/AnalyticsAuthContext';
import { OrganizationProvider } from '@/contexts/OrganizationContext';
import { ThemeProvider } from '@/contexts/ThemeContext';
// FIREBASE DISABLED: All data now stored in custom database
// TO RE-ENABLE: Uncomment the import and provider wrapper below
// import { FirebaseConfigProvider } from '@/contexts/FirebaseConfigContext';
import { AnalyticsLayout } from '@/components/dashboard/analytics/AnalyticsLayout';

export default function AnalyticsPage() {
  return (
    <AnalyticsAuthProvider>
      <OrganizationProvider>
        <ThemeProvider>
          {/* FIREBASE DISABLED: Remove this comment block to re-enable Firebase */}
          {/* <FirebaseConfigProvider> */}
            <AnalyticsLayout />
          {/* </FirebaseConfigProvider> */}
        </ThemeProvider>
      </OrganizationProvider>
    </AnalyticsAuthProvider>
  );
}
