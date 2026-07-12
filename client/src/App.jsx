import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import AppLayout from '@/components/layout/AppLayout';
import LoginPage from '@/pages/LoginPage';
import DashboardPage from '@/pages/DashboardPage';
import OrganizationPage from '@/pages/OrganizationPage';
import AssetRegistryPage from '@/pages/AssetRegistryPage';
import AllocationPage from '@/pages/AllocationPage';
import BookingPage from '@/pages/BookingPage';
import MaintenancePage from '@/pages/MaintenancePage';
import AuditPage from '@/pages/AuditPage';
import ReportsPage from '@/pages/ReportsPage';
import ActivityLogsPage from '@/pages/ActivityLogsPage';

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
          <p className="text-muted-foreground text-sm">Loading…</p>
        </div>
      </div>
    );
  }
  return user ? children : <Navigate to="/login" replace />;
}

function PublicRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return null;
  return user ? <Navigate to="/dashboard" replace /> : children;
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          {/* Public */}
          <Route
            path="/login"
            element={
              <PublicRoute>
                <LoginPage />
              </PublicRoute>
            }
          />

          {/* Protected — inside AppLayout */}
          <Route
            element={
              <ProtectedRoute>
                <AppLayout />
              </ProtectedRoute>
            }
          >
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/organization" element={<OrganizationPage />} />
            <Route path="/assets" element={<AssetRegistryPage />} />
            <Route path="/allocations" element={<AllocationPage />} />
            <Route path="/bookings" element={<BookingPage />} />
            <Route path="/maintenance" element={<MaintenancePage />} />
            <Route path="/audits" element={<AuditPage />} />
            <Route path="/reports" element={<ReportsPage />} />
            <Route path="/activity-logs" element={<ActivityLogsPage />} />
          </Route>

          {/* Catch-all */}
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
