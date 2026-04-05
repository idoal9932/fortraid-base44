import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { BrowserRouter as Router, Route, Routes, Navigate } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import ErrorBoundary from '@/components/ErrorBoundary';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';
import AppLayout from '@/components/layout/AppLayout';
import NewEvent from '@/pages/paramedic/NewEvent';
import MyPatients from '@/pages/paramedic/MyPatients';
import InventoryPage from '@/pages/paramedic/Inventory';
import Settings from '@/pages/shared/Settings';
import PatientTimeline from '@/pages/shared/PatientTimeline';
import DoctorDashboard from '@/pages/doctor/Dashboard';
import DoctorPatients from '@/pages/doctor/Patients';
import EventDetail from '@/pages/doctor/EventDetail';
import SelectRole from '@/pages/shared/SelectRole';
import Onboarding from '@/pages/shared/Onboarding';
import InventoryAdmin from '@/pages/admin/InventoryAdmin';
import Users from '@/pages/admin/Users';
import AdminSettings from '@/pages/admin/AdminSettings';
import Patients from '@/pages/admin/Patients';

const AuthenticatedApp = () => {
  const { isLoadingAuth, isLoadingPublicSettings, authError, navigateToLogin, user, viewAsRole, needsOnboarding } = useAuth();

  if (isLoadingPublicSettings || isLoadingAuth) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-background" dir="rtl">
        <div className="text-center space-y-3">
          <div className="w-10 h-10 border-4 border-primary/20 border-t-primary rounded-full animate-spin mx-auto"></div>
          <p className="text-muted-foreground text-sm font-heebo">טוען...</p>
        </div>
      </div>
    );
  }

  if (!isLoadingAuth && !isLoadingPublicSettings && !user) {
    navigateToLogin();
    return null;
  }

  if (authError) {
    if (authError.type === 'user_not_registered') {
      return <UserNotRegisteredError />;
    } else if (authError.type === 'auth_required') {
      navigateToLogin();
      return null;
    }
  }

  // Show onboarding if user needs it
  if (needsOnboarding) {
    return <Onboarding />;
  }

  const realRole = user?.custom_role;
  
  // משתמש לא מוכר — בחירת תפקיד
  if (!realRole || !["paramedic", "doctor", "admin"].includes(realRole)) {
    return <SelectRole />;
  }

  // קבע את התפקיד הפעיל
  const role = viewAsRole || realRole;

  const adminRoutes = (
    <>
      <Route path="/admin/settings" element={<AdminSettings />} />
      <Route path="/admin/users" element={<Users />} />
      <Route path="/admin/patients" element={<Patients />} />
    </>
  );

  return (
    <Routes>
      <Route element={<AppLayout role={role} />}>
        {role === "doctor" ? (
          <>
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard" element={<DoctorDashboard />} />
            <Route path="/doctor/patients" element={<DoctorPatients />} />
            <Route path="/event/:id" element={<EventDetail />} />
            <Route path="/timeline/:patientId" element={<PatientTimeline />} />
            <Route path="/settings" element={<Settings />} />
            {adminRoutes}
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </>
        ) : (
          <>
            <Route path="/" element={<Navigate to="/new-event" replace />} />
            <Route path="/new-event" element={<NewEvent />} />
            <Route path="/my-patients" element={<MyPatients />} />
            <Route path="/inventory" element={<InventoryPage />} />
            <Route path="/timeline/:patientId" element={<PatientTimeline />} />
            <Route path="/event/:id" element={<EventDetail />} />
            <Route path="/settings" element={<Settings />} />
            {adminRoutes}
            <Route path="*" element={<Navigate to="/new-event" replace />} />
          </>
        )}
      </Route>
    </Routes>
  );
};

function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <QueryClientProvider client={queryClientInstance}>
          <Router>
            <AuthenticatedApp />
          </Router>
        </QueryClientProvider>
      </AuthProvider>
    </ErrorBoundary>
  )
}

export default App