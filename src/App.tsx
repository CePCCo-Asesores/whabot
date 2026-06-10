import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { AppLayout } from './components/layout/AppLayout';
import { LoginPage } from './features/auth/LoginPage';
import { useAuth } from './features/auth/AuthProvider';
import { AuditPage } from './features/audit/AuditPage';
import { BotsPage } from './features/bots/BotsPage';
import { ChannelsPage } from './features/channels/ChannelsPage';
import { CompliancePage } from './features/compliance/CompliancePage';
import { ConversationsPage } from './features/conversations/ConversationsPage';
import { DashboardPage } from './features/dashboard/DashboardPage';
import { DLQPage } from './features/dlq/DLQPage';
import { KnowledgePage } from './features/knowledge/KnowledgePage';
import { MetricsPage } from './features/metrics/MetricsPage';
import { OrganizationsPage } from './features/organizations/OrganizationsPage';
import { ProvidersPage } from './features/providers/ProvidersPage';
import { SettingsPage } from './features/settings/SettingsPage';
import { TemplatesPage } from './features/templates/TemplatesPage';

function RequireAuth({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const location = useLocation();
  if (!user) return <Navigate to="/login" replace state={{ from: location }} />;
  return children;
}

export function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route
        element={
          <RequireAuth>
            <AppLayout />
          </RequireAuth>
        }
      >
        <Route index element={<DashboardPage />} />
        <Route path="organizations" element={<OrganizationsPage />} />
        <Route path="bots" element={<BotsPage />} />
        <Route path="channels" element={<ChannelsPage />} />
        <Route path="providers" element={<ProvidersPage />} />
        <Route path="knowledge" element={<KnowledgePage />} />
        <Route path="templates" element={<TemplatesPage />} />
        <Route path="conversations" element={<ConversationsPage />} />
        <Route path="dlq" element={<DLQPage />} />
        <Route path="audit" element={<AuditPage />} />
        <Route path="compliance" element={<CompliancePage />} />
        <Route path="metrics" element={<MetricsPage />} />
        <Route path="settings" element={<SettingsPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
