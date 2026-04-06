import React, { Suspense, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './hooks/useAuth';
import LoginPage from './pages/LoginPage';
import DashboardLayout from './components/DashboardLayout';
import AdminDashboard from './pages/AdminDashboard';
import FacultyDashboard from './pages/FacultyDashboard';
import StudentDashboard from './pages/StudentDashboard';
import AttendancePage from './pages/AttendancePage';
import AssignmentsPage from './pages/AssignmentsPage';
import LabsPage from './pages/LabsPage';
import VideoLibraryPage from './pages/VideoLibraryPage';
import SettingsPage from './pages/SettingsPage';
import AssignmentDetailsPage from './pages/AssignmentDetailsPage';
import LabDetailsPage from './pages/LabDetailsPage';
import NotificationsPage from './pages/NotificationsPage';
import UserManagementPage from './pages/UserManagementPage';
import SubjectsPage from './pages/SubjectsPage';

import { Toaster } from 'sonner';

function ProtectedRoute({ children, allowedRoles }: { children: React.ReactNode, allowedRoles?: string[] }) {
  const { user, profile, loading } = useAuth();

  if (loading) return <div className="flex items-center justify-center h-screen">Loading...</div>;
  if (!user) return <Navigate to="/login" />;
  if (profile && profile.active === false) return <div className="flex items-center justify-center h-screen">Your account has been deactivated. Please contact an administrator.</div>;
  if (allowedRoles && profile && !allowedRoles.includes(profile.role)) return <Navigate to="/" />;

  return <>{children}</>;
}

function RoleBasedDashboard() {
  const { profile } = useAuth();
  
  if (profile?.role === 'admin') return <AdminDashboard />;
  if (profile?.role === 'faculty') return <FacultyDashboard />;
  return <StudentDashboard />;
}

function ThemeHandler() {
  const { profile } = useAuth();
  
  useEffect(() => {
    const theme = profile?.theme || 'light';
    const root = window.document.documentElement;
    
    const applyTheme = (t: string) => {
      if (t === 'dark') {
        root.classList.add('dark');
      } else if (t === 'light') {
        root.classList.remove('dark');
      } else if (t === 'system') {
        const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
        if (systemTheme === 'dark') root.classList.add('dark');
        else root.classList.remove('dark');
      }
    };

    applyTheme(theme);

    // Listen for system theme changes if set to system
    if (theme === 'system') {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      const handleChange = () => applyTheme('system');
      mediaQuery.addEventListener('change', handleChange);
      return () => mediaQuery.removeEventListener('change', handleChange);
    }
  }, [profile?.theme]);

  return null;
}

export default function App() {
  return (
    <AuthProvider>
      <ThemeHandler />
      <Toaster position="top-right" richColors />
      <Router>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/" element={
            <ProtectedRoute>
              <DashboardLayout>
                <RoleBasedDashboard />
              </DashboardLayout>
            </ProtectedRoute>
          } />
          <Route path="/attendance" element={
            <ProtectedRoute>
              <DashboardLayout>
                <AttendancePage />
              </DashboardLayout>
            </ProtectedRoute>
          } />
          <Route path="/assignments" element={
            <ProtectedRoute>
              <DashboardLayout>
                <AssignmentsPage />
              </DashboardLayout>
            </ProtectedRoute>
          } />
          <Route path="/assignments/:id" element={
            <ProtectedRoute>
              <DashboardLayout>
                <AssignmentDetailsPage />
              </DashboardLayout>
            </ProtectedRoute>
          } />
          <Route path="/labs" element={
            <ProtectedRoute>
              <DashboardLayout>
                <LabsPage />
              </DashboardLayout>
            </ProtectedRoute>
          } />
          <Route path="/labs/:id" element={
            <ProtectedRoute>
              <DashboardLayout>
                <LabDetailsPage />
              </DashboardLayout>
            </ProtectedRoute>
          } />
          <Route path="/videos" element={
            <ProtectedRoute>
              <DashboardLayout>
                <VideoLibraryPage />
              </DashboardLayout>
            </ProtectedRoute>
          } />
          <Route path="/settings" element={
            <ProtectedRoute>
              <DashboardLayout>
                <SettingsPage />
              </DashboardLayout>
            </ProtectedRoute>
          } />
          <Route path="/notifications" element={
            <ProtectedRoute>
              <DashboardLayout>
                <NotificationsPage />
              </DashboardLayout>
            </ProtectedRoute>
          } />
          <Route path="/subjects" element={
            <ProtectedRoute allowedRoles={['admin', 'faculty']}>
              <DashboardLayout>
                <SubjectsPage />
              </DashboardLayout>
            </ProtectedRoute>
          } />
          <Route path="/users" element={
            <ProtectedRoute allowedRoles={['admin']}>
              <DashboardLayout>
                <UserManagementPage />
              </DashboardLayout>
            </ProtectedRoute>
          } />
        </Routes>
      </Router>
    </AuthProvider>
  );
}
