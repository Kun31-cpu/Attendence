import React, { Suspense } from 'react';
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
import NotificationsPage from './pages/NotificationsPage';

function ProtectedRoute({ children, allowedRoles }: { children: React.ReactNode, allowedRoles?: string[] }) {
  const { user, profile, loading } = useAuth();

  if (loading) return <div className="flex items-center justify-center h-screen">Loading...</div>;
  if (!user) return <Navigate to="/login" />;
  if (allowedRoles && profile && !allowedRoles.includes(profile.role)) return <Navigate to="/" />;

  return <>{children}</>;
}

function RoleBasedDashboard() {
  const { profile } = useAuth();
  
  if (profile?.role === 'admin') return <AdminDashboard />;
  if (profile?.role === 'faculty') return <FacultyDashboard />;
  return <StudentDashboard />;
}

export default function App() {
  return (
    <AuthProvider>
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
        </Routes>
      </Router>
    </AuthProvider>
  );
}
