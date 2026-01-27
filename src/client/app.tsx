import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './lib/auth';
import LoginPage from './pages/login';
import AppLayout from './layouts/app-layout';
import { PageRenderer } from './layouts/page-renderer';

// Import JSON configs
import dashboardConfig from '@config/pages/dashboard.json';
import employeeListConfig from '@config/pages/employees/list.json';
import employeeCreateConfig from '@config/pages/employees/create.json';
import employeeDetailConfig from '@config/pages/employees/detail.json';
import employeeEditConfig from '@config/pages/employees/edit.json';
import departmentListConfig from '@config/pages/departments/list.json';
import departmentCreateConfig from '@config/pages/departments/create.json';
import departmentEditConfig from '@config/pages/departments/edit.json';
import positionListConfig from '@config/pages/positions/list.json';
import positionCreateConfig from '@config/pages/positions/create.json';
import positionEditConfig from '@config/pages/positions/edit.json';
import payrollListConfig from '@config/pages/payroll/list.json';
import payrollStructureConfig from '@config/pages/payroll/structure.json';
import talentJobsConfig from '@config/pages/talent/jobs.json';
import talentReviewsConfig from '@config/pages/talent/reviews.json';
import workforceAttendanceConfig from '@config/pages/workforce/attendance.json';
import workforceLeaveConfig from '@config/pages/workforce/leave.json';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();
  if (isLoading) return <div className="flex items-center justify-center min-h-screen"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div></div>;
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/" element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
        <Route index element={<PageRenderer config={dashboardConfig} />} />
        <Route path="employees" element={<PageRenderer config={employeeListConfig} />} />
        <Route path="employees/new" element={<PageRenderer config={employeeCreateConfig} />} />
        <Route path="employees/:id" element={<PageRenderer config={employeeDetailConfig} />} />
        <Route path="employees/:id/edit" element={<PageRenderer config={employeeEditConfig} />} />
        <Route path="departments" element={<PageRenderer config={departmentListConfig} />} />
        <Route path="departments/new" element={<PageRenderer config={departmentCreateConfig} />} />
        <Route path="departments/:id/edit" element={<PageRenderer config={departmentEditConfig} />} />
        <Route path="positions" element={<PageRenderer config={positionListConfig} />} />
        <Route path="positions/new" element={<PageRenderer config={positionCreateConfig} />} />
        <Route path="positions/:id/edit" element={<PageRenderer config={positionEditConfig} />} />
        <Route path="payroll" element={<PageRenderer config={payrollListConfig} />} />
        <Route path="payroll/structures" element={<PageRenderer config={payrollStructureConfig} />} />
        <Route path="talent/jobs" element={<PageRenderer config={talentJobsConfig} />} />
        <Route path="talent/reviews" element={<PageRenderer config={talentReviewsConfig} />} />
        <Route path="workforce/attendance" element={<PageRenderer config={workforceAttendanceConfig} />} />
        <Route path="workforce/leave" element={<PageRenderer config={workforceLeaveConfig} />} />
      </Route>
    </Routes>
  );
}
